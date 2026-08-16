import { createIcons, icons } from 'lucide';

// Объявление глобального типов confetti
declare const confetti: any;

// Интерфейс слова
interface Word {
  id: string;
  english: string;
  translation: string;
  transcription?: string;
  category: string;
  example?: string;
  learned: boolean;
  correctCount: number;
  createdAt: number;
}

// Начальный демо-набор слов
const INITIAL_WORDS: Word[] = [
  {
    id: '1',
    english: 'Perseverance',
    translation: 'Настойчивость / Упорство',
    transcription: '/ˌpɜː.sɪˈvɪə.rəns/',
    category: 'Motivation',
    example: 'Success requires hard work and perseverance.',
    learned: false,
    correctCount: 0,
    createdAt: Date.now()
  },
  {
    id: '2',
    english: 'Ubiquitous',
    translation: 'Вездесущий / Повсеместный',
    transcription: '/juːˈbɪk.wɪ.təs/',
    category: 'Vocabulary',
    example: 'Smartphones have become ubiquitous in daily life.',
    learned: false,
    correctCount: 0,
    createdAt: Date.now() - 1000
  },
  {
    id: '3',
    english: 'Refactor',
    translation: 'Рефакторинг (улучшение кода)',
    transcription: '/riːˈfæk.tər/',
    category: 'IT & Dev',
    example: 'We need to refactor this TypeScript code for better efficiency.',
    learned: true,
    correctCount: 3,
    createdAt: Date.now() - 2000
  }
];

class DictionaryApp {
  private words: Word[] = [];
  private currentPracticeIndex: number = 0;
  private practiceWords: Word[] = [];

  constructor() {
    this.loadState();
    this.initUI();
    this.render();
  }

  // Загрузка состояния из LocalStorage
  private loadState(): void {
    const saved = localStorage.getItem('lexicon_words');
    if (saved) {
      try {
        this.words = JSON.parse(saved);
      } catch {
        this.words = INITIAL_WORDS;
      }
    } else {
      this.words = INITIAL_WORDS;
      this.saveState();
    }
  }

  // Сохранение состояния
  private saveState(): void {
    localStorage.setItem('lexicon_words', JSON.stringify(this.words));
  }

  // Инициализация событий и интерфейса
  private initUI(): void {
    // Рендер иконок Lucide
    createIcons({ icons });

    // Табы навигации
    document.getElementById('tab-dictionary')?.addEventListener('click', () => this.switchTab('dictionary'));
    document.getElementById('tab-practice')?.addEventListener('click', () => this.switchTab('practice'));
    document.getElementById('tab-stats')?.addEventListener('click', () => this.switchTab('stats'));

    // Поиск и фильтрация
    document.getElementById('search-input')?.addEventListener('input', () => this.renderWordsGrid());
    document.getElementById('category-filter')?.addEventListener('change', () => this.renderWordsGrid());

    // Модальное окно создания/редактирования
    document.getElementById('btn-open-add')?.addEventListener('click', () => this.openModal());
    document.getElementById('btn-close-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('word-form')?.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Импорт / Экспорт JSON
    document.getElementById('btn-export')?.addEventListener('click', () => this.exportData());
    document.getElementById('import-file')?.addEventListener('change', (e) => this.importData(e));

    // Тренировка: переключение режимов
    document.getElementById('mode-flashcards')?.addEventListener('click', (e) => this.setPracticeMode('flashcards', e.currentTarget as HTMLElement));
    document.getElementById('mode-quiz')?.addEventListener('click', (e) => this.setPracticeMode('quiz', e.currentTarget as HTMLElement));

    // Флешкарта
    const flashcard = document.getElementById('flashcard');
    flashcard?.addEventListener('click', () => {
      document.getElementById('card-back')?.classList.toggle('hidden');
      document.getElementById('card-example')?.classList.toggle('hidden');
    });

    document.getElementById('btn-know-yes')?.addEventListener('click', () => this.handlePracticeAnswer(true));
    document.getElementById('btn-know-no')?.addEventListener('click', () => this.handlePracticeAnswer(false));
  }

  // Переключение закладок
  private switchTab(tab: 'dictionary' | 'practice' | 'stats'): void {
    const tabs = ['dictionary', 'practice', 'stats'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-${t}`);
      const view = document.getElementById(`view-${t}`);
      
      if (t === tab) {
        btn?.classList.add('bg-brand-600', 'text-white', 'shadow-md');
        btn?.classList.remove('text-slate-400', 'hover:text-white');
        view?.classList.remove('hidden');
      } else {
        btn?.classList.remove('bg-brand-600', 'text-white', 'shadow-md');
        btn?.classList.add('text-slate-400', 'hover:text-white');
        view?.classList.add('hidden');
      }
    });

    if (tab === 'practice') {
      this.startPractice();
    } else if (tab === 'stats') {
      this.renderStats();
    }
  }

  // Рендеринг основного списка слов
  private renderWordsGrid(): void {
    const grid = document.getElementById('words-grid');
    const emptyState = document.getElementById('empty-state');
    const searchVal = (document.getElementById('search-input') as HTMLInputElement)?.value.toLowerCase() || '';
    const catVal = (document.getElementById('category-filter') as HTMLSelectElement)?.value || 'all';

    if (!grid || !emptyState) return;

    // Фильтрация
    const filtered = this.words.filter(w => {
      const matchesSearch = w.english.toLowerCase().includes(searchVal) ||
                            w.translation.toLowerCase().includes(searchVal) ||
                            (w.example && w.example.toLowerCase().includes(searchVal));
      const matchesCategory = catVal === 'all' || w.category === catVal;
      return matchesSearch && matchesCategory;
    });

    grid.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      filtered.forEach(word => {
        const card = document.createElement('div');
        card.className = 'bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between transition-all space-y-4 group';
        card.innerHTML = `
          <div>
            <div class="flex justify-between items-start mb-2">
              <span class="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg border border-slate-700/50">${this.escape(word.category || 'General')}</span>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button data-action="speak" data-word="${this.escape(word.english)}" class="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-brand-400 transition-colors" title="Озвучить">
                  <i data-lucide="volume-2" class="w-4 h-4"></i>
                </button>
                <button data-action="edit" data-id="${word.id}" class="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Редактировать">
                  <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button data-action="delete" data-id="${word.id}" class="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors" title="Удалить">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
            
            <h3 class="text-xl font-bold text-white flex items-center gap-2">
              ${this.escape(word.english)}
              ${word.learned ? '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 inline" title="Изучено"></i>' : ''}
            </h3>
            <p class="text-xs text-slate-500 font-mono mt-0.5">${this.escape(word.transcription || '')}</p>
            <p class="text-slate-300 font-medium text-sm mt-2">${this.escape(word.translation)}</p>
            ${word.example ? `<p class="text-xs text-slate-400 italic mt-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">"${this.escape(word.example)}"</p>` : ''}
          </div>
        `;

        // Обработка кликов внутри карточки
        card.addEventListener('click', (e) => {
          const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
          if (!target) return;
          const action = target.dataset.action;
          if (action === 'speak') {
            this.speak(target.dataset.word || '');
          } else if (action === 'edit') {
            this.openModal(target.dataset.id);
          } else if (action === 'delete') {
            this.deleteWord(target.dataset.id || '');
          }
        });

        grid.appendChild(card);
      });
    }

    createIcons({ icons });
    this.updateCategoryOptions();
  }

  // Обновление селекта категорий
  private updateCategoryOptions(): void {
    const select = document.getElementById('category-filter') as HTMLSelectElement;
    if (!select) return;

    const currentVal = select.value;
    const categories = Array.from(new Set(this.words.map(w => w.category || 'General')));

    select.innerHTML = '<option value="all">Все категории</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });

    select.value = currentVal;
  }

  // Озвучка слова через SpeechSynthesis
  private speak(text: string): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }

  // Модалка добавления/редактирования
  private openModal(id?: string): void {
    const modal = document.getElementById('modal-word');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('word-form') as HTMLFormElement;

    if (!modal || !form) return;

    form.reset();
    (document.getElementById('form-word-id') as HTMLInputElement).value = '';

    if (id) {
      const word = this.words.find(w => w.id === id);
      if (word) {
        if (title) title.textContent = 'Редактировать слово';
        (document.getElementById('form-word-id') as HTMLInputElement).value = word.id;
        (document.getElementById('form-english') as HTMLInputElement).value = word.english;
        (document.getElementById('form-translation') as HTMLInputElement).value = word.translation;
        (document.getElementById('form-transcription') as HTMLInputElement).value = word.transcription || '';
        (document.getElementById('form-category') as HTMLInputElement).value = word.category;
        (document.getElementById('form-example') as HTMLTextAreaElement).value = word.example || '';
      }
    } else {
      if (title) title.textContent = 'Добавить новое слово';
    }

    modal.classList.remove('hidden');
  }

  private closeModal(): void {
    document.getElementById('modal-word')?.classList.add('hidden');
  }

  private handleFormSubmit(e: Event): void {
    e.preventDefault();
    const id = (document.getElementById('form-word-id') as HTMLInputElement).value;
    const english = (document.getElementById('form-english') as HTMLInputElement).value.trim();
    const translation = (document.getElementById('form-translation') as HTMLInputElement).value.trim();
    const transcription = (document.getElementById('form-transcription') as HTMLInputElement).value.trim();
    const category = (document.getElementById('form-category') as HTMLInputElement).value.trim() || 'General';
    const example = (document.getElementById('form-example') as HTMLTextAreaElement).value.trim();

    if (id) {
      // Edit
      this.words = this.words.map(w => w.id === id ? {
        ...w, english, translation, transcription, category, example
      } : w);
    } else {
      // Create
      const newWord: Word = {
        id: Date.now().toString(),
        english,
        translation,
        transcription,
        category,
        example,
        learned: false,
        correctCount: 0,
        createdAt: Date.now()
      };
      this.words.unshift(newWord);
    }

    this.saveState();
    this.renderWordsGrid();
    this.closeModal();
  }

  private deleteWord(id: string): void {
    if (confirm('Удалить это слово из словаря?')) {
      this.words = this.words.filter(w => w.id !== id);
      this.saveState();
      this.renderWordsGrid();
    }
  }

  // Экспорт и импорт
  private exportData(): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.words, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `dictionary_backup_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
  }

  private importData(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          this.words = imported;
          this.saveState();
          this.renderWordsGrid();
          alert('Словарь успешно импортирован!');
        }
      } catch {
        alert('Ошибка при чтении файла JSON.');
      }
    };
    reader.readAsText(file);
  }

  // --- ЛОГИКА ТРЕНИРОВКИ ---
  private startPractice(): void {
    this.practiceWords = [...this.words].sort(() => Math.random() - 0.5);
    this.currentPracticeIndex = 0;
    this.renderPracticeCard();
  }

  private setPracticeMode(mode: 'flashcards' | 'quiz', btnTarget: HTMLElement): void {
    document.querySelectorAll('.practice-mode-btn').forEach(b => b.classList.remove('active', 'bg-brand-600', 'text-white'));
    btnTarget.classList.add('active', 'bg-brand-600', 'text-white');

    const flashcardCont = document.getElementById('flashcard-container');
    const quizCont = document.getElementById('quiz-container');

    if (mode === 'flashcards') {
      flashcardCont?.classList.remove('hidden');
      quizCont?.classList.add('hidden');
    } else {
      flashcardCont?.classList.add('hidden');
      quizCont?.classList.remove('hidden');
    }

    this.renderPracticeCard();
  }

  private renderPracticeCard(): void {
    const scoreText = document.getElementById('practice-score');
    if (scoreText) {
      scoreText.textContent = `Карточка: ${this.practiceWords.length > 0 ? this.currentPracticeIndex + 1 : 0} / ${this.practiceWords.length}`;
    }

    if (this.practiceWords.length === 0 || this.currentPracticeIndex >= this.practiceWords.length) {
      this.finishPractice();
      return;
    }

    const word = this.practiceWords[this.currentPracticeIndex];

    // Флешкарта
    (document.getElementById('card-category') as HTMLElement).textContent = word.category || 'General';
    (document.getElementById('card-front') as HTMLElement).textContent = word.english;
    (document.getElementById('card-back') as HTMLElement).textContent = word.translation;
    
    const exElem = document.getElementById('card-example') as HTMLElement;
    if (word.example) {
      exElem.textContent = `"${word.example}"`;
      exElem.classList.add('hidden');
    } else {
      exElem.textContent = '';
    }

    document.getElementById('card-back')?.classList.add('hidden');

    // Квиз
    (document.getElementById('quiz-word') as HTMLElement).textContent = word.english;
    const optionsContainer = document.getElementById('quiz-options');
    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      
      // Генерация 4 вариантов
      const distractors = this.words
        .filter(w => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.translation);

      const options = [...distractors, word.translation].sort(() => Math.random() - 0.5);

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'p-4 bg-slate-950 border border-slate-800 hover:border-brand-500/50 rounded-xl text-sm font-medium text-left transition-all hover:bg-slate-800/50';
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          if (opt === word.translation) {
            btn.classList.add('border-emerald-500', 'bg-emerald-500/10', 'text-emerald-400');
            setTimeout(() => this.handlePracticeAnswer(true), 600);
          } else {
            btn.classList.add('border-red-500', 'bg-red-500/10', 'text-red-400');
            setTimeout(() => this.handlePracticeAnswer(false), 600);
          }
        });
        optionsContainer.appendChild(btn);
      });
    }
  }

  private handlePracticeAnswer(known: boolean): void {
    const currentWord = this.practiceWords[this.currentPracticeIndex];
    if (currentWord) {
      this.words = this.words.map(w => {
        if (w.id === currentWord.id) {
          const newCorrect = known ? w.correctCount + 1 : Math.max(0, w.correctCount - 1);
          return {
            ...w,
            correctCount: newCorrect,
            learned: newCorrect >= 3
          };
        }
        return w;
      });
      this.saveState();
    }

    this.currentPracticeIndex++;
    this.renderPracticeCard();
  }

  private finishPractice(): void {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    alert('Отличная работа! Тренировка завершена.');
    this.switchTab('dictionary');
  }

  // --- СТАТИСТИКА ---
  private renderStats(): void {
    const total = this.words.length;
    const learned = this.words.filter(w => w.learned).length;
    const percentage = total > 0 ? Math.round((learned / total) * 100) : 0;

    (document.getElementById('stat-total') as HTMLElement).textContent = total.toString();
    (document.getElementById('stat-learned') as HTMLElement).textContent = learned.toString();
    (document.getElementById('stat-mastery') as HTMLElement).textContent = `${percentage}%`;
  }

  private render(): void {
    this.renderWordsGrid();
  }

  private escape(str: string): string {
    return str.replace(/[&<>"']/g, (m) => {
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return map[m];
    });
  }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
  new DictionaryApp();
});
