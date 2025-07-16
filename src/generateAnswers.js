// generateAnswers.js - Логика подбора вариантов

// Импортируем JSON с данными
import pinyinData from './pinyin_final_tones_fixed.json';

// Функция выбора случайного элемента из массива
function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Функция нахождения похожих слогов по инициалям, финалям или тону
function getSimilarSyllables(target, allData, count = 3) {
    let similar = allData.filter(item => {
        return item.final === target.final || item.initial === target.initial || item.tone === target.tone;
    });
    
    // Убираем точное совпадение и перемешиваем
    similar = similar.filter(item => item.pinyin !== target.pinyin);
    similar.sort(() => Math.random() - 0.5);
    
    return similar.slice(0, count);
}

// Главная функция генерации вариантов
function generateAnswers(num = 7) {
    const allData = pinyinData;
    const correctAnswer = getRandomItem(allData);
    const wrongAnswers = getSimilarSyllables(correctAnswer, allData, num);
    
    const choices = [correctAnswer, ...wrongAnswers];
    choices.sort(() => Math.random() - 0.5); // Перемешиваем
    
    const result = {
        question: correctAnswer,
        choices
//        choices: choices.map(choice => choice.pinyin),
//        q: correctAnswer,
//        a: choices
    };
    
//    console.log(result);
    return result;
}

// Экспортируем функцию
export default generateAnswers;
