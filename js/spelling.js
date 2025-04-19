// 拼寫檢查和複習相關功能

// 全局變數，保存當前複習相關狀態
let currentFlashcardIndex = 0;
let flashcardWords = [];
let quizWords = [];
let currentQuizIndex = 0;
let spellingWords = [];
let currentSpellingIndex = 0;
let currentSpellingWord = null;

// 檢查英文單字拼寫
async function checkWordSpelling(word) {
    if (!word || word.trim() === '') {
        return { isMisspelled: false, suggestions: [] };
    }
    
    try {
        // 使用 Datamuse API 來檢查單字拼寫
        const response = await fetch(`https://api.datamuse.com/words?sp=${word}&max=5`);
        const data = await response.json();
        
        // 如果沒有建議，或第一個建議與輸入不完全匹配，則可能拼寫錯誤
        const isMisspelled = data.length === 0 || data[0].word.toLowerCase() !== word.toLowerCase();
        
        return {
            isMisspelled,
            suggestions: data.map(item => item.word)
        };
    } catch (error) {
        console.error('拼寫檢查失敗:', error);
        return { isMisspelled: false, suggestions: [] };
    }
}

// 檢查輸入的單字拼寫並顯示結果
async function checkSpelling() {
    const wordInput = document.getElementById('word');
    const spellCheckElement = document.getElementById('spell-check');
    
    const word = wordInput.value.trim();
    if (!word) {
        spellCheckElement.textContent = '';
        return;
    }
    
    const result = await checkWordSpelling(word);
    
    if (result.isMisspelled) {
        let message = '拼寫可能有誤';
        if (result.suggestions.length > 0) {
            message += `，您是否想要: ${result.suggestions.slice(0, 3).join(', ')}`;
        }
        spellCheckElement.textContent = message;
    } else {
        spellCheckElement.textContent = '';
    }
}

// 使用瀏覽器 Speech Synthesis API 發音單字
function playWordPronunciation(word) {
    if (!word || word.trim() === '') return;
    
    // 檢查瀏覽器支援
    if ('speechSynthesis' in window) {
        // 停止任何正在進行的發音
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        
        // 嘗試使用較慢的語速以便清晰發音
        utterance.rate = 0.9;
        
        window.speechSynthesis.speak(utterance);
    } else {
        showNotification('您的瀏覽器不支援語音合成');
    }
}

// =================== 抽卡片模式 ===================

// 開始抽卡片複習
async function startFlashcardReview() {
    try {
        // 獲取未學會的單字
        flashcardWords = await getRandomWords(20, true);
        
        if (flashcardWords.length === 0) {
            showNotification('沒有可複習的單字，請添加新單字');
            document.getElementById('start-review').style.display = 'block';
            return;
        }
        
        // 重置索引
        currentFlashcardIndex = 0;
        
        // 顯示第一張卡片
        showCurrentFlashcard();
    } catch (error) {
        console.error('開始抽卡片複習失敗:', error);
        showNotification('開始複習失敗');
    }
}

// 顯示當前抽卡片
function showCurrentFlashcard() {
    // 重置卡片狀態
    const flashcard = document.querySelector('.flashcard');
    flashcard.classList.remove('flipped');
    
    // 獲取當前單字
    const currentWord = flashcardWords[currentFlashcardIndex];
    
    // 更新卡片內容
    document.getElementById('flashcard-word').textContent = currentWord.word;
    document.getElementById('flashcard-translation').textContent = currentWord.translation;
    document.getElementById('flashcard-example').textContent = currentWord.example || '';
}

// 翻轉抽卡片
function flipFlashcard() {
    const flashcard = document.querySelector('.flashcard');
    flashcard.classList.toggle('flipped');
}

// 顯示上一張抽卡片
function showPrevFlashcard() {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        showCurrentFlashcard();
    }
}

// 顯示下一張抽卡片
function showNextFlashcard() {
    if (currentFlashcardIndex < flashcardWords.length - 1) {
        currentFlashcardIndex++;
        showCurrentFlashcard();
    } else {
        // 已經是最後一張卡片
        showNotification('已完成所有單字複習');
        document.getElementById('start-review').style.display = 'block';
    }
}

// 標記當前抽卡片單字為已學會
async function markFlashcardLearned() {
    try {
        const currentWord = flashcardWords[currentFlashcardIndex];
        
        // 更新數據庫
        await markWordAsLearned(currentWord.id);
        
        // 顯示通知
        showNotification('已標記為學會');
        
        // 移除當前單字
        flashcardWords.splice(currentFlashcardIndex, 1);
        
        // 更新統計數據
        updateStats();
        
        // 檢查是否還有卡片
        if (flashcardWords.length === 0) {
            showNotification('已完成所有單字複習');
            document.getElementById('start-review').style.display = 'block';
            return;
        }
        
        // 調整索引（如果刪除了最後一張卡片）
        if (currentFlashcardIndex >= flashcardWords.length) {
            currentFlashcardIndex = flashcardWords.length - 1;
        }
        
        // 顯示下一張卡片
        showCurrentFlashcard();
    } catch (error) {
        console.error('標記單字為已學會失敗:', error);
        showNotification('操作失敗');
    }
}

// =================== 選擇題模式 ===================

// 開始選擇題複習
async function startQuizReview() {
    try {
        // 獲取未學會的單字
        const allWords = await getWords();
        const activeWords = allWords.filter(word => !word.learned);
        
        if (activeWords.length < 4) {
            showNotification('單字數量不足，至少需要 4 個單字才能開始選擇題模式');
            document.getElementById('start-review').style.display = 'block';
            return;
        }
        
        // 隨機選擇單字
        quizWords = shuffleArray([...activeWords]).slice(0, Math.min(10, activeWords.length));
        
        // 重置索引
        currentQuizIndex = 0;
        
        // 顯示第一題
        showCurrentQuizQuestion();
    } catch (error) {
        console.error('開始選擇題複習失敗:', error);
        showNotification('開始複習失敗');
    }
}

// 顯示當前選擇題
async function showCurrentQuizQuestion() {
    try {
        // 重置選項狀態
        const optionElements = document.querySelectorAll('.quiz-option');
        optionElements.forEach(option => {
            option.classList.remove('correct', 'wrong');
            option.disabled = false;
        });
        
        // 清空反饋
        document.querySelector('.quiz-feedback').textContent = '';
        
        // 隱藏下一題按鈕
        document.getElementById('quiz-next').style.display = 'none';
        
        // 獲取當前問題
        const currentWord = quizWords[currentQuizIndex];
        
        // 顯示問題
        document.getElementById('quiz-word').textContent = currentWord.word;
        
        // 獲取所有單字中的翻譯作為誤導選項
        const allWords = await getWords();
        const otherWords = allWords.filter(word => word.id !== currentWord.id);
        
        // 隨機選擇 3 個誤導選項
        const wrongOptions = shuffleArray([...otherWords])
            .slice(0, 3)
            .map(word => ({
                text: word.translation,
                correct: false
            }));
        
        // 加入正確選項
        const quizOptions = [
            ...wrongOptions,
            { text: currentWord.translation, correct: true }
        ];
        
        // 隨機排序選項
        const shuffledOptions = shuffleArray(quizOptions);
        
        // 顯示選項
        document.querySelectorAll('.quiz-option').forEach((optionElement, index) => {
            optionElement.textContent = shuffledOptions[index].text;
            optionElement.dataset.correct = shuffledOptions[index].correct;
        });
    } catch (error) {
        console.error('顯示選擇題失敗:', error);
    }
}

// 處理選擇題選項點擊
async function handleQuizOptionClick(e) {
    const selectedOption = e.target;
    const isCorrect = selectedOption.dataset.correct === 'true';
    const currentWord = quizWords[currentQuizIndex];
    
    // 禁用所有選項
    document.querySelectorAll('.quiz-option').forEach(option => {
        option.disabled = true;
        
        // 顯示正確和錯誤選項
        if (option.dataset.correct === 'true') {
            option.classList.add('correct');
        } else if (option === selectedOption && !isCorrect) {
            option.classList.add('wrong');
        }
    });
    
    // 顯示反饋
    const feedbackElement = document.querySelector('.quiz-feedback');
    
    if (isCorrect) {
        feedbackElement.textContent = '答對了！';
        feedbackElement.className = 'quiz-feedback correct';
        
        // 如果連續答對多次，可以提示標記為已學會
        if (Math.random() < 0.3) {  // 30% 機率提示
            try {
                await markWordAsLearned(currentWord.id);
                showNotification('單字已自動標記為學會');
                updateStats();
            } catch (error) {
                console.error('標記單字失敗:', error);
            }
        }
    } else {
        feedbackElement.textContent = `答錯了，正確答案是: ${currentWord.translation}`;
        feedbackElement.className = 'quiz-feedback wrong';
    }
    
    // 顯示下一題按鈕
    document.getElementById('quiz-next').style.display = 'block';
}

// 前往下一道選擇題
function nextQuizQuestion() {
    if (currentQuizIndex < quizWords.length - 1) {
        currentQuizIndex++;
        showCurrentQuizQuestion();
    } else {
        // 已經是最後一題
        showNotification('已完成所有選擇題');
        document.getElementById('start-review').style.display = 'block';
    }
}

// =================== 拼寫練習模式 ===================

// 開始拼寫練習
async function startSpellingReview() {
    try {
        // 獲取未學會的單字
        spellingWords = await getRandomWords(15, true);
        
        if (spellingWords.length === 0) {
            showNotification('沒有可練習的單字，請添加新單字');
            document.getElementById('start-review').style.display = 'block';
            return;
        }
        
        // 重置索引
        currentSpellingIndex = 0;
        
        // 顯示第一題
        showCurrentSpellingQuestion();
    } catch (error) {
        console.error('開始拼寫練習失敗:', error);
        showNotification('開始練習失敗');
    }
}

// 顯示當前拼寫練習題目
function showCurrentSpellingQuestion() {
    // 清空輸入框和反饋
    document.getElementById('spelling-input').value = '';
    document.querySelector('.spelling-feedback').textContent = '';
    document.querySelector('.spelling-feedback').className = 'spelling-feedback';
    
    // 啟用輸入框和檢查按鈕
    document.getElementById('spelling-input').disabled = false;
    document.getElementById('spelling-check').disabled = false;
    
    // 設置當前單字
    currentSpellingWord = spellingWords[currentSpellingIndex];
    
    // 顯示中文翻譯
    document.getElementById('spelling-translation').textContent = currentSpellingWord.translation;
    
    // 顯示檢查和提示按鈕，隱藏下一題按鈕
    document.getElementById('spelling-check').style.display = 'inline-block';
    document.getElementById('spelling-show').style.display = 'inline-block';
    document.getElementById('spelling-next').style.display = 'none';
}

// 檢查拼寫答案
function checkSpellingAnswer() {
    const input = document.getElementById('spelling-input');
    const userAnswer = input.value.trim().toLowerCase();
    const correctAnswer = currentSpellingWord.word.toLowerCase();
    
    const feedbackElement = document.querySelector('.spelling-feedback');
    
    if (userAnswer === correctAnswer) {
        feedbackElement.textContent = '拼寫正確！';
        feedbackElement.className = 'spelling-feedback correct';
        
        // 禁用輸入和檢查按鈕
        input.disabled = true;
        document.getElementById('spelling-check').disabled = true;
        
        // 顯示下一題按鈕
        document.getElementById('spelling-check').style.display = 'none';
        document.getElementById('spelling-show').style.display = 'none';
        document.getElementById('spelling-next').style.display = 'inline-block';
    } else {
        feedbackElement.textContent = '拼寫不正確，請再試一次';
        feedbackElement.className = 'spelling-feedback wrong';
    }
}

// 顯示拼寫答案
function showSpellingAnswer() {
    const input = document.getElementById('spelling-input');
    const feedbackElement = document.querySelector('.spelling-feedback');
    
    // 顯示正確答案
    input.value = currentSpellingWord.word;
    input.disabled = true;
    
    feedbackElement.textContent = `正確答案是: ${currentSpellingWord.word}`;
    feedbackElement.className = 'spelling-feedback';
    
    // 隱藏檢查和提示按鈕，顯示下一題按鈕
    document.getElementById('spelling-check').style.display = 'none';
    document.getElementById('spelling-show').style.display = 'none';
    document.getElementById('spelling-next').style.display = 'inline-block';
}

// 前往下一道拼寫題
function nextSpellingQuestion() {
    if (currentSpellingIndex < spellingWords.length - 1) {
        currentSpellingIndex++;
        showCurrentSpellingQuestion();
    } else {
        // 已經是最後一題
        showNotification('已完成所有拼寫練習');
        document.getElementById('start-review').style.display = 'block';
    }
}

// =================== 單字倉庫功能 ===================

// 加載單字倉庫內容
async function loadWarehouseWords(filter = 'learned') {
    try {
        const wordList = document.getElementById('word-list');
        wordList.innerHTML = '';
        
        // 根據過濾條件獲取單字
        const words = filter === 'learned' 
            ? await getWords(false, true)  // 只獲取已學會的單字
            : await getWords();  // 獲取所有單字
        
        if (words.length === 0) {
            wordList.innerHTML = '<li class="no-words">沒有單字</li>';
            return;
        }
        
        // 按字母順序排序
        words.sort((a, b) => a.word.localeCompare(b.word));
        
        // 創建單字列表
        words.forEach(word => createWordListItem(word, wordList, filter));
    } catch (error) {
        console.error('加載單字列表失敗:', error);
        showNotification('加載單字列表失敗');
    }
}

// 創建單字列表項
function createWordListItem(word, container, filter) {
    const li = document.createElement('li');
    
    const wordDetails = document.createElement('div');
    wordDetails.className = 'word-details';
    
    const wordEnglish = document.createElement('div');
    wordEnglish.className = 'word-english';
    wordEnglish.textContent = word.word;
    
    const wordTranslation = document.createElement('div');
    wordTranslation.className = 'word-translation';
    wordTranslation.textContent = word.translation;
    
    wordDetails.appendChild(wordEnglish);
    wordDetails.appendChild(wordTranslation);
    
    const wordActions = document.createElement('div');
    wordActions.className = 'word-actions';
    
    // 發音按鈕
    const pronounceButton = document.createElement('button');
    pronounceButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"></path>
        </svg>
    `;
    pronounceButton.title = '播放發音';
    pronounceButton.addEventListener('click', () => playWordPronunciation(word.word));
    
    // 學習狀態切換按鈕
    const toggleLearnedButton = document.createElement('button');
    if (word.learned) {
        toggleLearnedButton.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
            </svg>
        `;
        toggleLearnedButton.title = '已學會，點擊標記為學習中';
        toggleLearnedButton.addEventListener('click', async () => {
            await resetWordLearned(word.id);
            showNotification('已重置為學習中');
            updateStats();
            loadWarehouseWords(filter);
        });
    } else {
        toggleLearnedButton.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"></path>
            </svg>
        `;
        toggleLearnedButton.title = '學習中，點擊標記為已學會';
        toggleLearnedButton.addEventListener('click', async () => {
            await markWordAsLearned(word.id);
            showNotification('已標記為學會');
            updateStats();
            loadWarehouseWords(filter);
        });
    }
    
    // 刪除按鈕
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"></path>
        </svg>
    `;
    deleteButton.title = '刪除單字';
    deleteButton.addEventListener('click', async () => {
        if (confirm(`確定要刪除單字 "${word.word}" 嗎？`)) {
            await deleteWord(word.id);
            showNotification('單字已刪除');
            updateStats();
            loadWarehouseWords(filter);
        }
    });
    
    wordActions.appendChild(pronounceButton);
    wordActions.appendChild(toggleLearnedButton);
    wordActions.appendChild(deleteButton);
    
    li.appendChild(wordDetails);
    li.appendChild(wordActions);
    
    container.appendChild(li);
}

// 處理倉庫過濾按鈕點擊
function handleWarehouseFilterChange(e) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    
    e.target.classList.add('active');
    
    const filter = e.target.getAttribute('data-filter');
    loadWarehouseWords(filter);
}

// 搜尋倉庫中的單字
async function filterWarehouseWords() {
    const searchInput = document.getElementById('warehouse-search');
    const query = searchInput.value.trim();
    
    const activeFilter = document.querySelector('.filter-btn.active');
    const onlyLearned = activeFilter.getAttribute('data-filter') === 'learned';
    
    try {
        const words = await searchWords(query, onlyLearned);
        
        const wordList = document.getElementById('word-list');
        wordList.innerHTML = '';
        
        if (words.length === 0) {
            wordList.innerHTML = '<li class="no-words">沒有符合的單字</li>';
            return;
        }
        
        // 按字母順序排序
        words.sort((a, b) => a.word.localeCompare(b.word));
        
        // 創建單字列表
        const currentFilter = activeFilter.getAttribute('data-filter');
        words.forEach(word => createWordListItem(word, wordList, currentFilter));
    } catch (error) {
        console.error('搜尋單字失敗:', error);
    }
} 