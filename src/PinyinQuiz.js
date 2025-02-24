import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import generateAnswers from './generateAnswers';

export default function PinyinQuiz() {
    const [questionData, setQuestionData] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [userInteracted, setUserInteracted] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectCount, setIncorrectCount] = useState(0);
    const [mode, setMode] = useState('syllables'); // 'syllables' или 'tones'

    // Карта тонов для отображения значков
    const toneSymbols = ['ˉ', 'ˊ', 'ˇ', 'ˋ'];

    // Функция для воспроизведения аудио
    function playAudio(filename) {
        if (filename) {
            const audio = new Audio(`sounds/${filename}`);
            audio.play().catch(() => {}); // Игнорируем ошибки автоплея
        }
    }

    function startGame(selectedMode) {
        setMode(selectedMode);
        setUserInteracted(true);
        setCorrectCount(0);
        setIncorrectCount(0);
        const newQuestion = generateAnswers();
        setQuestionData(newQuestion);
        setTimeout(() => playAudio(newQuestion.question.filename), 100); // Проигрываем новый вопрос
    }

    function goHome() {
        setUserInteracted(false);
        setQuestionData(null);
        setSelectedAnswer(null);
    }

    function nextQuestion() {
        setSelectedAnswer(null);
        const newQuestion = generateAnswers();
        setQuestionData(newQuestion);
        setTimeout(() => playAudio(newQuestion.question.filename), 100); // Проигрываем новый вопрос
    }

    function handleAnswerClick(choice) {
        setSelectedAnswer(choice);
        if ((mode === 'syllables' && choice.id === questionData.question.id) || 
            (mode === 'tones' && choice === questionData.question.tone)) {
            setCorrectCount(correctCount + 1);
            setTimeout(nextQuestion, 500); // Авто-переход при правильном ответе
        } else {
            setIncorrectCount(incorrectCount + 1);
        }
    }

    return (
        <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 relative">
            {userInteracted && (
                <>
                    <div class="absolute top-4 right-4 flex space-x-4 text-2xl font-bold">
                        <span class="text-green-400">{correctCount}</span>
                        <span class="text-red-400">{incorrectCount}</span>
                    </div>
                    <button 
                        class="absolute top-4 left-4 text-2xl bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                        onClick={goHome}
                    >🏠</button>
                </>
            )}
            {!userInteracted ? (
                <div class="flex gap-4">
                    <button 
                        class="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                        onClick={() => startGame('syllables')}
                    >
                        Слоги
                    </button>
                    <button 
                        class="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                        onClick={() => startGame('tones')}
                    >
                        Тоны
                    </button>
                </div>
            ) : (
                <>
                    <div class="mb-6">
                        <button 
                            class="w-40 h-16 text-xl px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                            onClick={() => playAudio(questionData.question.filename)}
                        >🔊 {selectedAnswer ? questionData.question.pinyin : '???'}
                        </button>
                    </div>
                    <div class={mode === 'syllables' ? 'grid grid-cols-2 gap-4' : 'grid gap-4'} style={mode === 'tones' ? { gridTemplateColumns: '1fr' } : {}}>
                        {mode === 'syllables' ? (
                            questionData.choices.map(choice => (
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
                            ))
                        ) : (
                            [1, 2, 3, 4].map((tone, index) => (
                                <button 
                                    class={`w-40 h-16 text-3xl px-6 py-3 rounded-lg font-medium border-2 transition-all 
                                        ${selectedAnswer ? (tone === questionData.question.tone ? 'bg-green-500 border-green-700 text-white' : tone === selectedAnswer ? 'bg-red-900 border-red-900 text-white' : 'bg-red-700 border-red-900 text-white') : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}`}
                                    onClick={() => handleAnswerClick(tone)}
                                    disabled={selectedAnswer !== null}
                                >
                                    {toneSymbols[index]}
                                </button>
                            ))
                        )}
                    </div>
                    <div class="mt-6">
                        <button 
                            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
                            onClick={nextQuestion}
                        >
                            Следующий вопрос
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
