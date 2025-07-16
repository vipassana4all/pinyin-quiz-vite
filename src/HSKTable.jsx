import { h } from 'preact';
import hskData from './hsk2.json';

export default function HSKTable({ goHome }) {
    function formatAudioFilename(id) {
        return `hsk2/${String(id).padStart(4, '0')}.mp3`;
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
            <div class="overflow-auto max-w-4xl w-full bg-gray-800 p-4 rounded-lg">
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
                        {hskData.map(entry => (
                            <tr key={entry.id} class="odd:bg-gray-900 even:bg-gray-800">
                                <td class="border border-gray-600 p-2 text-center">{entry.level}</td>
                                <td class="border border-gray-600 p-2 text-center">{entry.id}</td>
                                <td class="border border-gray-600 p-2 text-center">{entry.hanzi}</td>
                                <td class="border border-gray-600 p-2 text-center">{entry.pinyin}</td>
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
        </div>
    );
}
