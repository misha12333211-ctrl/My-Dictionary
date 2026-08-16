// --- TYPES & INTERFACES ---
interface Word {
  id: string;
  word: string;
  translation: string;
  context?: string;
  tag: string;
  strength: number; // 0 to 5
  lastReviewed?: number;
}

// --- STATE MANAGEMENT ---
const STORAGE_KEY = 'lexicon_flow_words';

const defaultWords: Word[] = [
  { id: '1', word: 'Serendipity', translation: 'Счастливая случайность', context: 'Finding this app was pure serendipity.', tag: 'General', strength: 2 },
  { id: '2', word: 'Resilience', translation: 'Устойчивость / Губчатость', context: 'Emotional resilience helps in tough times.', tag: 'General', strength: 4 },
  { id: '3', word: 'Refactor', translation: 'Рефакторинг кода', context: 'We need to refactor this TypeScript module.', tag: 'Work', strength: 5 },
  { id: '4', word: 'Wanderlust', translation: 'Жажда путешествий', context: 'Her wanderlust took her all over Asia.', tag: 'Travel', strength: 1 },
];

let words: Word[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultWords;

function saveWords(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  updateStats();
}

// --- SPEECH SYNTHESIS ---
function speakWord(text: string): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
}

// --- TAB SWITCHER ---
(window as any).switchTab = function (tab: 'dictionary' | 'cards' | 'sprint'): void {
  document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(`view-${tab}`)?.classList.remove('hidden');
  document.getElementById(`nav-${tab}`)?.classList.add('active');

  if (tab === 'cards') initCards();
  if (tab === 'sprint') initSprint();
  if (tab === 'dictionary') renderDictionary();
};

// --- STATS UPDATE ---
function updateStats(): void {
  const total = words.length;
  const learned = words.filter(w => w.strength >= 4).length;
  const avgStrength = total > 0 ? Math.round((words.reduce((acc, w) => acc + w.strength, 0) / (total * 5)) * 100) : 0;

  const totalEl = document.getElementById('stat-total');
  const learnedEl = document.getElementById('stat-learned');
  const accuracyEl = document.getElementById('stat-accuracy');

  if (totalEl) totalEl.innerText = total.toString();
  if (learnedEl) learnedEl.innerText = learned.toString();
  if (accuracyEl) accuracyEl.innerText = `${avgStrength}%`;
}

// --- DICTIONARY RENDER & ACTIONS ---
(window as any).renderDictionary = function (): void {
  const listEl = document.getElementById('words-list');
  const searchVal = (document.getElementById('search-input') as HTMLInputElement)?.value.toLowerCase() || '';

  if (!listEl) return;

  const filtered = words.filter(w => 
    w.word.toLowerCase().includes(searchVal) || 
    w.translation.toLowerCase().includes(searchVal) ||
    w.tag.toLowerCase().includes(searchVal)
  );

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-12 text-slate-500">
        <p>Слова не найдены</p>
      </div>`;
    return;
  }

  listEl.innerHTML = filtered.map(w => `
    <div class="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-slate-600 transition-all">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="font-bold text-white text-base sm:text-lg">${escapeHtml(w.word)}</span>
          <button onclick="speakWord('${escapeHtml(w.word)}')" class="text-slate-400 hover:text-brand-500 transition-colors p-1">
            <i data-lucide="volume-2" class="w-4 h-4"></i>
          </button>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 font-medium">${escapeHtml(w.tag)}</span>
        </div>
        <p class="text-slate-300 text-sm">${escapeHtml(w.translation)}</p>
        ${w.context ? `<p class="text-xs text-slate-400 italic">"${escapeHtml(w.context)}"</p>` : ''}
      </div>
      <div class="flex items-center gap-3">
        <!-- Progress Dots -->
        <div class="hidden sm:flex gap-1" title="Уровень освоения: ${w.strength}/5">
          ${[1, 2, 3, 4, 5].map(i => `
            <div class="w-1.5 h-4 rounded-full ${i <= w.strength ? 'bg-brand-500' : 'bg-slate-700'}"></div>
          `).join('')}
        </div>
        <button onclick="deleteWord('${w.id}')" class="text-slate-500 hover:text-rose-400 p-2 transition-colors">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');

  if ((window as any).lucide) (window as any).lucide.createIcons();
};

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
}

(window as any).deleteWord = function (id: string): void {
  words = words.filter(w => w.id !== id);
  saveWords();
  (window as any).renderDictionary();
};

// Add Word Form Listener
document.getElementById('add-word-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const wordInput = document.getElementById('input-word') as HTMLInputElement;
  const transInput = document.getElementById('input-translation') as HTMLInputElement;
  const contextInput = document.getElementById('input-context') as HTMLInputElement;
  const tagInput = document.getElementById('input-tag') as HTMLSelectElement;

  const newWord: Word = {
    id: Date.now().toString(),
    word: wordInput.value.trim(),
    translation: transInput.value.trim(),
    context: contextInput.value.trim() || undefined,
    tag: tagInput.value,
    strength: 0
  };

  words.unshift(newWord);
  saveWords();

  wordInput.value = '';
  transInput.value = '';
  contextInput.value = '';

  (window as any).renderDictionary();
});

// --- FLASHCARDS LOGIC ---
let currentCardIndex = 0;
let isFlipped = false;

function initCards(): void {
  const container = document.getElementById('card-container');
  if (!container) return;

  if (words.length === 0) {
    container.innerHTML = `<div class="text-center text-slate-400">Сначала добавьте несколько слов в словарь.</div>`;
    return;
  }

  currentCardIndex = 0;
  renderCard();
}

function renderCard(): void {
  const container = document.getElementById('card-container');
  if (!container || words.length === 0) return;

  const current = words[currentCardIndex % words.length];
  isFlipped = false;

  container.innerHTML = `
    <div class="perspective-1000">
      <div id="flashcard" onclick="flipCard()" class="relative w-full h-64 bg-slate-800 rounded-3xl border border-slate-700 p-6 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xl transition-all duration-500">
        <div id="card-content">
          <span class="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-2 block">${current.tag}</span>
          <h2 class="text-3xl font-extrabold text-white mb-2">${escapeHtml(current.word)}</h2>
          <p class="text-xs text-slate-400">Нажмите, чтобы перевернуть</p>
        </div>
      </div>
    </div>
    <div class="flex justify-between items-center mt-6 gap-4">
      <button onclick="reviewCard(false)" class="btn-secondary flex-1 py-3 text-rose-400 hover:bg-rose-500/10 border-rose-500/20">Плохо знаю</button>
      <button onclick="reviewCard(true)" class="btn-primary flex-1 py-3">Отлично знаю</button>
    </div>
  `;
}

(window as any).flipCard = function (): void {
  const cardContent = document.getElementById('card-content');
  const current = words[currentCardIndex % words.length];
  if (!cardContent) return;

  isFlipped = !isFlipped;
  if (isFlipped) {
    cardContent.innerHTML = `
      <h2 class="text-2xl font-bold text-brand-500 mb-2">${escapeHtml(current.translation)}</h2>
      ${current.context ? `<p class="text-sm text-slate-300 italic px-4">"${escapeHtml(current.context)}"</p>` : ''}
    `;
    speakWord(current.word);
  } else {
    cardContent.innerHTML = `
      <span class="text-xs font-semibold uppercase tracking-wider text-brand-500 mb-2 block">${current.tag}</span>
      <h2 class="text-3xl font-extrabold text-white mb-2">${escapeHtml(current.word)}</h2>
      <p class="text-xs text-slate-400">Нажмите, чтобы перевернуть</p>
    `;
  }
};

(window as any).reviewCard = function (known: boolean): void {
  if (words.length === 0) return;
  const current = words[currentCardIndex % words.length];

  if (known) {
    current.strength = Math.min(5, current.strength + 1);
  } else {
    current.strength = Math.max(0, current.strength - 1);
  }

  saveWords();
  currentCardIndex++;
  renderCard();
};

// --- SPRINT GAME LOGIC ---
let sprintScore = 0;
let sprintTimer = 30;
let sprintInterval: any = null;
let currentSprintItem: { word: string; translation: string; isCorrect: boolean } | null = null;

function initSprint(): void {
  const container = document.getElementById('sprint-container');
  if (!container) return;

  if (words.length < 2) {
    container.innerHTML = `<p class="text-slate-400">Для игры требуется минимум 2 слова в словаре.</p>`;
    return;
  }

  sprintScore = 0;
  sprintTimer = 30;
  clearInterval(sprintInterval);

  container.innerHTML = `
    <div class="space-y-4">
      <div class="flex justify-between text-sm font-semibold">
        <span class="text-slate-400">Счет: <span id="sprint-score" class="text-brand-500 font-bold">0</span></span>
        <span class="text-slate-400">Время: <span id="sprint-timer" class="text-amber-400 font-bold">30</span>s</span>
      </div>
      <div id="sprint-card" class="py-8 bg-slate-900/60 rounded-2xl border border-slate-700/50">
        <!-- Questions injected here -->
      </div>
      <div class="grid grid-cols-2 gap-3">
        <button onclick="answerSprint(false)" class="btn-secondary py-3 text-rose-400 hover:bg-rose-500/10 border-rose-500/20">Неверно</button>
        <button onclick="answerSprint(true)" class="btn-primary py-3">Верно</button>
      </div>
    </div>
  `;

  nextSprintQuestion();
  sprintInterval = setInterval(() => {
    sprintTimer--;
    const timerEl = document.getElementById('sprint-timer');
    if (timerEl) timerEl.innerText = sprintTimer.toString();

    if (sprintTimer <= 0) {
      clearInterval(sprintInterval);
      endSprint();
    }
  }, 1000);
}

function nextSprintQuestion(): void {
  if (words.length === 0) return;
  const target = words[Math.floor(Math.random() * words.length)];
  const isCorrect = Math.random() > 0.5;

  let displayTranslation = target.translation;
  if (!isCorrect) {
    const otherWords = words.filter(w => w.id !== target.id);
    displayTranslation = otherWords[Math.floor(Math.random() * otherWords.length)].translation;
  }

  currentSprintItem = { word: target.word, translation: displayTranslation, isCorrect };

  const sprintCard = document.getElementById('sprint-card');
  if (sprintCard) {
    sprintCard.innerHTML = `
      <h3 class="text-2xl font-bold text-white mb-1">${escapeHtml(target.word)}</h3>
      <p class="text-slate-400 text-sm mb-2">означает</p>
      <p class="text-xl font-semibold text-brand-500">${escapeHtml(displayTranslation)}</p>
    `;
  }
}

(window as any).answerSprint = function (userChoice: boolean): void {
  if (!currentSprintItem) return;

  if (userChoice === currentSprintItem.isCorrect) {
    sprintScore += 10;
  } else {
    sprintScore = Math.max(0, sprintScore - 5);
  }

  const scoreEl = document.getElementById('sprint-score');
  if (scoreEl) scoreEl.innerText = sprintScore.toString();

  nextSprintQuestion();
};

function endSprint(): void {
  const container = document.getElementById('sprint-container');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-4 py-4">
      <i data-lucide="trophy" class="w-12 h-12 text-amber-400 mx-auto"></i>
      <h3 class="text-xl font-bold text-white">Время вышло!</h3>
      <p class="text-slate-300">Ваш результат: <span class="text-brand-500 font-bold text-lg">${sprintScore}</span> очков</p>
      <button onclick="initSprint()" class="btn-primary w-full py-2.5">Играть снова</button>
    </div>
  `;
  if ((window as any).lucide) (window as any).lucide.createIcons();
}

// --- IMPORT / EXPORT ---
(window as any).exportWords = function (): void {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(words, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `lexicon_export_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

(window as any).importWords = function (event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target?.result as string);
      if (Array.isArray(imported)) {
        words = imported;
        saveWords();
        (window as any).renderDictionary();
        alert('Словарь успешно импортирован!');
      }
    } catch (err) {
      alert('Ошибка при чтении JSON файла.');
    }
  };

  reader.readAsText(file);
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  updateStats();
  (window as any).renderDictionary();
});
