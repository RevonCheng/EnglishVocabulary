// 應用程式核心JS

// DOM 元素
const pages = document.querySelectorAll('.page');
const navButtons = document.querySelectorAll('.nav-btn');
const notification = document.getElementById('notification');

// 統計元素
const totalWordsElement = document.getElementById('total-words');
const warehouseWordsElement = document.getElementById('warehouse-words');
const activeWordsElement = document.getElementById('active-words');

// 主頁動作按鈕
const goAddBtn = document.getElementById('go-add');
const goReviewBtn = document.getElementById('go-review');

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    // 初始化數據庫
    initDB().then(() => {
        console.log('數據庫初始化完成');
        updateStats();
    });

    // 註冊事件監聽器
    setupEventListeners();
});

// 設置所有事件監聽器
function setupEventListeners() {
    // 導航按鈕點擊事件
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const pageId = button.getAttribute('data-page');
            navigateToPage(pageId);
        });
    });

    // 主頁按鈕
    goAddBtn.addEventListener('click', () => navigateToPage('add'));
    goReviewBtn.addEventListener('click', () => navigateToPage('review'));

    // 新增單字表單提交
    const addWordForm = document.getElementById('add-word-form');
    if (addWordForm) {
        addWordForm.addEventListener('submit', handleAddWord);
    }

    // 英文單字輸入欄位的拼寫檢查
    const wordInput = document.getElementById('word');
    if (wordInput) {
        wordInput.addEventListener('input', debounce(checkSpelling, 500));
    }

    // 複習模式選擇
    const reviewModeSelect = document.getElementById('review-mode');
    if (reviewModeSelect) {
        reviewModeSelect.addEventListener('change', handleReviewModeChange);
    }

    // 開始複習按鈕
    const startReviewBtn = document.getElementById('start-review');
    if (startReviewBtn) {
        startReviewBtn.addEventListener('click', startReview);
    }

    // 抽卡片模式按鈕
    const flashcardElement = document.querySelector('.flashcard');
    if (flashcardElement) {
        flashcardElement.addEventListener('click', flipFlashcard);
    }
    
    const playPronunciationBtn = document.getElementById('play-pronunciation');
    if (playPronunciationBtn) {
        playPronunciationBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止觸發翻卡
            playWordPronunciation(document.getElementById('flashcard-word').textContent);
        });
    }

    const flashcardPrevBtn = document.getElementById('flashcard-prev');
    const flashcardNextBtn = document.getElementById('flashcard-next');
    const flashcardLearnedBtn = document.getElementById('flashcard-learned');
    
    if (flashcardPrevBtn) flashcardPrevBtn.addEventListener('click', showPrevFlashcard);
    if (flashcardNextBtn) flashcardNextBtn.addEventListener('click', showNextFlashcard);
    if (flashcardLearnedBtn) flashcardLearnedBtn.addEventListener('click', markFlashcardLearned);

    // 選擇題模式按鈕
    const quizOptions = document.querySelectorAll('.quiz-option');
    if (quizOptions.length > 0) {
        quizOptions.forEach(option => {
            option.addEventListener('click', handleQuizOptionClick);
        });
    }

    const quizPlayPronunciationBtn = document.getElementById('quiz-play-pronunciation');
    if (quizPlayPronunciationBtn) {
        quizPlayPronunciationBtn.addEventListener('click', () => {
            playWordPronunciation(document.getElementById('quiz-word').textContent);
        });
    }

    const quizNextBtn = document.getElementById('quiz-next');
    if (quizNextBtn) quizNextBtn.addEventListener('click', nextQuizQuestion);

    // 拼寫練習模式按鈕
    const spellingCheckBtn = document.getElementById('spelling-check');
    const spellingShowBtn = document.getElementById('spelling-show');
    const spellingNextBtn = document.getElementById('spelling-next');
    
    if (spellingCheckBtn) spellingCheckBtn.addEventListener('click', checkSpellingAnswer);
    if (spellingShowBtn) spellingShowBtn.addEventListener('click', showSpellingAnswer);
    if (spellingNextBtn) spellingNextBtn.addEventListener('click', nextSpellingQuestion);

    // 單字倉庫按鈕
    const warehouseSearchInput = document.getElementById('warehouse-search');
    if (warehouseSearchInput) {
        warehouseSearchInput.addEventListener('input', debounce(filterWarehouseWords, 300));
    }

    const filterButtons = document.querySelectorAll('.filter-btn');
    if (filterButtons.length > 0) {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', handleWarehouseFilterChange);
        });
    }
}

// 頁面導航函數
function navigateToPage(pageId) {
    // 隱藏所有頁面
    pages.forEach(page => page.classList.remove('active'));
    
    // 顯示目標頁面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 更新導航按鈕狀態
    navButtons.forEach(btn => {
        if (btn.getAttribute('data-page') === pageId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 頁面特定的初始化
    if (pageId === 'warehouse') {
        loadWarehouseWords();
    }
}

// 處理新增單字表單提交
async function handleAddWord(e) {
    e.preventDefault();
    
    const wordInput = document.getElementById('word');
    const translationInput = document.getElementById('translation');
    const exampleInput = document.getElementById('example');
    
    const word = wordInput.value.trim();
    const translation = translationInput.value.trim();
    const example = exampleInput.value.trim();
    
    if (!word || !translation) {
        showNotification('請填寫英文單字和中文翻譯');
        return;
    }
    
    // 最後再檢查一次拼寫
    const spellCheck = await checkWordSpelling(word);
    if (spellCheck.isMisspelled) {
        showNotification('請確認英文單字拼寫正確');
        return;
    }
    
    // 添加單字到數據庫
    try {
        await addWord(word, translation, example);
        showNotification('成功添加新單字');
        
        // 清空表單
        wordInput.value = '';
        translationInput.value = '';
        exampleInput.value = '';
        document.getElementById('spell-check').textContent = '';
        
        // 更新統計數據
        updateStats();
    } catch (error) {
        showNotification('添加單字失敗: ' + error.message);
    }
}

// 顯示通知
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 更新統計數據
async function updateStats() {
    try {
        const stats = await getWordStats();
        
        totalWordsElement.textContent = stats.total;
        warehouseWordsElement.textContent = stats.learned;
        activeWordsElement.textContent = stats.active;
    } catch (error) {
        console.error('更新統計數據失敗:', error);
    }
}

// 處理複習模式改變
function handleReviewModeChange() {
    const selectedMode = document.getElementById('review-mode').value;
    const reviewModes = document.querySelectorAll('.review-mode');
    
    reviewModes.forEach(mode => {
        mode.classList.remove('active');
    });
    
    document.getElementById(`${selectedMode}-mode`).classList.add('active');
}

// 開始複習
async function startReview() {
    try {
        const selectedMode = document.getElementById('review-mode').value;
        
        // 隱藏開始按鈕
        document.getElementById('start-review').style.display = 'none';
        
        switch (selectedMode) {
            case 'flashcard':
                await startFlashcardReview();
                break;
            case 'quiz':
                await startQuizReview();
                break;
            case 'spelling':
                await startSpellingReview();
                break;
        }
    } catch (error) {
        console.error('開始複習失敗:', error);
        showNotification('開始複習失敗');
    }
}

// Debounce 函數，用於限制高頻率事件的觸發
function debounce(func, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// 隨機排序數組（Fisher-Yates 洗牌算法）
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// PWA 安裝提示
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止 Chrome 自動顯示安裝提示
    e.preventDefault();
    // 儲存事件以供稍後使用
    deferredPrompt = e;
    
    // 顯示自訂安裝提示
    showInstallPrompt();
});

function showInstallPrompt() {
    // 檢查用戶是否已安裝
    if (!deferredPrompt) return;
    
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
        <p>將此應用添加到您的主屏幕以便隨時使用</p>
        <div class="install-actions">
            <button id="install-app" class="btn primary">安裝</button>
            <button id="dismiss-install" class="btn secondary">稍後再說</button>
        </div>
    `;
    
    document.body.appendChild(installPrompt);
    
    document.getElementById('install-app').addEventListener('click', async () => {
        // 顯示安裝提示
        deferredPrompt.prompt();
        
        // 等待用戶回應
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`用戶回應: ${outcome}`);
        
        // 清理
        deferredPrompt = null;
        installPrompt.remove();
    });
    
    document.getElementById('dismiss-install').addEventListener('click', () => {
        installPrompt.remove();
    });
} 