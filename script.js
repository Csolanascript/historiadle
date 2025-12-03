let targetEvent = null;
let allEvents = [];
let attempts = 0;
const MAX_ATTEMPTS = 5;
let gameOver = false;
let currentScreen = 'home';
let gameHistory = [];
let gameMode = 'year'; // 'year' o 'name'
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

// ============ CAMBIO DE MODO ============
function switchMode(mode) {
    if (gameOver) return; // No cambiar modo si ya terminó
    
    gameMode = mode;
    
    // Actualizar botones
    document.getElementById('mode-year-btn').classList.toggle('active', mode === 'year');
    document.getElementById('mode-name-btn').classList.toggle('active', mode === 'name');
    
    // Mostrar/ocultar inputs
    document.getElementById('year-mode').classList.toggle('hidden', mode !== 'year');
    document.getElementById('name-mode').classList.toggle('hidden', mode !== 'name');
    
    // Inicializar tablero Wordle si cambia a modo nombre
    if (mode === 'name' && targetEvent) {
        initWordleBoard();
    }
    
    // Resetear juego si cambia de modo
    if (attempts > 0) {
        if (confirm('¿Quieres cambiar de modo? Se reiniciará el juego.')) {
            resetGame();
        } else {
            // Volver al modo anterior
            gameMode = mode === 'year' ? 'name' : 'year';
            switchMode(gameMode);
        }
    }
}

function resetGame() {
    attempts = 0;
    gameOver = false;
    document.getElementById('attempts-container').innerHTML = '';
    if (gameMode === 'name' && targetEvent) {
        initWordleBoard();
    }
    document.getElementById('year-input').value = '';
    document.getElementById('name-input').value = '';
    document.getElementById('year-input').disabled = false;
    document.getElementById('name-input').disabled = false;
    document.getElementById('submit-btn').disabled = false;
    document.getElementById('submit-name-btn').disabled = false;
    document.getElementById('result-message').classList.add('hidden');
    updateAttemptsCounter();
    resetKeyboard();
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
        mode: gameMode,
        attemptsData: Array.from(document.getElementById(gameMode === 'year' ? 'attempts-container' : 'wordle-container').children).map(div => div.outerHTML)
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
        gameMode = savedState.mode;
        
        switchMode(gameMode);
        
        const container = document.getElementById(gameMode === 'year' ? 'attempts-container' : 'wordle-container');
        container.innerHTML = savedState.attemptsData.join('');
        
        document.getElementById('year-input').disabled = true;
        document.getElementById('name-input').disabled = true;
        document.getElementById('submit-btn').disabled = true;
        document.getElementById('submit-name-btn').disabled = true;
        
        const won = savedState.attemptsData.some(html => html.includes('correct') || html.includes('wordle-correct'));
        showGameResult(won);
    } else if (gameMode === 'name') {
        initWordleBoard();
    }
    
    updateAttemptsCounter();
}

async function initGame() {
    loadData();
    
    try {
        const response = await fetch('eventos.json');
        allEvents = await response.json();
        
        const today = new Date().toISOString().split('T')[0];
        currentDate = today;
        
        targetEvent = allEvents.find(e => e.date === today);
        if (!targetEvent) {
            targetEvent = allEvents[allEvents.length - 1];
        }
        
        document.getElementById('event-description').innerText = targetEvent.clue;
        
        createKeyboard();
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('event-description').innerText = "Error cargando datos";
    }
}

// ============ MODO AÑO ============
function makeGuess() {
    if (gameOver || !targetEvent || gameMode !== 'year') return;

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

// ============ MODO WORDLE ============
function initWordleBoard() {
    const container = document.getElementById('wordle-container');
    container.innerHTML = '';
    
    // Crear filas vacías para los intentos
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const row = document.createElement('div');
        row.className = 'wordle-row';
        row.id = `wordle-attempt-${i}`;
        
        const targetWords = targetEvent.event.split(' ');
        targetWords.forEach((word, wordIdx) => {
            for (let j = 0; j < word.length; j++) {
                const box = document.createElement('span');
                box.className = 'wordle-letter wordle-empty';
                row.appendChild(box);
            }
            
            if (wordIdx < targetWords.length - 1) {
                const separator = document.createElement('span');
                separator.className = 'wordle-separator';
                row.appendChild(separator);
            }
        });
        
        container.appendChild(row);
    }
}

function makeWordleGuess() {
    if (gameOver || !targetEvent || gameMode !== 'name') return;

    const input = document.getElementById('name-input');
    let guess = input.value.toUpperCase().trim().replace(/\s+/g, '');

    if (guess.length === 0) return;

    attempts++;
    
    renderWordleAttempt(guess, attempts - 1);
    updateAttemptsCounter();
    input.value = "";
    
    saveGameState(currentDate);

    const targetClean = targetEvent.event.replace(/\s+/g, '');
    if (guess === targetClean) {
        endGame(true);
    } else if (attempts >= MAX_ATTEMPTS) {
        endGame(false);
    }
}

function renderWordleAttempt(guess, attemptNum) {
    const row = document.getElementById(`wordle-attempt-${attemptNum}`);
    if (!row) return;
    
    row.classList.add('used');
    
    const target = targetEvent.event.replace(/\s+/g, '');
    const targetWords = targetEvent.event.split(' ');
    const guessLetters = guess.split('');
    const targetLetters = target.split('');
    const usedTargetIndices = [];
    const letterStates = [];

    // Primera pasada: identificar letras correctas (verdes)
    let letterIndex = 0;
    targetWords.forEach((word) => {
        for (let i = 0; i < word.length; i++) {
            const guessLetter = guessLetters[letterIndex] || '';
            const targetLetter = targetLetters[letterIndex];
            
            if (guessLetter === targetLetter) {
                letterStates.push({ letter: guessLetter, state: 'correct', index: letterIndex });
                usedTargetIndices.push(letterIndex);
                updateKeyboard(guessLetter, 'correct');
            } else {
                letterStates.push({ letter: guessLetter, state: 'pending', index: letterIndex });
            }
            letterIndex++;
        }
    });

    // Segunda pasada: identificar letras presentes (amarillas)
    letterStates.forEach((state, idx) => {
        if (state.state === 'pending' && state.letter) {
            let found = false;
            for (let j = 0; j < targetLetters.length; j++) {
                if (!usedTargetIndices.includes(j) && targetLetters[j] === state.letter) {
                    state.state = 'present';
                    usedTargetIndices.push(j);
                    found = true;
                    updateKeyboard(state.letter, 'present');
                    break;
                }
            }
            if (!found) {
                state.state = 'absent';
                updateKeyboard(state.letter, 'absent');
            }
        }
    });

    // Aplicar estados a las casillas
    const boxes = row.querySelectorAll('.wordle-letter');
    let boxIndex = 0;
    
    letterStates.forEach((state, idx) => {
        if (boxes[boxIndex]) {
            boxes[boxIndex].textContent = state.letter || '';
            boxes[boxIndex].classList.remove('wordle-empty', 'wordle-pending');
            boxes[boxIndex].classList.add(`wordle-${state.state}`);
            boxIndex++;
        }
    });
    
    // Marcar siguiente fila como activa
    const nextRow = document.getElementById(`wordle-attempt-${attemptNum + 1}`);
    if (nextRow) {
        setTimeout(() => {
            nextRow.style.opacity = '1';
            nextRow.style.animation = 'pulse 1s ease-in-out infinite';
        }, 500);
    }
}

// ============ TECLADO VIRTUAL ============
function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    const rows = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];

    keyboard.innerHTML = '';
    rows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        row.forEach(key => {
            const keyBtn = document.createElement('button');
            keyBtn.className = 'keyboard-key';
            keyBtn.textContent = key;
            keyBtn.dataset.key = key;
            keyBtn.onclick = () => handleKeyPress(key);
            rowDiv.appendChild(keyBtn);
        });
        
        keyboard.appendChild(rowDiv);
    });
}

function handleKeyPress(key) {
    if (gameOver || gameMode !== 'name') return;
    
    const input = document.getElementById('name-input');
    
    if (key === '⌫') {
        input.value = input.value.slice(0, -1);
    } else if (input.value.length < 20) {
        input.value += key;
    }
    
    input.focus();
}

function updateKeyboard(letter, state) {
    const key = document.querySelector(`[data-key="${letter}"]`);
    if (key) {
        key.classList.remove('key-correct', 'key-present', 'key-absent');
        key.classList.add(`key-${state}`);
    }
}

function resetKeyboard() {
    document.querySelectorAll('.keyboard-key').forEach(key => {
        key.classList.remove('key-correct', 'key-present', 'key-absent');
    });
}

// ============ FIN DE JUEGO ============
function endGame(win) {
    gameOver = true;
    document.getElementById('year-input').disabled = true;
    document.getElementById('name-input').disabled = true;
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('submit-name-btn').disabled = true;
    
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
            const won = savedState.attemptsData.some(html => html.includes('correct') || html.includes('wordle-correct'));
            item.classList.add(won ? 'won' : 'lost');
        } else if (!isToday) {
            item.classList.add('unplayed');
        }
        
        const dateObj = new Date(dateStr + 'T12:00:00');
        const dateLabel = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        
        let statusBadge = '';
        if (savedState && savedState.gameOver) {
            const won = savedState.attemptsData.some(html => html.includes('correct') || html.includes('wordle-correct'));
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
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year-input').addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            makeGuess();
        }
    });
    
    document.getElementById('name-input').addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            makeWordleGuess();
        }
    });
});

// Arrancar
initGame();
