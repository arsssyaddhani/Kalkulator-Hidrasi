/**
Kalkulator Hidrasi — script.js
Handles: theme, sliders, calculation, PDF, share (Single Page)
*/
'use strict';

/* ═══════════════════════════════════════════
APP STATE
═══════════════════════════════════════════ */
const state = {
    gender:   null,   // 'male' | 'female'
    age:      25,
    weight:   60,
    height:   165,
    activity: null,   // 'sedentary' | 'light' | 'moderate' | 'active'
};

const SLIDER_CONFIG = {
    age:    { min: 5,  max: 80,  step: 1, unit: 'tahun', displayId: 'ageDisplay',    sliderId: 'ageSlider' },
    weight: { min: 10, max: 150, step: 1, unit: 'kg',    displayId: 'weightDisplay', sliderId: 'weightSlider' },
    height: { min: 80, max: 220, step: 1, unit: 'cm',    displayId: 'heightDisplay', sliderId: 'heightSlider' },
};

const ACTIVITY_FACTOR = {
    sedentary: 1.0,
    light:     1.1,
    moderate:  1.3,
    active:    1.5,
};

const ACTIVITY_LABEL = {
    sedentary: 'Tidak Aktif',
    light:     'Ringan',
    moderate:  'Sedang',
    active:    'Aktif',
};

const GENDER_LABEL = {
    male:   'Laki-laki',
    female: 'Perempuan',
};

/* ═══════════════════════════════════════════
THEME MANAGEMENT
═══════════════════════════════════════════ */
const themeSelect = document.getElementById('themeSelect');
const THEME_KEY   = 'hidra-theme';

function applyTheme(choice) {
    if (choice === 'system') {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', choice);
    }
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'system';
    themeSelect.value = saved;
    applyTheme(saved);
}

themeSelect.addEventListener('change', (e) => {
    const choice = e.target.value;
    localStorage.setItem(THEME_KEY, choice);
    applyTheme(choice);
    setTimeout(repaintAllSliders, 30);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem(THEME_KEY) === 'system') {
        applyTheme('system');
    }
});

initTheme();

/* ═══════════════════════════════════════════
SLIDERS LOGIC
═══════════════════════════════════════════ */
function paintSlider(sliderEl, min, max) {
    const val = parseFloat(sliderEl.value);
    const pct = ((val - min) / (max - min)) * 100;
    const style = getComputedStyle(document.documentElement);
    const fillClr  = style.getPropertyValue('--c-range-fill').trim()  || '#0096c7';
    const trackClr = style.getPropertyValue('--c-range-track').trim() || '#caf0f8';
    sliderEl.style.background = `linear-gradient(to right, ${fillClr} ${pct}%, ${trackClr} ${pct}%)`;
}

function repaintAllSliders() {
    Object.entries(SLIDER_CONFIG).forEach(([key, cfg]) => {
        const sliderEl = document.getElementById(cfg.sliderId);
        if (sliderEl) paintSlider(sliderEl, cfg.min, cfg.max);
    });
}

function setSliderValue(key, newVal) {
    const cfg      = SLIDER_CONFIG[key];
    const clamped  = Math.min(cfg.max, Math.max(cfg.min, newVal));
    const sliderEl = document.getElementById(cfg.sliderId);
    const displayEl= document.getElementById(cfg.displayId);
    
    sliderEl.value = clamped;
    displayEl.textContent = clamped;
    state[key] = clamped;
    sliderEl.setAttribute('aria-valuenow', clamped);
    sliderEl.setAttribute('aria-valuetext', `${clamped} ${cfg.unit}`);
    paintSlider(sliderEl, cfg.min, cfg.max);
    
    displayEl.classList.remove('pulse');
    void displayEl.offsetWidth; 
    displayEl.classList.add('pulse');
}

Object.entries(SLIDER_CONFIG).forEach(([key, cfg]) => {
    setSliderValue(key, state[key]);
    const sliderEl = document.getElementById(cfg.sliderId);
    sliderEl.addEventListener('input', () => {
        setSliderValue(key, parseInt(sliderEl.value, 10));
    });
});

document.getElementById('inputForm').addEventListener('click', (e) => {
    const btn = e.target.closest('.adj-btn');
    if (!btn) return;
    const key = btn.dataset.target;
    const dir = parseInt(btn.dataset.dir, 10);
    if (!key || !SLIDER_CONFIG[key]) return;
    setSliderValue(key, state[key] + dir);
});

let repeatTimer = null;
let repeatInterval = null;
function startRepeat(btn) {
    const key = btn.dataset.target;
    const dir = parseInt(btn.dataset.dir, 10);
    if (!key || !SLIDER_CONFIG[key]) return;
    repeatTimer = setTimeout(() => {
        repeatInterval = setInterval(() => {
            setSliderValue(key, state[key] + dir);
        }, 80);
    }, 400);
}
function stopRepeat() {
    clearTimeout(repeatTimer);
    clearInterval(repeatInterval);
}

document.querySelectorAll('.adj-btn').forEach(btn => {
    btn.addEventListener('mousedown',  () => startRepeat(btn));
    btn.addEventListener('touchstart', () => startRepeat(btn), { passive: true });
    btn.addEventListener('mouseup',    stopRepeat);
    btn.addEventListener('touchend',   stopRepeat);
    btn.addEventListener('mouseleave', stopRepeat);
});

/* ═══════════════════════════════════════════
SELECTION CARDS (Gender & Activity)
═══════════════════════════════════════════ */
document.querySelectorAll('.gender-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.gender-card').forEach(c => {
            c.classList.remove('selected');
            c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        state.gender = card.dataset.gender;
    });
});

document.querySelectorAll('.activity-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.activity-card').forEach(c => {
            c.classList.remove('selected');
            c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        state.activity = card.dataset.activity;
    });
});

/* ═══════════════════════════════════════════
CALCULATION & RESULT DISPLAY
═══════════════════════════════════════════ */
function calcWaterMl() {
    let ml = state.weight * 35;
    ml *= ACTIVITY_FACTOR[state.activity] || 1.0;
    if (state.gender === 'male') ml *= 1.05;
    if (state.age > 55) ml *= 0.95;
    return Math.round(ml);
}

function animateCount(el, from, to, decimals, duration) {
    const start = performance.now();
    function tick(now) {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = from + (to - from) * eased;
        el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString('id-ID');
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function buildResult() {
    const totalMl   = calcWaterMl();
    const totalL    = totalMl / 1000;
    const glasses   = Math.round(totalMl / 250);
    const weekly    = (totalL * 7).toFixed(1);
    const monthly   = Math.round(totalL * 30);
    const yearly    = Math.round(totalL * 365);

    document.getElementById('resultSubtitle').textContent = `${GENDER_LABEL[state.gender]}, ${state.age} tahun, ${state.weight} kg · ${ACTIVITY_LABEL[state.activity]}`;
    
    document.getElementById('resultLiter').textContent   = totalL.toFixed(1);
    document.getElementById('resultMl').textContent      = totalMl.toLocaleString('id-ID');
    document.getElementById('resultGlasses').textContent = glasses;
    document.getElementById('resultWeekly').textContent  = weekly  + ' L';
    document.getElementById('resultMonthly').textContent = monthly + ' L';
    document.getElementById('resultYearly').textContent  = yearly  + ' L';

    document.getElementById('tagGender').textContent   = ` ${GENDER_LABEL[state.gender]}`;
    document.getElementById('tagAge').textContent      = ` ${state.age} tahun`;
    document.getElementById('tagWeight').textContent   = ` ${state.weight} kg`;
    document.getElementById('tagHeight').textContent   = ` ${state.height} cm`;
    document.getElementById('tagActivity').textContent = ` ${ACTIVITY_LABEL[state.activity]}`;

    setTimeout(() => {
        animateCount(document.getElementById('resultLiter'),   0, totalL,   1, 1100);
        animateCount(document.getElementById('resultMl'),      0, totalMl,  0, 1100);
        animateCount(document.getElementById('resultGlasses'), 0, glasses,  0,  900);
    }, 120);

    window._hydraResult = { totalMl, totalL, glasses };
}

// Tombol Hitung Utama
document.getElementById('btnHitung').addEventListener('click', () => {
    if (!state.gender) {
        alert('Silakan pilih jenis kelamin terlebih dahulu.');
        return;
    }
    if (!state.activity) {
        alert('Silakan pilih tingkat aktivitas terlebih dahulu.');
        return;
    }

    buildResult();
    
    const resultCard = document.getElementById('resultCard');
    resultCard.classList.remove('hidden');
    
    // Scroll mulus ke hasil
    setTimeout(() => {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
});

/* ═══════════════════════════════════════════
PDF DOWNLOAD (DIPERBAIKI)
═══════════════════════════════════════════ */
document.getElementById('btnDownloadPdf').addEventListener('click', () => {
    const card = document.getElementById('resultCard');
    const prevTheme = document.documentElement.getAttribute('data-theme');
    
    // Paksa tema light agar PDF konsisten
    document.documentElement.setAttribute('data-theme', 'light');

    const opt = {
        margin:     1,
        filename:   'kalkulator-hidrasi.pdf',
        image:      { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale:          2,
            useCORS:        true,
            backgroundColor: '#ffffff',
            logging:        false,
            scrollX:        350,       // Mencegah PDF kosong akibat offset scroll
            scrollY:        0,       // Mencegah PDF kosong akibat offset scroll
            windowWidth:    card.scrollWidth,
            windowHeight:   card.scrollHeight
        },
        jsPDF: { unit: 'in', format: 'A4', orientation: 'portrait' },
    };

    // Delay singkat memastikan DOM dan tema benar-benar ter-render sebelum di-capture
    setTimeout(() => {
        html2pdf()
            .set(opt)
            .from(card)
            .save()
            .then(() => {
                document.documentElement.setAttribute('data-theme', prevTheme);
            })
            .catch((err) => {
                console.error('PDF Error:', err);
                document.documentElement.setAttribute('data-theme', prevTheme);
                alert('Gagal membuat PDF. Coba lagi.');
            });
    }, 150);
});

/* ═══════════════════════════════════════════
SHARE
═══════════════════════════════════════════ */
function getShareText() {
    const r    = window._hydraResult || {};
    const ml   = r.totalMl  || 0;
    const l    = r.totalL   ? r.totalL.toFixed(1) : '0';
    const g    = r.glasses  || 0;
    return `Kebutuhan hidrasi harian saya adalah ${l} liter (${ml.toLocaleString('id-ID')} ml / ${g} gelas air)! 💧 Cek kebutuhanmu juga di Kalkulator Hidrasi!`;
}

document.getElementById('btnWa').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareText())}`, '_blank', 'noopener,noreferrer');
});
document.getElementById('btnX').addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}`, '_blank', 'noopener,noreferrer');
});
document.getElementById('btnThreads').addEventListener('click', () => {
    window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(getShareText())}`, '_blank', 'noopener,noreferrer');
});

/* ═══════════════════════════════════════════
RESTART
═══════════════════════════════════════════ */
document.getElementById('btnRestart').addEventListener('click', () => {
    state.gender   = null;
    state.activity = null;
    state.age      = 25;
    state.weight   = 60;
    state.height   = 165;

    document.querySelectorAll('.gender-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
    });
    document.querySelectorAll('.activity-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
    });

    Object.entries(SLIDER_CONFIG).forEach(([key, cfg]) => {
        setSliderValue(key, state[key]);
    });

    document.getElementById('resultCard').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
});