// 數據庫相關操作

// 數據庫名稱和版本
const DB_NAME = 'vocabularyDB';
const DB_VERSION = 1;

// 建立的儲存庫名稱
const WORDS_STORE = 'words';

// 數據庫連接
let db;

// 初始化數據庫
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        // 數據庫升級或創建時建立物件儲存庫
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // 檢查是否已存在單字儲存庫
            if (!db.objectStoreNames.contains(WORDS_STORE)) {
                // 創建單字儲存庫，並設置主鍵為自增的 id
                const store = db.createObjectStore(WORDS_STORE, { keyPath: 'id', autoIncrement: true });
                
                // 創建索引
                store.createIndex('word', 'word', { unique: true });
                store.createIndex('learned', 'learned', { unique: false });
                
                console.log('單字儲存庫創建成功');
            }
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('數據庫連接成功');
            resolve();
        };
        
        request.onerror = (event) => {
            console.error('數據庫連接失敗:', event.target.error);
            reject(event.target.error);
        };
    });
}

// 添加新單字
function addWord(word, translation, example = '') {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('數據庫未初始化'));
            return;
        }
        
        const transaction = db.transaction([WORDS_STORE], 'readwrite');
        const store = transaction.objectStore(WORDS_STORE);
        
        // 檢查單字是否已存在
        const index = store.index('word');
        const request = index.get(word);
        
        request.onsuccess = (event) => {
            if (event.target.result) {
                reject(new Error('單字已存在'));
                return;
            }
            
            // 添加新單字
            const newWord = {
                word: word,
                translation: translation,
                example: example,
                learned: false,
                createdAt: new Date().toISOString(),
                lastReviewed: null
            };
            
            const addRequest = store.add(newWord);
            
            addRequest.onsuccess = () => {
                resolve();
            };
            
            addRequest.onerror = (event) => {
                reject(event.target.error);
            };
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// 獲取單字列表
function getWords(onlyActive = false, onlyLearned = false) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('數據庫未初始化'));
            return;
        }
        
        const transaction = db.transaction([WORDS_STORE], 'readonly');
        const store = transaction.objectStore(WORDS_STORE);
        const request = store.getAll();
        
        request.onsuccess = (event) => {
            let words = event.target.result;
            
            // 根據參數過濾
            if (onlyActive) {
                words = words.filter(word => !word.learned);
            } else if (onlyLearned) {
                words = words.filter(word => word.learned);
            }
            
            resolve(words);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// 獲取隨機單字（用於複習）
function getRandomWords(count = 10, onlyActive = true) {
    return new Promise(async (resolve, reject) => {
        try {
            // 獲取所有單字
            const words = await getWords(onlyActive);
            
            if (words.length === 0) {
                resolve([]);
                return;
            }
            
            // 隨機排序單字
            const shuffled = [...words].sort(() => 0.5 - Math.random());
            
            // 返回指定數量的單字
            resolve(shuffled.slice(0, Math.min(count, shuffled.length)));
        } catch (error) {
            reject(error);
        }
    });
}

// 獲取單字統計
function getWordStats() {
    return new Promise(async (resolve, reject) => {
        try {
            const allWords = await getWords();
            const learnedWords = allWords.filter(word => word.learned);
            
            resolve({
                total: allWords.length,
                learned: learnedWords.length,
                active: allWords.length - learnedWords.length
            });
        } catch (error) {
            reject(error);
        }
    });
}

// 標記單字為已學會
function markWordAsLearned(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('數據庫未初始化'));
            return;
        }
        
        const transaction = db.transaction([WORDS_STORE], 'readwrite');
        const store = transaction.objectStore(WORDS_STORE);
        const request = store.get(id);
        
        request.onsuccess = (event) => {
            const word = event.target.result;
            if (!word) {
                reject(new Error('單字不存在'));
                return;
            }
            
            word.learned = true;
            word.lastReviewed = new Date().toISOString();
            
            const updateRequest = store.put(word);
            
            updateRequest.onsuccess = () => {
                resolve();
            };
            
            updateRequest.onerror = (event) => {
                reject(event.target.error);
            };
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// 重置單字為未學會
function resetWordLearned(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('數據庫未初始化'));
            return;
        }
        
        const transaction = db.transaction([WORDS_STORE], 'readwrite');
        const store = transaction.objectStore(WORDS_STORE);
        const request = store.get(id);
        
        request.onsuccess = (event) => {
            const word = event.target.result;
            if (!word) {
                reject(new Error('單字不存在'));
                return;
            }
            
            word.learned = false;
            
            const updateRequest = store.put(word);
            
            updateRequest.onsuccess = () => {
                resolve();
            };
            
            updateRequest.onerror = (event) => {
                reject(event.target.error);
            };
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// 刪除單字
function deleteWord(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('數據庫未初始化'));
            return;
        }
        
        const transaction = db.transaction([WORDS_STORE], 'readwrite');
        const store = transaction.objectStore(WORDS_STORE);
        const request = store.delete(id);
        
        request.onsuccess = () => {
            resolve();
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// 搜尋單字
function searchWords(query, onlyLearned = false) {
    return new Promise(async (resolve, reject) => {
        try {
            const words = await getWords(false, onlyLearned);
            
            if (!query || query.trim() === '') {
                resolve(words);
                return;
            }
            
            const lowerQuery = query.toLowerCase().trim();
            
            // 過濾出符合查詢的單字
            const filtered = words.filter(word => 
                word.word.toLowerCase().includes(lowerQuery) || 
                word.translation.includes(lowerQuery)
            );
            
            resolve(filtered);
        } catch (error) {
            reject(error);
        }
    });
} 