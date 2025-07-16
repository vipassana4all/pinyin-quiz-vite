import { h } from 'preact';
import { useState } from 'preact/hooks';
import generateAnswers from './generateAnswers';

export default function Game({ mode, goHome }) {
    const [questionData, setQuestionData] = useState(generateAnswers());
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectCount, setIncorrectCount] = useState(0);

    function nextQuestion() {
        setSelectedAnswer(null);
        setQuestionData(generateAnswers());
    }

    function handleAnswerClick(choice) {
        setSelectedAnswer(choice);
        if (choice.id === questionData.question.id) {
            setCorrectCount(correctCount + 1);
            setTimeout(nextQuestion, 500);
        } else {
            setIncorrectCount(incorrectCount + 1);
            playAudio(choice.filename); // Воспроизводим звук неправильного ответа
        }
    }

    function playAudio(filename) {
        if (filename) {
            new Audio(`/sounds/${filename}`).play().catch(() => {});
        }
    }

    return (
        <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 relative">
            <button 
                class="absolute top-4 left-4 text-2xl bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                onClick={goHome}
            >🏠</button>
            <div class="mb-6">
                <button 
                    class="w-40 h-16 text-xl px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                    onClick={() => playAudio(questionData.question.filename)}
                >🔊 {selectedAnswer ? questionData.question.pinyin : '???'}
                </button>
            </div>
            <div class={mode === 'syllables' ? 'grid grid-cols-2 gap-4' : 'grid gap-4'}>
                {questionData.choices.map(choice => (
                    <button 
                        class={`w-40 h-16 text-xl px-6 py-3 rounded-lg font-medium border-2 transition-all 
                            ${selectedAnswer ? (choice.id === questionData.question.id ? 'bg-green-500 border-green-700 text-white' : choice.id === selectedAnswer.id ? 'bg-red-900 border-red-900 text-white' : 'bg-red-700 border-red-900 text-white') : 'bg-gray-800 border-gray-600 hover:bg-gray-700'}`}
                        onClick={() => handleAnswerClick(choice)}
                        disabled={selectedAnswer !== null}
                    >
                        {(selectedAnswer && selectedAnswer.id !== questionData.question.id && choice.id === questionData.question.id) ? '🔊 ' : (choice.id === selectedAnswer?.id ? '🔊 ' : '')}{choice.pinyin}
                    </button>
                ))}
            </div>
            <div class="mt-6">
                <button 
                    class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500"
                    onClick={nextQuestion}
                >
                    Следующий вопрос
                </button>
            </div>
        </div>
    );
}
