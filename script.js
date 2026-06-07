// ============================================================
// HISPANDLE · lógica de juego + animaciones GSAP
// ============================================================

// ---- Protección ligera contra trampas (sin romper la consola en dev) ----
(function () {
    'use strict';
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        document.addEventListener('contextmenu', e => e.preventDefault());
    }
})();

// ============ ESTADO ============
let targetEvent = null;
let allEvents = [];
let attempts = 0;
const MAX_ATTEMPTS = 5;
let gameOver = false;
let currentScreen = 'home';
let currentDate = null;
let stats = { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0] };

const HAS_GSAP = typeof window.gsap !== 'undefined';
const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ANIM = HAS_GSAP && !REDUCED;

// ============ ICONOS SVG INLINE ============
const SVG = (paths) => `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONS = {
    sun: SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'),
    moon: SVG('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
    check: SVG('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),
    up: SVG('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'),
    down: SVG('<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>'),
    flame: SVG('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
    far: SVG('<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'),
    trophy: SVG('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
    tick: SVG('<polyline points="20 6 9 17 4 12"/>'),
    cross: SVG('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    target: SVG('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
    circle: SVG('<circle cx="12" cy="12" r="10"/>'),
    landmark: SVG('<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>')
};

// ============ SELECCIÓN DETERMINISTA DEL EVENTO DEL DÍA ============
// Cada fecha mapea siempre a un evento del pool → el juego nunca se queda sin reto.
const EPOCH = Date.UTC(2025, 0, 1); // 2025-01-01
function dayNumber(dateStr) {
    const t = Date.parse(dateStr + 'T00:00:00Z');
    return Math.floor((t - EPOCH) / 86400000);
}
function getDailyEvent(dateStr) {
    if (!allEvents.length) return null;
    const n = allEvents.length;
    const idx = ((dayNumber(dateStr) % n) + n) % n;
    return allEvents[idx];
}
function todayStr() { return new Date().toISOString().split('T')[0]; }

// ============ NAVEGACIÓN ============
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const screen = document.getElementById(`${screenName}-screen`);
    if (!screen) return;
    screen.classList.remove('hidden');
    currentScreen = screenName;

    if (screenName === 'stats') renderStats();
    else if (screenName === 'history') renderHistory();
    else if (screenName === 'game') {
        if (!currentDate) currentDate = todayStr();
        loadGameForDate(currentDate);
    }

    animateScreenIn(screen, screenName);
    if (screenName !== 'home') window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
}

// ============ PERSISTENCIA ============
function loadData() {
    const saved = localStorage.getItem('histodle-stats');
    if (saved) { try { stats = JSON.parse(saved); } catch (e) {} }
}
function saveData() { localStorage.setItem('histodle-stats', JSON.stringify(stats)); }
function getGameState(date) {
    const s = localStorage.getItem(`histodle-game-${date}`);
    return s ? JSON.parse(s) : null;
}
function saveGameState(date) {
    const state = {
        attempts, gameOver,
        attemptsData: Array.from(document.getElementById('attempts-container').children).map(d => d.outerHTML)
    };
    localStorage.setItem(`histodle-game-${date}`, JSON.stringify(state));
}

// ============ RESET ============
function resetGame() {
    attempts = 0;
    gameOver = false;
    document.getElementById('attempts-container').innerHTML = '';
    const input = document.getElementById('year-input');
    input.value = '';
    input.disabled = false;
    document.getElementById('submit-btn').disabled = false;
    const msg = document.getElementById('result-message');
    msg.classList.add('hidden');
    msg.classList.remove('win', 'lose');
    updateAttemptsCounter();
}

// ============ CARGA DE PARTIDA ============
function loadGameForDate(date) {
    currentDate = date;
    targetEvent = getDailyEvent(date);
    if (!targetEvent) {
        document.getElementById('event-description').innerText = 'No hay evento disponible.';
        return;
    }

    const dateObj = new Date(date + 'T12:00:00');
    const isToday = date === todayStr();
    document.getElementById('event-date-label').innerText = isToday
        ? 'EVENTO DE HOY'
        : dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    document.getElementById('event-epoca').innerText = targetEvent.epoca || '';
    document.getElementById('event-description').innerText = targetEvent.clue;

    resetGame();

    const saved = getGameState(date);
    if (saved && saved.gameOver) {
        attempts = saved.attempts;
        gameOver = true;
        document.getElementById('attempts-container').innerHTML = saved.attemptsData.join('');
        document.getElementById('year-input').disabled = true;
        document.getElementById('submit-btn').disabled = true;
        const won = saved.attemptsData.some(h => h.includes('correct'));
        showGameResult(won);
    }
    updateAttemptsCounter();
}

// ============ INICIO ============
async function initGame() {
    loadData();
    try {
        const res = await fetch('eventos.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('No se pudo cargar el juego');
        allEvents = await res.json();
        if (!Array.isArray(allEvents) || !allEvents.length) throw new Error('Datos inválidos');

        currentDate = todayStr();
        targetEvent = getDailyEvent(currentDate);
        renderTeaser();
    } catch (err) {
        console.error('Error:', err);
        const t = document.getElementById('teaser-clue');
        if (t) t.innerText = 'Error cargando los datos. Recarga la página.';
    }
}

// Tarjeta de avance en la home
function renderTeaser() {
    if (!targetEvent) return;
    const clue = document.getElementById('teaser-clue');
    const epoca = document.getElementById('teaser-epoca');
    const slots = document.getElementById('teaser-slots');
    if (clue) clue.innerText = targetEvent.clue;
    if (epoca) epoca.innerText = targetEvent.epoca || '';
    if (slots && !slots.childElementCount) {
        slots.innerHTML = Array.from({ length: MAX_ATTEMPTS }, () => '<span class="slot"></span>').join('');
    }
}

// ============ JUGADA ============
function makeGuess() {
    if (gameOver || !targetEvent) return;
    const input = document.getElementById('year-input');
    const guess = parseInt(input.value, 10);
    if (!guess && guess !== 0) return;

    attempts++;
    const diff = targetEvent.year - guess;
    const row = renderAttempt(guess, diff);
    updateAttemptsCounter();
    input.value = '';
    saveGameState(currentDate);

    if (diff === 0) endGame(true);
    else if (attempts >= MAX_ATTEMPTS) endGame(false);
    else if (ANIM) shake(input);
}

function renderAttempt(guess, diff) {
    const container = document.getElementById('attempts-container');
    const div = document.createElement('div');
    div.className = 'attempt-row';

    let feedback = '';
    if (diff === 0) {
        div.classList.add('correct');
        feedback = `${ICONS.check} ¡Correcto!`;
    } else {
        const dir = diff > 0 ? `${ICONS.up} Más tarde` : `${ICONS.down} Más pronto`;
        if (Math.abs(diff) <= 50) { div.classList.add('close'); feedback = `${ICONS.flame} Cerca · ${dir}`; }
        else { div.classList.add('wrong'); feedback = `${ICONS.far} Lejos · ${dir}`; }
    }

    div.innerHTML = `<span class="att-year">${guess}</span><span class="att-feedback">${feedback}</span>`;
    container.appendChild(div);
    if (ANIM) animateAttempt(div, diff === 0);
    return div;
}

function updateAttemptsCounter() {
    const c = document.getElementById('attempts-counter');
    if (c) c.innerText = `${attempts}/${MAX_ATTEMPTS}`;
}

// ============ FIN ============
function endGame(win) {
    gameOver = true;
    document.getElementById('year-input').disabled = true;
    document.getElementById('submit-btn').disabled = true;

    if (currentDate === todayStr()) {
        stats.played++;
        if (win) {
            stats.wins++;
            stats.currentStreak++;
            stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
            stats.distribution[attempts - 1]++;
        } else {
            stats.currentStreak = 0;
        }
        saveData();
    }
    saveGameState(currentDate);
    showGameResult(win);
}

function showGameResult(win) {
    const msg = document.getElementById('result-message');
    const text = document.getElementById('result-text');
    msg.classList.remove('hidden', 'win', 'lose');
    msg.classList.add(win ? 'win' : 'lose');

    text.innerHTML = win
        ? `${ICONS.trophy} ¡Correcto!<br>${targetEvent.year} · ${targetEvent.event}`
        : `La respuesta era:<br>${targetEvent.year} · ${targetEvent.event}`;

    if (ANIM) {
        gsap.fromTo(msg, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .45, ease: 'power2.out' });
    }
}

// ============ ESTADÍSTICAS ============
function renderStats() {
    const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
    countUp('stat-played', stats.played);
    countUp('stat-wins', stats.wins);
    countUp('stat-winrate', winRate, '%');
    countUp('stat-streak', stats.currentStreak);

    const chart = document.getElementById('distribution-chart');
    chart.innerHTML = '';
    const maxValue = Math.max(...stats.distribution, 1);
    for (let i = 0; i < 5; i++) {
        const value = stats.distribution[i];
        const pct = (value / maxValue) * 100;
        const bar = document.createElement('div');
        bar.className = 'bar-row';
        bar.innerHTML = `
            <span class="bar-label">${i + 1}</span>
            <div class="bar-container">
                <div class="bar-fill" data-pct="${pct}"></div>
                <span class="bar-value">${value}</span>
            </div>`;
        chart.appendChild(bar);
    }
    // animar barras
    chart.querySelectorAll('.bar-fill').forEach((el, i) => {
        const pct = el.getAttribute('data-pct');
        if (ANIM) gsap.fromTo(el, { width: 0 }, { width: pct + '%', duration: .7, delay: i * 0.06, ease: 'power2.out' });
        else el.style.width = pct + '%';
    });
}

function countUp(id, target, suffix = '') {
    const el = document.getElementById(id);
    if (!el) return;
    if (!ANIM) { el.innerText = target + suffix; return; }
    const obj = { v: 0 };
    gsap.to(obj, {
        v: target, duration: .8, ease: 'power2.out',
        onUpdate: () => { el.innerText = Math.round(obj.v) + suffix; }
    });
}

// ============ HISTORIAL ============
function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const event = getDailyEvent(dateStr);
        if (!event) continue;

        const saved = getGameState(dateStr);
        const isToday = i === 0;
        const item = document.createElement('div');
        item.className = 'history-item clickeable';

        let won = false;
        if (saved && saved.gameOver) {
            won = saved.attemptsData.some(h => h.includes('correct'));
            item.classList.add(won ? 'won' : 'lost');
        } else if (!isToday) {
            item.classList.add('unplayed');
        }

        const dateObj = new Date(dateStr + 'T12:00:00');
        const dateLabel = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

        let badge;
        if (saved && saved.gameOver) badge = `<span class="history-badge ${won ? 'badge-win' : 'badge-lose'}">${won ? ICONS.tick + ' Acertado' : ICONS.cross + ' Fallado'}</span>`;
        else if (isToday) badge = `<span class="history-badge badge-today">${ICONS.target} Hoy</span>`;
        else badge = `<span class="history-badge badge-unplayed">${ICONS.circle} Sin jugar</span>`;

        const revealed = saved && saved.gameOver;
        const eventName = revealed ? event.event : '? ? ?';

        item.innerHTML = `
            <div class="history-header">
                <span class="history-date">${dateLabel}</span>
                ${badge}
            </div>
            <div class="history-event ${revealed ? '' : 'hidden-event'}">${eventName}</div>
            <div class="history-details">
                <span class="history-year">${ICONS.landmark} ${event.epoca || 'Historia'}</span>
                <span class="history-click">Jugar →</span>
            </div>`;

        item.onclick = () => { currentDate = dateStr; showScreen('game'); };
        list.appendChild(item);
    }

    if (ANIM) {
        gsap.from('#history-list .history-item', { y: 18, opacity: 0, duration: .4, stagger: .06, ease: 'power2.out' });
    }
}

// ============ TEMA ============
function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    paintThemeToggle(next);
}
function paintThemeToggle(theme) {
    const icon = document.querySelector('.theme-icon');
    const label = document.querySelector('.theme-label');
    if (icon) icon.innerHTML = theme === 'dark' ? ICONS.moon : ICONS.sun;
    if (label) label.textContent = theme === 'dark' ? 'OSCURO' : 'CLARO';
}
function loadTheme() {
    const saved = localStorage.getItem('theme') || 'light'; // crema por defecto
    document.documentElement.setAttribute('data-theme', saved);
    paintThemeToggle(saved);
}

// ============ ANIMACIONES GSAP ============
function animateScreenIn(screen, name) {
    if (!ANIM) return;
    const targets = screen.querySelectorAll('[data-anim]');
    if (name === 'home') return; // la home se anima en el arranque
    if (targets.length) {
        gsap.set(targets, { opacity: 1 });
    }
    gsap.fromTo(screen, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .4, ease: 'power2.out' });
}

function animateAttempt(el, isCorrect) {
    gsap.fromTo(el, { y: 14, scale: .96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .5, ease: 'back.out(1.6)' });
    if (isCorrect) {
        gsap.fromTo(el, { boxShadow: '0 0 0 0 rgba(76,122,63,.5)' },
            { boxShadow: '0 0 0 12px rgba(76,122,63,0)', duration: .8, ease: 'power2.out', delay: .15 });
    }
}

function shake(el) {
    gsap.fromTo(el, { x: -8 }, { x: 0, duration: .5, ease: 'elastic.out(1, 0.3)' });
}

function homeIntro() {
    if (!ANIM) { document.body.classList.add('no-anim'); return; }
    document.body.classList.add('js-anim');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.app-bar', { y: -30, opacity: 0, duration: .5 })
      .from('#home-screen [data-anim]', {
          y: 26, opacity: 0, duration: .6, stagger: .09,
          clearProps: 'opacity,transform,will-change'
      }, '-=0.2');
    // dado oscilante en el CTA
    gsap.to('.dice', { rotation: 18, yoyo: true, repeat: -1, duration: 1.1, ease: 'sine.inOut', transformOrigin: '50% 50%' });

    // Red de seguridad: si por cualquier motivo un elemento quedara oculto, mostrarlo.
    setTimeout(() => {
        document.querySelectorAll('#home-screen [data-anim]').forEach(el => {
            if (parseFloat(getComputedStyle(el).opacity) < 0.95) gsap.set(el, { opacity: 1, y: 0 });
        });
    }, 1600);
}

// ============ ARRANQUE ============
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    if (!ANIM) document.body.classList.add('no-anim');

    const yearInput = document.getElementById('year-input');
    if (yearInput) {
        yearInput.addEventListener('keypress', e => { if (e.key === 'Enter') makeGuess(); });
    }

    homeIntro();

    // Deep-link: #game / #stats / #history abren la pantalla directamente
    const hash = (location.hash || '').replace('#', '');
    if (['game', 'stats', 'history'].includes(hash)) {
        // esperar a que los datos estén listos antes de abrir el juego
        const open = () => showScreen(hash);
        if (hash === 'game') {
            const wait = setInterval(() => {
                if (allEvents.length) { clearInterval(wait); open(); }
            }, 80);
            setTimeout(() => clearInterval(wait), 4000);
        } else {
            open();
        }
    }
});

initGame();
