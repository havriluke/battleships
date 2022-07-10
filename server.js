const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const path = require('path')
const PORT = process.env.PORT || 3000
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:8080"
    }
})

app.use(express.static(path.join(__dirname, "client")))

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// Змінні інформацї про підключення гравців та їх нікнейми
let connections = {}
let nicknames = {}

// Установка підключення серверу до клієнта
io.on('connection', socket => {

    // функція приєднаня до кімнати
    function joinRoom(code, nickname) {
        // Пошук доступного номеру гравця
        let playerIndex = -1;
        for (const i in connections[code]) {
            if (connections[code][i] === null) {
                playerIndex = i
                break
            }
        }

        // Ігнорування зайвого гравця
        if (playerIndex === -1) {
            socket.emit('full-error')
            return
        }

        // Недоступні нікнейми
        if (!checkNickname(nickname, code)) {
            socket.emit('nick-error');
            return
        }
        
        // Установка нікнеймів
        if (parseInt(playerIndex) === 0) {
            nicknames[code][0] = nickname
            socket.emit('set-nicknames', '...', 0)
        }
        else if (parseInt(playerIndex) === 1) {
            nicknames[code][1] = nickname
            socket.to(code).emit('set-nicknames', nickname, 0)
            socket.emit('set-nicknames', nicknames[code][0], 1)
        }

        // Приєднання до кімнати за кодом кімнати
        socket.join(code)
        // Еміт запуску гри
        socket.emit('init', code)

        // Надсилання клієнту його номер
        socket.emit('player-number', playerIndex)

        // Виведення в серверну консоль інформації про приєднання гравця
        console.log(`Player ${playerIndex} has connected`)

        // Установка з'єднань
        connections[code][playerIndex] = false

        // Надсилання інформації про те, що гравець підключився
        socket.to(code).emit('player-connection', playerIndex)

        // Обробка відключення гравця
        socket.on('disconnect', () => {
            console.log(`Player ${playerIndex} disconnected`)
            // Якщо відключенний гравець - хост, то примусово відключити другого гравця
            if (parseInt(playerIndex) === 0) {
                delete connections[code]
                delete nicknames[code]
                socket.to(code).emit('hard-disconnect')
            // Якщо відключенний гравець - гість, то примусово перезапустити гру хосту
            } else {
                connections[code][1] = null
                nicknames[code][1] = null
                socket.to(code).emit('hard-replay')
                socket.to(code).emit('set-nicknames', '...', 0)
                // Надсилання інформації про те, що гравець відключився
                socket.to(code).emit('player-connection', playerIndex)
            }
        })

        // Обробка готовності гравця
        socket.on('player-ready', () => {
            socket.to(code).emit('enemy-ready', playerIndex)
            connections[code][playerIndex] = true
        })

        // Перевірка з'єднання гравця
        socket.on('check-players', () => {
            const players = []
            for (const i in connections[code]) {
                connections[code][i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]})
            }
            socket.emit('check-players', players)
        })

        // Обробка пострілу
        socket.on('fire', id => {
            // Еміт ходу іншому гравцеві
            socket.to(code).emit('fire', id)
        })

        // Надсилання інформації про постріл іншому гравцеві
        socket.on('fire-reply', square => {
            socket.to(code).emit('fire-reply', square)
        })

        // Обробка перезапуску
        socket.on('replay', (num) => {
            io.to(code).emit('replay', num)
        })

        // Обробка запуску таймера
        socket.on('set-timer', (timerCount) => {
            io.to(code).emit('set-timer', timerCount)
        })
        socket.on('timer-out', () => {
            io.to(code).emit('timer-out')
        })

        // Обробка надсилання дошки
        socket.on('send-board', (ids) => {
            socket.to(code).emit('send-board', ids)
        })
    }

    // Обробка кількості гравців
    io.emit('cpc', io.engine.clientsCount)

    // Створення кімнати
    socket.on('create-room', (nickname) => {
        // Генерація id кімнати
        const code = makeid(8)
        // Скидання підключення та нікнеймів
        connections[code] = [null, null]
        nicknames[code] = [null, null]
        // Приєднання до кімнати
        joinRoom(code, nickname.toLowerCase())
    })

    // Приєднання до існуючої кімнати
    socket.on('join-room', (code, nickname) => {
        joinRoom(code, nickname.toLowerCase())
    })

})


// Функція генерації коду
function makeid(length) {
    var result           = '';
    var characters       = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    if (result in connections) return makeid(length)
    return result;
}

// Функція перевірки легітимності нікнейму
function checkNickname(currentNickname, code) {
    let isLegit = true
    let regExsp =  /^[A-Za-z]([A-Za-z0-9]+)$/g
    isLegit =  currentNickname.match(regExsp) ? isLegit : false
    isLegit = currentNickname.length >= 10 ? false : isLegit
    isLegit = currentNickname === nicknames[code][0] ? false : isLegit
    return isLegit
}

