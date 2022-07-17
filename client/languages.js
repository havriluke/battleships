const textContents = {
    '.title': {
        'en': 'Battleships',
        'ua': 'Морський бій'
    },
    '.online-now .text': {
        'en': 'Online: ',
        'ua': 'Зараз онлайн: '
    },
    '.game-mode-description-public .bold': {
        'en': 'Public room.',
        'ua': 'Публічна кімната.'
    },
    '.game-mode-description-public .reg': {
        'en': ' A game with a random player',
        'ua': ' Гра з випадковим суперником'
    },
    '.game-mode-description-private .bold': {
        'en': 'Private room.',
        'ua': 'Приватна кімната.'
    },
    '.game-mode-description-private .reg': {
        'en': ' Entry to the room is possible only with the room code',
        'ua': ' Вхід у кімнату можливий тільки за допомогою коду кімнати'
    },
    '.game-mode-description-single .bold': {
        'en': 'A room with bot.',
        'ua': 'Кімната з ботом.'
    },
    '.game-mode-description-single .reg': {
        'en': ' You will face a bot, instead of a real opponent',
        'ua': ' Замість реального суперника вам протистоятиме бот'
    },
    '.random-room-button': {
        'en': 'Random game',
        'ua': 'Випадкова гра'
    },
    '.create-room-button': {
        'en': 'Create room',
        'ua': 'Створити кімнату'
    },
    '.join-room-button': {
        'en': 'Join room',
        'ua': 'Приєднатися'
    },
    '.play-offline-button': {
        'en': 'Play offline',
        'ua': 'Грати оффлайн'
    },
    '.game-code-cont .text': {
        'en': 'Room code:',
        'ua': 'Код кімнати: '
    },
    '.ready': {
        'en': 'Ready',
        'ua': 'Готовий'
    },
    '.user-container span': {
        'en': 'your board',
        'ua': 'ваша сітка'
    },
    '.enemy-container span': {
        'en': 'enemy board',
        'ua': 'ворожа сітка'
    },
    '.rotate': {
        'en': 'Rotate',
        'ua': 'Обернути'
    },
    '.set-ship': {
        'en': 'Set ship',
        'ua': 'Поставити'
    },
    '.start': {
        'en': 'Ready',
        'ua': 'Готовність'
    },
    '.play-again': {
        'en': 'Play again',
        'ua': 'Грати знову'
    },
    '.exit-room': {
        'en': 'Exit',
        'ua': 'Вийти'
    },
    '#info': {
        'en': 'Place ships',
        'ua': 'Розставте кораблі'
    },
}

const placeholders = {
    '#nickname': {
        'en': 'Nickname',
        'ua': 'Нікнейм'
    },
    '#join-room-code-input': {
        'en': 'Room code',
        'ua': 'Код кімнати'
    }
}

export const innerHtmls = {
    'errorLabel': [
        {'en': 'Enter a nickname first',
         'ua': 'Введіть спочатку нікнейм'},
         {'en': 'Enter the room code',
         'ua': 'Введіть код кімнати'},
         {'en': 'The room is not available',
         'ua': 'Кімната недоступна'},
         {'en': 'The nickname is not available',
         'ua': 'Нікнейм недоступний'},
    ],
    'turnDisplay': [
        {'en': 'Your turn',
         'ua': 'Ваш хід'},
         {'en': 'Enemy turn',
         'ua': 'Хід суперника'},
         {'en': 'Victory!',
         'ua': 'Перемога!'},
         {'en': 'Defeat.',
         'ua': 'Поразка.'},
    ],
    'infoDisplay': [
        {'en': 'Place ships',
         'ua': 'Розставте кораблі'},
        {'en': 'You have sunk an enemy single deck ship',
         'ua': 'Ви потопили однопалубний ворожий корабель'},
        {'en': 'You have sunk an enemy double deck ship',
         'ua': 'Ви потопили двопалубний ворожий корабель'},
        {'en': 'You have sunk an enemy three deck ship',
         'ua': 'Ви потопили трипалубний ворожий корабель'},
        {'en': 'You have sunk an enemy four deck ship',
         'ua': 'Ви потопили чотирипалубний ворожий корабель'},
        {'en': 'has sunk your single deck ship',
         'ua': 'потопив ваш однопалубний корабель'},
        {'en': 'has sunk your double deck ship',
         'ua': 'потопив ваш двопалубний корабель'},
        {'en': 'has sunk your three deck ship',
         'ua': 'потопив ваш трипалубний корабель'},
        {'en': 'has sunk your four deck ship',
         'ua': 'потопив ваш чотирипалубний корабель'},
    ],
}

export default function setLanguage(name) {
    Object.keys(textContents).forEach(selector => {
        document.querySelectorAll(selector).forEach(elem => elem.textContent = textContents[selector][name])
    })
    Object.keys(placeholders).forEach(selector => {
        document.querySelector(selector).setAttribute('placeholder', placeholders[selector][name])
    })
}