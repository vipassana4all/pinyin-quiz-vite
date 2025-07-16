import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import generateAnswers from './generateAnswers';
import hskData from './hsk2.json';
import telegramApp from './telegram.js';

export default function PinyinQuiz() {
    const [questionData, setQuestionData] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [userInteracted, setUserInteracted] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectCount, setIncorrectCount] = useState(0);
    const [mode, setMode] = useState('syllables'); // 'syllables', 'tones', 'hsk', 'hsk_game'
    const [selectedLevels, setSelectedLevels] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false, 6: false });
    const [totalSelectedWords, setTotalSelectedWords] = useState(0);
    const [numChoices, setNumChoices] = useState(6); // Кол-во вариантов ответа (включая правильный)
    const [questionFormat, setQuestionFormat] = useState('pinyin_rus'); // Формат вопроса
    const [answerFormat, setAnswerFormat] = useState('hanzi'); // Формат ответа

    // Карта тонов для отображения значков
    const toneSymbols = ['ˉ', 'ˊ', 'ˇ', 'ˋ'];

    // Подсчет количества слов для каждого уровня
    const levelCounts = {}; // [Source 6]
    try {
        if (Array.isArray(hskData)) { // Проверяем, что hskData это массив
            for (let level = 1; level <= 6; level++) { // [Source 7]
                levelCounts[level] = hskData.filter(word => word && Number(word.level) === level).length;
            }
            // Можно оставить console.log для проверки в консоли
            console.log('Подсчитанные уровни:', levelCounts);
        } else {
             console.error('Ошибка: hskData не является массивом!');
             for (let level = 1; level <= 6; level++) { levelCounts[level] = 0; }
        }
    } catch (error) {
         console.error('Ошибка при подсчете слов по уровням:', error);
         for (let level = 1; level <= 6; level++) { levelCounts[level] = 0; }
    }

    // Пересчитываем общее количество выбранных слов при изменении выбранных уровней
    useEffect(() => {
        calculateTotalSelectedWords();
    }, [selectedLevels]);

    // Telegram WebApp initialization
    useEffect(() => {
        if (telegramApp.isInTelegram) {
            console.log('Running in Telegram WebApp');
            
            // Set up back button for game modes
            if (userInteracted) {
                telegramApp.showBackButton(() => {
                    telegramApp.hapticFeedback('light');
                    goHome();
                });
            } else {
                telegramApp.hideBackButton();
            }
        }
    }, [userInteracted]);

    // Update Telegram back button when mode changes
    useEffect(() => {
        if (telegramApp.isInTelegram && userInteracted) {
            telegramApp.showBackButton(() => {
                telegramApp.hapticFeedback('light');
                goHome();
            });
        }
    }, [mode]);

    function calculateTotalSelectedWords() {
        let total = 0;
        for (let level = 1; level <= 6; level++) {
            if (selectedLevels[level]) {
                total += levelCounts[level] || 0;
            }
        }
        setTotalSelectedWords(total);
    }
    
    function formatAudioFilename(id) {
        return `hsk2/${String(id).padStart(4, '0')}.mp3`;
    }

    // Функция для воспроизведения аудио
    function playAudio(filename) {
        if (filename) {
            const audio = new Audio(`sounds/${filename}`);
            audio.play().catch(() => {}); // Игнорируем ошибки автоплея
        }
    }

    function getFilteredHskWords() {
        return hskData.filter(entry => selectedLevels[Number(entry.level)]); // Используем Number() на всякий случай
    }
    
    function generateHskQuestion(wordPool, numChoices) {
        if (!wordPool || wordPool.length === 0) return null; // Нет слов для игры

        // Выбираем случайное слово для вопроса
        const questionWordIndex = Math.floor(Math.random() * wordPool.length);
        const questionWord = wordPool[questionWordIndex];

        // Формируем вопрос
        const question = {
            ...questionWord, // Копируем все данные слова
            filename: formatAudioFilename(questionWord.id), // Добавляем имя файла
            displayText: formatDisplayText(questionWord, questionFormat) // Добавляем отформатированный текст
        };

        // Функция для получения умных дистракторов
        function getSmartDistractors(correctWord, allWords, needed) {
            const distractors = allWords.filter(word => word.id !== correctWord.id);
            
            // Приоритизируем дистракторы по схожести
            const scoredDistractors = distractors.map(word => {
                let score = 0;
                
                // Схожесть по уровню HSK (слова того же уровня более похожи)
                if (word.level === correctWord.level) score += 3;
                
                // Схожесть по длине пиньинь
                if (Math.abs(word.pinyin.length - correctWord.pinyin.length) <= 1) score += 2;
                
                // Схожесть по первому символу пиньинь (похожие звуки)
                if (word.pinyin[0] === correctWord.pinyin[0]) score += 2;
                
                // Схожесть по тону (последний символ пиньинь часто содержит тон)
                const correctTone = correctWord.pinyin.slice(-1);
                const wordTone = word.pinyin.slice(-1);
                if (correctTone === wordTone && /[1-4]/.test(correctTone)) score += 1;
                
                // Схожесть по количеству иероглифов
                if (word.hanzi.length === correctWord.hanzi.length) score += 1;
                
                // Добавляем случайность для разнообразия
                score += Math.random() * 2;
                
                return { word, score };
            });
            
            // Сортируем по убыванию схожести и берем нужное количество
            scoredDistractors.sort((a, b) => b.score - a.score);
            
            // Берем только 20% лучших кандидатов, но минимум нужное количество + 2 для выбора
            const minCandidates = Math.max(needed + 2, 4); // Минимум 4 кандидата или needed + 2
            const topPercentage = Math.max(minCandidates, Math.floor(scoredDistractors.length * 0.2));
            const topCandidates = scoredDistractors.slice(0, topPercentage);
            const selected = [];
            
            while (selected.length < needed && topCandidates.length > 0) {
                const randomIndex = Math.floor(Math.random() * topCandidates.length);
                selected.push(topCandidates.splice(randomIndex, 1)[0].word);
            }
            
            return selected;
        }

        // Формируем варианты ответов с умными дистракторами
        const choices = [questionWord]; // Начинаем с правильного ответа
        const numDistractorsNeeded = Math.min(numChoices - 1, wordPool.length - 1);
        
        if (numDistractorsNeeded > 0) {
            const smartDistractors = getSmartDistractors(questionWord, wordPool, numDistractorsNeeded);
            choices.push(...smartDistractors);
        }

        // Перемешиваем варианты ответов
        for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
        }

        // Форматируем варианты ответов согласно выбранному формату
        const formattedChoices = choices.map(c => ({ 
            id: c.id, 
            displayText: formatDisplayText(c, answerFormat),
            ...c // Сохраняем все данные для возможного использования
        }));

        return { question, choices: formattedChoices };
    }

    function startGame(selectedMode) {
        // Проверка для HSK режимов
        if ((selectedMode === 'hsk' || selectedMode === 'hsk_game') && totalSelectedWords === 0) {
            alert('Пожалуйста, выберите хотя бы один уровень HSK');
            return;
        }
        
        // Haptic feedback for button press
        telegramApp.hapticFeedback('light');
        
        setMode(selectedMode);
        setUserInteracted(true);
        setSelectedAnswer(null); // Сброс выбранного ответа
        setCorrectCount(0); // Сброс счетчиков для новых игр
        setIncorrectCount(0);

        if (selectedMode === 'hsk') {
            // Режим показа таблицы HSK
            setQuestionData(null);
        } else if (selectedMode === 'hsk_game') {
            // Режим игры HSK
            const filteredWords = getFilteredHskWords();
            const newQuestion = generateHskQuestion(filteredWords, numChoices);
            setQuestionData(newQuestion);
            if (newQuestion) {
                 setTimeout(() => playAudio(newQuestion.question.filename), 100);
            } else {
                alert("Недостаточно слов в выбранных уровнях для начала игры.");
                goHome(); // Возврат в меню, если слов нет
            }
        } else {
            // Режимы Слоги / Тоны
            const newQuestion = generateAnswers(); // Предполагаем, что generateAnswers создает вопрос для слогов/тонов
            setQuestionData(newQuestion);
            // Убедись, что generateAnswers возвращает объект с полем question.filename
            if (newQuestion && newQuestion.question && newQuestion.question.filename) {
                 setTimeout(() => playAudio(newQuestion.question.filename), 100);
            }
        }
    }

    function goHome() {
        setUserInteracted(false);
        setQuestionData(null);
        setSelectedAnswer(null);
    }

    function nextQuestion() {
        setSelectedAnswer(null);
        let newQuestion = null;
        let filename = null;

        if (mode === 'syllables' || mode === 'tones') {
            newQuestion = generateAnswers(); // Предполагаем, что эта функция возвращает нужный формат
            if (newQuestion && newQuestion.question) {
                filename = newQuestion.question.filename; // Получаем имя файла
            }
        } else if (mode === 'hsk_game') {
            const filteredWords = getFilteredHskWords();
            newQuestion = generateHskQuestion(filteredWords, numChoices);
            if (newQuestion && newQuestion.question) {
                filename = newQuestion.question.filename; // Получаем имя файла
            }
        }

        setQuestionData(newQuestion);
        if (filename) {
            setTimeout(() => playAudio(filename), 100);
        } else if (mode === 'hsk_game' && !newQuestion) {
             alert("Недостаточно слов в выбранных уровнях для продолжения игры.");
             goHome();
        }
    }

    function handleAnswerClick(choice) {
         if (selectedAnswer !== null) return; // Не реагируем, если ответ уже выбран

        setSelectedAnswer(choice); // Сохраняем выбор пользователя

        let isCorrect = false;
        if (mode === 'syllables' && choice.id === questionData.question.id) {
            isCorrect = true;
        } else if (mode === 'tones' && choice === questionData.question.tone) {
            isCorrect = true;
        } else if (mode === 'hsk_game' && choice.id === questionData.question.id) {
            isCorrect = true;
        }

        if (isCorrect) {
            telegramApp.hapticFeedback('success');
            setCorrectCount(correctCount + 1);
            setTimeout(nextQuestion, 800); // Задержка перед следующим вопросом чуть больше
        } else {
            telegramApp.hapticFeedback('error');
            setIncorrectCount(incorrectCount + 1);
            // Не переходим автоматически при ошибке
        }
    }

    function handleLevelChange(level) {
        const newSelectedLevels = { ...selectedLevels };
        newSelectedLevels[level] = !newSelectedLevels[level];
        
        // Проверяем, что хотя бы один уровень выбран
        const anySelected = Object.values(newSelectedLevels).some(selected => selected);
        
        if (anySelected) {
            setSelectedLevels(newSelectedLevels);
        } else {
            alert('Должен быть выбран хотя бы один уровень');
        }
    }

    // Функции для работы с форматами вопросов и ответов
    function getFormatOptions() {
        return [
            { value: 'hanzi', label: 'Иероглифы (汉字)' },
            { value: 'pinyin', label: 'Пиньинь (pīnyīn)' },
            { value: 'rus', label: 'Русский перевод' },
            { value: 'hanzi_pinyin', label: 'Иероглифы + Пиньинь' },
            { value: 'hanzi_rus', label: 'Иероглифы + Русский' },
            { value: 'pinyin_rus', label: 'Пиньинь + Русский' }
        ];
    }

    function getFormatComponents(format) {
        // Extract individual components from a format
        switch (format) {
            case 'hanzi':
                return ['hanzi'];
            case 'pinyin':
                return ['pinyin'];
            case 'rus':
                return ['rus'];
            case 'hanzi_pinyin':
                return ['hanzi', 'pinyin'];
            case 'hanzi_rus':
                return ['hanzi', 'rus'];
            case 'pinyin_rus':
                return ['pinyin', 'rus'];
            default:
                return [];
        }
    }

    function getAvailableAnswerFormats(questionFormat) {
        const allFormats = getFormatOptions();
        const questionComponents = getFormatComponents(questionFormat);
        
        // Filter out formats that share any component with the question format
        return allFormats.filter(format => {
            const answerComponents = getFormatComponents(format.value);
            // Check if there's any overlap between question and answer components
            return !questionComponents.some(qComp => answerComponents.includes(qComp));
        });
    }

    function formatDisplayText(word, format) {
        switch (format) {
            case 'hanzi':
                return word.hanzi;
            case 'pinyin':
                return word.pinyin;
            case 'rus':
                return word.rus.join(', ');
            case 'hanzi_pinyin':
                return `${word.hanzi}\n${word.pinyin}`;
            case 'hanzi_rus':
                return `${word.hanzi}\n${word.rus.join(', ')}`;
            case 'pinyin_rus':
                return `${word.pinyin}\n${word.rus.join(', ')}`;
            default:
                return word.hanzi;
        }
    }

    // Компоненты

// --- Обновляем HomeMenu ---
 function HomeMenu({
     startGame,
     selectedLevels, handleLevelChange, levelCounts, totalSelectedWords,
     numChoices, setNumChoices, // Добавляем новые пропсы
     questionFormat, setQuestionFormat, answerFormat, setAnswerFormat
    }) {
     const canStartHsk = totalSelectedWords > 0;
     const choiceOptions = [4, 6, 8, 10, 12]; // Возможные варианты кол-ва ответов

     const handleChoiceChange = (event) => {
         setNumChoices(Number(event.target.value)); // Обновляем состояние при выборе
     };

     const handleQuestionFormatChange = (event) => {
         const newQuestionFormat = event.target.value;
         setQuestionFormat(newQuestionFormat);
         
         // Автоматически обновляем формат ответа, если он совпадает с вопросом
         const availableAnswerFormats = getAvailableAnswerFormats(newQuestionFormat);
         if (availableAnswerFormats.length > 0 && !availableAnswerFormats.find(f => f.value === answerFormat)) {
             setAnswerFormat(availableAnswerFormats[0].value);
         }
     };

     const handleAnswerFormatChange = (event) => {
         setAnswerFormat(event.target.value);
     };

     return (
         <div class="flex flex-col items-center gap-8 max-w-md">
             <h1 class="text-4xl font-bold mb-2">Pinyin</h1>
             {/* Кнопки Слоги/Тоны */}
             <div class="flex gap-4">
                 <button class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-lg" onClick={() => startGame('syllables')}>Слоги</button>
                 <button class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-lg" onClick={() => startGame('tones')}>Тоны</button>
             </div>

             {/* ===== Блок HSK (Изменен) ===== */}
             <div class="w-full border-t border-gray-700 pt-6 mt-4"> {/* Добавлен разделитель и отступ */}
                 <h2 class="text-2xl font-bold mb-4 text-center">HSK 2</h2>

                 {/* Кнопка Список слов (остается сверху) */}
                 <div class="mb-6">
                      <button
                         class="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 text-lg"
                         onClick={() => startGame('hsk')}
                     >
                         Список слов HSK
                     </button>
                  </div>

                 {/* Выбор уровней */}
                 <h3 class="text-xl font-bold mb-2">1. Выберите уровень:</h3>
                 <div class="grid grid-cols-2 gap-3 mb-6"> {/* Увеличен нижний отступ */}
                     {Object.keys(levelCounts).sort((a, b) => a - b).map(level => (
                         <div key={level} class="flex items-center bg-gray-800 p-2 rounded">
                             {/* ... input и label для чекбокса уровня ... */}
                            <input
                                 type="checkbox"
                                 id={`level-${level}`}
                                 checked={!!selectedLevels[level]}
                                 onChange={() => handleLevelChange(Number(level))}
                                 class="mr-2 h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                             />
                             <label htmlFor={`level-${level}`} class="text-sm font-medium text-gray-300 cursor-pointer">
                                 Уровень {level} ({levelCounts[level] || 0})
                             </label>
                         </div>
                     ))}
                 </div>

                 {/* --- БЛОК: Выбор количества вариантов --- */}
                  <h3 class="text-xl font-bold mb-2">2. Количество вариантов ответа:</h3>
                  <div class="mb-6">
                      <select
                         value={numChoices}
                         onChange={handleChoiceChange}
                         class="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500"
                       >
                         {choiceOptions.map(option => (
                             <option key={option} value={option}>
                                 {option} варианта
                             </option>
                         ))}
                      </select>
                  </div>
                 {/* --- КОНЕЦ БЛОКА --- */}

                 {/* --- НОВЫЙ БЛОК: Выбор формата вопроса и ответа --- */}
                 <h3 class="text-xl font-bold mb-2">3. Формат вопроса и ответа:</h3>
                 <div class="mb-4">
                     <label class="block text-sm font-medium text-gray-300 mb-2">Что показывать в вопросе:</label>
                     <select
                         value={questionFormat}
                         onChange={handleQuestionFormatChange}
                         class="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500"
                     >
                         {getFormatOptions().map(option => (
                             <option key={option.value} value={option.value}>
                                 {option.label}
                             </option>
                         ))}
                     </select>
                 </div>
                 <div class="mb-6">
                     <label class="block text-sm font-medium text-gray-300 mb-2">Что показывать в вариантах ответа:</label>
                     <select
                         value={answerFormat}
                         onChange={handleAnswerFormatChange}
                         class="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-blue-500 focus:border-blue-500"
                     >
                         {getAvailableAnswerFormats(questionFormat).map(option => (
                             <option key={option.value} value={option.value}>
                                 {option.label}
                             </option>
                         ))}
                     </select>
                 </div>
                 {/* --- КОНЕЦ НОВОГО БЛОКА --- */}

                 {/* Отображение кол-ва выбранных слов */}
                 <div class="text-xl text-center font-semibold mb-6 bg-gray-800 p-3 rounded-lg"> {/* Убран font-bold, добавлен нижний отступ */}
                     Всего для игры выбрано: {totalSelectedWords} слов
                 </div>

                 {/* --- КНОПКА ИГРАТЬ (Перенесена вниз) --- */}
                 <div class="mt-4"> {/* Добавлен верхний отступ */}
                    <button
                         class={`w-full px-6 py-4 text-white rounded-lg text-xl font-bold ${canStartHsk ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 cursor-not-allowed'}`}
                        onClick={() => canStartHsk && startGame('hsk_game')}
                        disabled={!canStartHsk}
                    >
                        Играть (HSK)
                    </button>
                 </div>
                 {/* --- КОНЕЦ КНОПКИ ИГРАТЬ --- */}

             </div>
             {/* ===== Конец блока HSK ===== */}
         </div>
     );
 }
 // ---
 // ---
// ScoreDisplay component shows the current score (correct/incorrect answers) in the top right corner
function ScoreDisplay({ correctCount, incorrectCount }) {
        return (
            <div class="absolute top-4 right-4 flex space-x-4 text-2xl font-bold">
                <span class="text-green-400">{correctCount}</span>
                <span class="text-red-400">{incorrectCount}</span>
            </div>
        );
    }

    function HomeButton({ goHome }) {
        // Hide home button in Telegram since we have native back button
        if (telegramApp.isInTelegram) {
            return null;
        }
        
        return (
            <button 
                class="absolute top-4 left-4 text-2xl bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                onClick={() => {
                    telegramApp.hapticFeedback('light');
                    goHome();
                }}
            >🏠</button>
        );
    }

    function QuestionAudio({ questionData, selectedAnswer, playAudio }) {
        let displayText = '???';
        
        if (questionData && questionData.question) {
            if(mode === 'hsk_game') {
                // Всегда показываем выбранный формат вопроса (не меняем после ответа)
                displayText = questionData.question.displayText || '???';
            } else {
                displayText = questionData.question.pinyin; // Для слогов/тонов
            }
        }

        // Обработка многострочного текста
        const textLines = displayText.split('\n');

        return (
            <div class="mb-6">
                <button
                    class="w-auto h-auto text-xl px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center justify-center min-w-[160px] min-h-[64px] whitespace-pre-line"
                    onClick={() => playAudio(questionData?.question?.filename)}
                    disabled={!questionData?.question?.filename}
                >
                    <span class="mr-2">🔊</span>
                    <div class="text-center">
                        {textLines.map((line, index) => (
                            <div key={index} class={index === 0 && textLines.length > 1 ? 'text-2xl mb-1' : 'text-lg'}>
                                {line}
                            </div>
                        ))}
                    </div>
                </button>
            </div>
        );
    }

    function SyllablesGame({ questionData, selectedAnswer, handleAnswerClick, playAudio }) {
        return (
            <div class="grid grid-cols-2 gap-4">
                {questionData.choices.map(choice => (
                    <button 
                        class={`w-40 h-16 text-xl px-6 py-3 rounded-lg font-medium border-2 transition-all 
                            ${selectedAnswer ? (choice.id === questionData.question.id ? 'bg-green-500 border-green-700 text-white' : choice.id === selectedAnswer.id ? 'bg-red-900 border-red-900 text-white' : 'bg-red-700 border-red-900 text-white') : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}`}
                        onClick={() => {
                            if (selectedAnswer === null) {
                                handleAnswerClick(choice);
                            } else if (choice.id === selectedAnswer.id || choice.id === questionData.question.id) {
                                playAudio(choice.filename);
                            }
                        }}
                        disabled={selectedAnswer !== null && choice.id !== selectedAnswer.id && choice.id !== questionData.question.id}
                    >
                        {(selectedAnswer && selectedAnswer.id !== questionData.question.id && choice.id === questionData.question.id) ? '🔊 ' : (choice.id === selectedAnswer?.id ? '🔊 ' : '')}{choice.pinyin}
                    </button>
                ))}
            </div>
        );
    }

    function TonesGame({ questionData, selectedAnswer, handleAnswerClick }) {
        return (
            <div class="grid gap-4" style={{ gridTemplateColumns: '1fr' }}>
                {[1, 2, 3, 4].map((tone, index) => (
                    <button 
                        class={`w-40 h-16 text-3xl px-6 py-3 rounded-lg font-medium border-2 transition-all 
                            ${selectedAnswer ? (tone === questionData.question.tone ? 'bg-green-500 border-green-700 text-white' : tone === selectedAnswer ? 'bg-red-900 border-red-900 text-white' : 'bg-red-700 border-red-900 text-white') : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}`}
                        onClick={() => handleAnswerClick(tone)}
                        disabled={selectedAnswer !== null}
                    >
                        {toneSymbols[index]}
                    </button>
                ))}
            </div>
        );
    }

    function HSKTable() {
        // Фильтруем данные по выбранным уровням
        const filteredData = hskData;//.filter(entry => selectedLevels[entry.level]);

        return (
            <div class="overflow-auto max-w-4xl w-full bg-gray-800 p-4 rounded-lg">
                <div class="mb-4 text-center">
                    <span class="text-xl font-bold">Показано слов: {filteredData.length}</span>
                </div>
                <table class="w-full border-collapse border border-gray-700 text-white">
                    <thead>
                        <tr class="bg-gray-700">
                            <th class="border border-gray-600 p-2">Level</th>
                            <th class="border border-gray-600 p-2">ID</th>
                            <th class="border border-gray-600 p-2">Hanzi</th>
                            <th class="border border-gray-600 p-2">Pinyin</th>
                            <th class="border border-gray-600 p-2">Русский</th>
                            <th class="border border-gray-600 p-2">🔊</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(entry => (
                            <tr key={entry.id} class="odd:bg-gray-900 even:bg-gray-800">
                                <td class="border border-gray-600 p-2 text-center">{entry.level}</td>
                                <td class="border border-gray-600 p-2 text-center">{entry.id}</td>
                                <td class="border border-gray-600 p-2 text-center min-w-[140px] text-3xl font-sans leading-relaxed">{entry.hanzi}</td>
                                <td class="border border-gray-600 p-2 text-center text-xl">{entry.pinyin}</td>
                                <td class="border border-gray-600 p-2">{entry.rus.join('; ')}</td>
                                <td class="border border-gray-600 p-2 text-center">
                                    <button 
                                        class="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
                                        onClick={() => playAudio(formatAudioFilename(entry.id))}
                                    >
                                        🔊
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    function HskGame({ questionData, selectedAnswer, handleAnswerClick }) {
        if (!questionData) return null; // Не рендерим, если нет данных

        // Функция для обрезки длинного текста
        function truncateText(text, maxLength = 20) {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength - 3) + '...';
        }

        return (
            <div class="grid grid-cols-2 gap-4">
                {questionData.choices.map(choice => {
                    const isCorrectChoice = selectedAnswer && choice.id === questionData.question.id;
                    const isSelectedChoice = selectedAnswer && choice.id === selectedAnswer.id;
                    const isIncorrectSelected = selectedAnswer && isSelectedChoice && !isCorrectChoice;

                    let buttonClass = 'bg-gray-800 border-gray-600 hover:bg-gray-700'; // Default
                     if (selectedAnswer) {
                        if (isCorrectChoice) {
                            buttonClass = 'bg-green-500 border-green-700 text-white'; // Correct answer
                        } else if (isIncorrectSelected) {
                            buttonClass = 'bg-red-700 border-red-900 text-white'; // Incorrect selected
                        } else { // Revealed but not selected, and incorrect
                            buttonClass = 'bg-gray-700 border-gray-800 text-gray-400 opacity-60'; // Dim others
                        }
                    }

                    // Обработка многострочного текста для ответов с обрезкой
                    const textLines = choice.displayText.split('\n').map(line => truncateText(line));

                    return (
                        <button
                            key={choice.id}
                            class={`min-w-[160px] max-w-[200px] min-h-[80px] px-4 py-3 rounded-lg font-medium border-2 transition-all flex justify-center items-center ${buttonClass}`}
                            onClick={() => handleAnswerClick(choice)}
                            disabled={selectedAnswer !== null} // Блокируем после ответа
                            title={choice.displayText} // Показываем полный текст при наведении
                        >
                            <div class="text-center overflow-hidden">
                                {textLines.map((line, index) => (
                                    <div key={index} class={`${index === 0 && textLines.length > 1 ? 'text-xl mb-1' : 'text-base'} leading-tight`}>
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>
        );
    }

    // Основной рендер
    return (
        <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 relative">
            {/* Отображение счета и кнопки "Домой" для всех игровых режимов */}
            {userInteracted && mode !== 'hsk' && ( // Не показываем счет в режиме таблицы
                <>
                    <ScoreDisplay correctCount={correctCount} incorrectCount={incorrectCount} />
                    <HomeButton goHome={goHome} />
                </>
            )}
             {/* Отображение кнопки "Домой" для режима таблицы HSK */}
            {userInteracted && mode === 'hsk' && (
                <HomeButton goHome={goHome} />
            )}


            {!userInteracted ? (
                <HomeMenu
                    startGame={startGame}
                    selectedLevels={selectedLevels}
                    handleLevelChange={handleLevelChange}
                    levelCounts={levelCounts}
                    totalSelectedWords={totalSelectedWords}
                    numChoices={numChoices}
                    setNumChoices={setNumChoices}
                    questionFormat={questionFormat}
                    setQuestionFormat={setQuestionFormat}
                    answerFormat={answerFormat}
                    setAnswerFormat={setAnswerFormat}
                />
            ) : mode === 'hsk' ? (
                // Режим таблицы HSK
                <HSKTable />
            ) : (
                 // Все игровые режимы (Слоги, Тоны, HSK Игра)
                <>
                    {questionData ? (
                        <>
                             <QuestionAudio
                                questionData={questionData}
                                selectedAnswer={selectedAnswer}
                                playAudio={playAudio}
                            />

                            {mode === 'syllables' && (
                                <SyllablesGame
                                    questionData={questionData}
                                    selectedAnswer={selectedAnswer}
                                    handleAnswerClick={handleAnswerClick}
                                    playAudio={playAudio} // Передаем playAudio, если нужно
                                />
                            )}
                            {mode === 'tones' && (
                                <TonesGame
                                    questionData={questionData}
                                    selectedAnswer={selectedAnswer}
                                    handleAnswerClick={handleAnswerClick}
                                />
                            )}
                            {mode === 'hsk_game' && (
                                <HskGame
                                    questionData={questionData}
                                    selectedAnswer={selectedAnswer}
                                    handleAnswerClick={handleAnswerClick}
                                />
                            )}

                            {/* Кнопка "Следующий вопрос" только если ответ неверный или еще не дан */}
                             {selectedAnswer && !(mode === 'hsk_game' && selectedAnswer.id === questionData.question.id) && !(mode === 'syllables' && selectedAnswer.id === questionData.question.id) && !(mode === 'tones' && selectedAnswer === questionData.question.tone) && (
                                <div class="mt-6">
                                     <button
                                        class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
                                        onClick={nextQuestion}
                                    >
                                        Следующий вопрос
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                         // Сообщение, если вопрос не загрузился (маловероятно, но на всякий случай)
                         <p>Загрузка вопроса...</p>
                    )}
                 </>
            )}
        </div>
    );
}