// ============ PROTECCIÓN CONTRA MANIPULACIÓN ============
(function() {
    'use strict';
    
    // Detectar DevTools abierto (dificulta el hacer trampa)
    const devtools = {
        isOpen: false,
        orientation: null
    };
    
    const threshold = 160;
    const check = () => {
        if (window.outerWidth - window.innerWidth > threshold || 
            window.outerHeight - window.innerHeight > threshold) {
            if (!devtools.isOpen) {
                devtools.isOpen = true;
                console.clear();
            }
        } else {
            devtools.isOpen = false;
        }
    };
    
    setInterval(check, 1000);
    
    // Deshabilitar click derecho en producción
    if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        document.addEventListener('contextmenu', e => e.preventDefault());
    }
})();

// ============ VARIABLES GLOBALES ============
let targetEvent = null;
let allEvents = [];
let attempts = 0;
const MAX_ATTEMPTS = 5;
let gameOver = false;
let currentScreen = 'home';
let gameHistory = [];
let currentDate = null; // Para juegos del historial
let stats = {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: [0, 0, 0, 0, 0]
};

// ============ SISTEMA DE NAVEGACIÓN ============
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    
    const screen = document.getElementById(`${screenName}-screen`);
    if (screen) {
        screen.classList.remove('hidden');
        currentScreen = screenName;
        
        if (screenName === 'stats') {
            renderStats();
        } else if (screenName === 'history') {
            renderHistory();
        } else if (screenName === 'game') {
            if (!currentDate) {
                currentDate = new Date().toISOString().split('T')[0];
            }
            loadGameForDate(currentDate);
        }
    }
}

// ============ RESETEAR JUEGO ============
function resetGame() {
    attempts = 0;
    gameOver = false;
    document.getElementById('attempts-container').innerHTML = '';
    document.getElementById('year-input').value = '';
    document.getElementById('year-input').disabled = false;
    document.getElementById('submit-btn').disabled = false;
    document.getElementById('result-message').classList.add('hidden');
    updateAttemptsCounter();
}

// ============ PERSISTENCIA DE DATOS ============
function loadData() {
    const savedStats = localStorage.getItem('histodle-stats');
    if (savedStats) {
        stats = JSON.parse(savedStats);
    }
}

function saveData() {
    localStorage.setItem('histodle-stats', JSON.stringify(stats));
}

function getGameState(date) {
    const savedState = localStorage.getItem(`histodle-game-${date}`);
    return savedState ? JSON.parse(savedState) : null;
}

function saveGameState(date) {
    const state = {
        attempts,
        gameOver,
        attemptsData: Array.from(document.getElementById('attempts-container').children).map(div => div.outerHTML)
    };
    localStorage.setItem(`histodle-game-${date}`, JSON.stringify(state));
}

// ============ CARGAR JUEGO ============
async function loadGameForDate(date) {
    currentDate = date;
    const savedState = getGameState(date);
    
    // Buscar evento
    targetEvent = allEvents.find(e => e.date === date);
    if (!targetEvent) {
        document.getElementById('event-description').innerText = "No hay evento para esta fecha";
        return;
    }
    
    // Actualizar UI
    const dateObj = new Date(date + 'T12:00:00');
    const isToday = date === new Date().toISOString().split('T')[0];
    document.getElementById('event-date-label').innerText = isToday ? 'EVENTO DE HOY' : dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    document.getElementById('event-description').innerText = targetEvent.clue;
    
    resetGame();
    
    if (savedState && savedState.gameOver) {
        // Cargar juego terminado
        attempts = savedState.attempts;
        gameOver = true;
        
        const container = document.getElementById('attempts-container');
        container.innerHTML = savedState.attemptsData.join('');
        
        document.getElementById('year-input').disabled = true;
        document.getElementById('submit-btn').disabled = true;
        
        const won = savedState.attemptsData.some(html => html.includes('correct'));
        showGameResult(won);
    }
    
    updateAttemptsCounter();
}

async function initGame() {
    loadData();
    
    try {
        const response = await fetch('eventos.json', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error('No se pudo cargar el juego');
        }
        
        allEvents = await response.json();
        
        // Validar integridad de datos
        if (!Array.isArray(allEvents) || allEvents.length === 0) {
            throw new Error('Datos inválidos');
        }
        
        const today = new Date().toISOString().split('T')[0];
        currentDate = today;
        
        targetEvent = allEvents.find(e => e.date === today);
        if (!targetEvent) {
            targetEvent = allEvents[allEvents.length - 1];
        }
        
        document.getElementById('event-description').innerText = targetEvent.clue;
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('event-description').innerText = "Error cargando datos";
    }
}

// ============ MODO AÑO ============
function makeGuess() {
    if (gameOver || !targetEvent) return;

    const input = document.getElementById('year-input');
    const guess = parseInt(input.value);

    if (!guess) return;

    attempts++;
    const diff = targetEvent.year - guess;
    
    renderAttempt(guess, diff);
    updateAttemptsCounter();
    input.value = "";
    
    saveGameState(currentDate);

    if (diff === 0) {
        endGame(true);
    } else if (attempts >= MAX_ATTEMPTS) {
        endGame(false);
    }
}

function renderAttempt(guess, diff) {
    const container = document.getElementById('attempts-container');
    const div = document.createElement('div');
    div.className = 'attempt-row';

    let icon = "";
    let className = "";

    if (diff === 0) {
        className = "correct";
        icon = "🎉";
    } else {
        const direction = diff > 0 ? "⬆️ (Más tarde)" : "⬇️ (Más pronto)";
        
        if (Math.abs(diff) <= 50) {
            className = "close";
            icon = `⚠️ ${direction}`;
        } else {
            className = "wrong";
            icon = `❌ ${direction}`;
        }
    }

    div.classList.add(className);
    div.innerHTML = `
        <span>${guess}</span>
        <span>${icon}</span>
    `;
    
    container.appendChild(div);
}

function updateAttemptsCounter() {
    const counter = document.getElementById('attempts-counter');
    if (counter) {
        counter.innerText = `Intentos: ${attempts}/${MAX_ATTEMPTS}`;
    }
}



// ============ FIN DE JUEGO ============
function endGame(win) {
    gameOver = true;
    document.getElementById('year-input').disabled = true;
    document.getElementById('submit-btn').disabled = true;
    
    // Solo actualizar estadísticas si es el juego de hoy
    const today = new Date().toISOString().split('T')[0];
    if (currentDate === today) {
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
    const msgDiv = document.getElementById('result-message');
    const textDiv = document.getElementById('result-text');
    
    msgDiv.classList.remove('hidden');
    
    if (win) {
        msgDiv.style.backgroundColor = "var(--correct)";
        textDiv.innerText = `🎉 ¡CORRECTO!\nAño: ${targetEvent.year}\nEvento: ${targetEvent.event}`;
    } else {
        msgDiv.style.backgroundColor = "#d32f2f";
        textDiv.innerText = `Respuesta correcta:\nAño: ${targetEvent.year}\nEvento: ${targetEvent.event}`;
    }
}

// ============ ESTADÍSTICAS ============
function renderStats() {
    document.getElementById('stat-played').innerText = stats.played;
    document.getElementById('stat-wins').innerText = stats.wins;
    
    const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
    document.getElementById('stat-winrate').innerText = `${winRate}%`;
    document.getElementById('stat-streak').innerText = stats.currentStreak;
    
    const chart = document.getElementById('distribution-chart');
    chart.innerHTML = '';
    
    const maxValue = Math.max(...stats.distribution, 1);
    
    for (let i = 0; i < 5; i++) {
        const value = stats.distribution[i];
        const percentage = (value / maxValue) * 100;
        
        const bar = document.createElement('div');
        bar.className = 'bar-row';
        bar.innerHTML = `
            <span class="bar-label">${i + 1}</span>
            <div class="bar-container">
                <div class="bar-fill" style="width: ${percentage}%"></div>
                <span class="bar-value">${value}</span>
            </div>
        `;
        chart.appendChild(bar);
    }
}

// ============ HISTORIAL ============
function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    const today = new Date();
    
    // Mostrar últimos 7 días
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const event = allEvents.find(e => e.date === dateStr);
        if (!event) continue;
        
        const savedState = getGameState(dateStr);
        const isToday = i === 0;
        
        const item = document.createElement('div');
        item.className = 'history-item clickeable';
        
        if (savedState && savedState.gameOver) {
            const won = savedState.attemptsData.some(html => html.includes('correct'));
            item.classList.add(won ? 'won' : 'lost');
        } else if (!isToday) {
            item.classList.add('unplayed');
        }
        
        const dateObj = new Date(dateStr + 'T12:00:00');
        const dateLabel = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        
        let statusBadge = '';
        if (savedState && savedState.gameOver) {
            const won = savedState.attemptsData.some(html => html.includes('correct'));
            statusBadge = `<span class="history-badge ${won ? 'badge-win' : 'badge-lose'}">
                ${won ? '✓ Completado' : '✗ Fallado'}
            </span>`;
        } else if (isToday) {
            statusBadge = '<span class="history-badge badge-today">🎯 Hoy</span>';
        } else {
            statusBadge = '<span class="history-badge badge-unplayed">⭕ Sin jugar</span>';
        }
        
        const eventDisplay = (savedState && savedState.gameOver) ? event.event : '???';
        
        item.innerHTML = `
            <div class="history-header">
                <span class="history-date">${dateLabel}</span>
                ${statusBadge}
            </div>
            <div class="history-event">${eventDisplay}</div>
            <div class="history-details">
                <span class="history-year">📅 ${event.year}</span>
                <span class="history-click">👆 Click para jugar</span>
            </div>
        `;
        
        item.onclick = () => {
            currentDate = dateStr;
            showScreen('game');
        };
        
        list.appendChild(item);
    }
}

// Permitir Enter
// Función para cambiar entre modo claro y oscuro
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Actualizar el icono
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'light' ? '☀️' : '🌙';
    }
}

// Cargar el tema guardado al iniciar
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'light' ? '☀️' : '🌙';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Cargar tema guardado
    loadTheme();
    
    // Event listener para el input del año
    const yearInput = document.getElementById('year-input');
    if (yearInput) {
        yearInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                makeGuess();
            }
        });
    }
    
    // Event listener para el toggle de tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});

// Arrancar
initGame();
