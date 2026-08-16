// State Management
const defaultWords = [
    { word: "Resilient", phonetic: "/rɪˈzɪliənt/", pos: "adjective", def: "Способный быстро восстанавливаться после трудностей", ex: "She is a resilient person who never gives up.", learned: false },
    { word: "Eloquent", phonetic: "/ˈeləkwənt/", pos: "adjective", def: "Красноречивый, убедительно говорящий", ex: "His eloquent speech moved everyone in the room.", learned: false },
    { word: "Serendipity", phonetic: "/ˌserənˈdɪpəti/", pos: "noun", def: "Счастливая случайность, интуитивная прозорливость", ex: "Finding this book was pure serendipity.", learned: false },
    { word: "Ambition", phonetic: "/æmˈbɪʃn/", pos: "noun", def: "Амбиция, сильное стремление к успеху", ex: "Her ambition is to become a top software engineer.", learned: false }
];

let dictionary = JSON.parse(localStorage.getItem('vocab_dict')) || defaultWords;
let streak = parseInt(localStorage.getItem('vocab_streak')) || 1;
let dailyGoal = parseInt(localStorage.getItem('vocab_daily')) || 2;
let currentTheme = localStorage.getItem('vocab_theme') || 'dark';

let currentCardIndex = 0;
let quizScore = 0;
let quizIndex = 0;
let quizTimer = null;

// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initTheme();
    updateProgress();
    renderDictionary();
    setupEventListeners();
});

// Theme Toggle
function initTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('vocab_theme', currentTheme);
}

// Navigation System
function setupEventListeners() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('theme-toggle-mobile').addEventListener('click', toggleTheme);

    // Search
    document.getElementById('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('search-input').value.trim();
        if (query) searchWord(query);
    });

    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const word = btn.getAttribute('data-word');
            document.getElementById('search-input').value = word;
            searchWord(word);
        });
    });

    // Custom Word Modal
    document.getElementById('add-custom-word-btn').addEventListener('click', () => {
        document.getElementById('custom-word-modal').classList.remove('hidden');
    });

    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('custom-word-modal').classList.add('hidden');
    });

    document.getElementById('custom-word-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const word = document.getElementById('cust-word').value;
        const def = document.getElementById('cust-def').value;
        const ex = document.getElementById('cust-ex').value;

        dictionary.push({ word, phonetic: '', pos: 'custom', def, ex, learned: false });
        saveDict();
        renderDictionary();
        document.getElementById('custom-word-modal').classList.add('hidden');
        e.target.reset();
    });

    // Flashcards Flip
    const card = document.getElementById('flashcard');
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.audio-btn')) {
            card.classList.toggle('flipped');
        }
    });

    document.getElementById('next-card').addEventListener('click', () => changeCard(1));
    document.getElementById('prev-card').addEventListener('click', () => changeCard(-1));
    document.getElementById('mark-learned-btn').addEventListener('click', markCurrentLearned);

    // Spelling
    document.getElementById('spelling-form').addEventListener('submit', checkSpelling);
    document.getElementById('spelling-audio-btn').addEventListener('click', () => {
        const word = dictionary[currentCardIndex]?.word || "Resilient";
        speak(word);
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'cards') loadFlashcard();
    if (tabName === 'quiz') startQuiz();
    if (tabName === 'spelling') loadSpelling();
}

// API Integration: Free Dictionary API
async function searchWord(word) {
    const resultBox = document.getElementById('word-result');
    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `<p>Загрузка данных для "${word}"...</p>`;

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error('Слово не найдено');

        const data = await response[0];
        const wordData = data[0];
        const meaning = wordData.meanings[0];

        resultBox.innerHTML = `
            <div class="word-header">
                <div class="word-title-group">
                    <h2>${wordData.word}</h2>
                    <p class="phonetic">${wordData.phonetic || ''}</p>
                </div>
                <button class="btn-primary" onclick="addFromSearch('${wordData.word}', '${wordData.phonetic || ''}', '${meaning.definitions[0].definition}')">
                    <i data-lucide="plus"></i> Сохранить
                </button>
            </div>
            <div class="meaning-block">
                <p class="part-of-speech">${meaning.partOfSpeech}</p>
                <ul class="definition-list">
                    <li>${meaning.definitions[0].definition}</li>
                </ul>
            </div>
        `;
        lucide.createIcons();
    } catch (err) {
        resultBox.innerHTML = `<p style="color: var(--danger)">Слово не найдено в словаре. Попробуйте другое.</p>`;
    }
}

function addFromSearch(word, phonetic, def) {
    if (!dictionary.some(w => w.word.toLowerCase() === word.toLowerCase())) {
        dictionary.push({ word, phonetic, pos: 'general', def, ex: '', learned: false });
        saveDict();
        renderDictionary();
        alert(`Слово "${word}" добавлено в ваш словарь!`);
    } else {
        alert('Это слово уже есть в вашем словаре.');
    }
}

// LocalStorage Utils
function saveDict() {
    localStorage.setItem('vocab_dict', JSON.stringify(dictionary));
    updateProgress();
}

function updateProgress() {
    const learnedCount = dictionary.filter(w => w.learned).length;
    document.getElementById('dict-count-badge').textContent = dictionary.length;
    document.getElementById('daily-goal-text').textContent = `${learnedCount}/${dailyGoal}`;
    document.getElementById('streak-count').textContent = streak;
    document.getElementById('streak-count-mobile').textContent = streak;

    const percentage = Math.min((learnedCount / dailyGoal) * 100, 100);
    document.getElementById('daily-progress').style.width = `${percentage}%`;
}

// Render Dictionary
function renderDictionary() {
    const grid = document.getElementById('saved-words-list');
    grid.innerHTML = '';

    dictionary.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'dict-card';
        card.innerHTML = `
            <h3>${item.word}</h3>
            <p class="def">${item.def}</p>
            <div class="card-footer-mini">
                <span style="color: ${item.learned ? 'var(--success)' : 'var(--warning)'}">
                    ${item.learned ? '✓ Выучено' : '• В процессе'}
                </span>
                <button class="icon-btn" onclick="deleteWord(${index})"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });
    lucide.createIcons();
}

function deleteWord(index) {
    dictionary.splice(index, 1);
    saveDict();
    renderDictionary();
}

// Speech Synthesis
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
}

// Flashcards System
function loadFlashcard() {
    if (dictionary.length === 0) return;
    const item = dictionary[currentCardIndex];

    document.getElementById('card-index').textContent = `${currentCardIndex + 1} / ${dictionary.length}`;
    document.getElementById('card-word').textContent = item.word;
    document.getElementById('card-phonetic').textContent = item.phonetic || '';
    document.getElementById('card-pos').textContent = item.pos || 'word';
    document.getElementById('card-definition').textContent = item.def;
    document.getElementById('card-example').textContent = item.ex ? `"${item.ex}"` : '';

    document.getElementById('card-audio-btn').onclick = (e) => {
        e.stopPropagation();
        speak(item.word);
    };

    document.getElementById('flashcard').classList.remove('flipped');
}

function changeCard(dir) {
    currentCardIndex = (currentCardIndex + dir + dictionary.length) % dictionary.length;
    loadFlashcard();
}

function markCurrentLearned() {
    dictionary[currentCardIndex].learned = true;
    saveDict();
    changeCard(1);
}

// Quiz System
function startQuiz() {
    quizIndex = 0;
    quizScore = 0;
    showQuestion();
}

function showQuestion() {
    if (quizIndex >= Math.min(dictionary.length, 5)) {
        document.getElementById('quiz-box').innerHTML = `
            <div style="text-align: center;">
                <h2>Отличная работа! 🎉</h2>
                <p style="margin: 16px 0;">Ваш результат: <strong>${quizScore}</strong> из ${Math.min(dictionary.length, 5)}</p>
                <button class="btn-primary" onclick="startQuiz()">Пройти снова</button>
            </div>
        `;
        return;
    }

    const current = dictionary[quizIndex];
    document.getElementById('quiz-current').textContent = quizIndex + 1;
    document.getElementById('quiz-total').textContent = Math.min(dictionary.length, 5);
    document.getElementById('quiz-score').textContent = quizScore;
    document.getElementById('quiz-question').textContent = `Как переводится "${current.word}"?`;

    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';

    let options = [current.def];
    while (options.length < 4 && options.length < dictionary.length) {
        let randomDef = dictionary[Math.floor(Math.random() * dictionary.length)].def;
        if (!options.includes(randomDef)) options.push(randomDef);
    }
    options.sort(() => Math.random() - 0.5);

    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => selectOption(btn, opt === current.def);
        optionsContainer.appendChild(btn);
    });
}

function selectOption(btn, isCorrect) {
    if (isCorrect) {
        btn.classList.add('correct');
        quizScore++;
    } else {
        btn.classList.add('wrong');
    }

    setTimeout(() => {
        quizIndex++;
        showQuestion();
    }, 1000);
}

// Spelling System
function loadSpelling() {
    const item = dictionary[currentCardIndex] || dictionary[0];
    document.getElementById('spelling-hint').textContent = `Определение: ${item.def}`;
    document.getElementById('spelling-input').value = '';
    document.getElementById('spelling-feedback').textContent = '';
}

function checkSpelling(e) {
    e.preventDefault();
    const input = document.getElementById('spelling-input').value.trim().toLowerCase();
    const target = (dictionary[currentCardIndex] || dictionary[0]).word.toLowerCase();
    const feedback = document.getElementById('spelling-feedback');

    if (input === target) {
        feedback.textContent = "✨ Верно! Отличная работа.";
        feedback.style.color = "var(--success)";
        setTimeout(() => {
            changeCard(1);
            loadSpelling();
        }, 1500);
    } else {
        feedback.textContent = "❌ Ошибка, попробуйте еще раз!";
        feedback.style.color = "var(--danger)";
    }
}
