// Імпорт socket.io-client
import { mobileSizing, changeGrid } from './mobile.js'

let ships

// Ініціалізація основних html-елементів
const menu = document.querySelector('.menu')
const game = document.querySelector('.game')
const userGrid = document.querySelector('.grid-user')
const computerGrid = document.querySelector('.grid-computer')
const displayGrid = document.querySelector('.grid-display')
const startButton = document.querySelector('#start')
const rotateButton = document.querySelector('#rotate')
const replayButton = document.querySelector('#play-again')
const exitButton = document.querySelector('#exit-room')
const turnDisplay = document.querySelector('.turn')
const infoDisplay = document.querySelector('#info')
const nicknameInput = document.getElementById('nickname')
const joinRoomInput = document.getElementById('join-room-code-input')
const createRoomButton = document.getElementById('create-room')
const joinRoomButton = document.getElementById('join-room')
const errorLabel = document.querySelector('.error-label')
const gameCode = document.querySelector('.game-code')

// Ініціалізація ігрових змінних
let wdWidth
let wdHeight
let userSquares = []
let computerSquares = []
let isHorizontal = true
let isGameOver = false
let isInGame = false
let gameBegin = false
let currentPlayer = 'user'
const width = 10
let playerNum = 0
let ready = false
let enemyReady = false
let allShipsPlaced = false
let shotFired = -1
let enemyNickname

// Підключення до серверу за посиланням
const socket = io()

// Моніторинг зміни розміру екрана
setWdSize()
function setWdSize() {
    wdWidth = window.innerWidth
    wdHeight = window.innerHeight
    mobileSizing(wdWidth, gameBegin, isInGame, currentPlayer)
}
window.addEventListener('resize', setWdSize)


// Обробка натискання кнопки "Створити кімнату"
createRoomButton.addEventListener('click', clickCreate)
function clickCreate() {
    if (nicknameInput.value === ''){
        errorLabel.innerHTML = `Введіть спочатку нікнейм`
        return
    }
    // Еміт створення кімнати
    socket.emit('create-room', nicknameInput.value)
}

// Обробка натискання кнопки "Приєднатися"
joinRoomButton.addEventListener('click', clickJoin)
function clickJoin() {
    if (nicknameInput.value === '') errorLabel.innerHTML = `Введіть спочатку нікнейм`
    else if (joinRoomInput.value === '') errorLabel.innerHTML = `Введіть код кімнати`
    if (nicknameInput.value === '' || joinRoomInput.value === '') return
    // Еміт приєднання до кімнати
    socket.emit('join-room', joinRoomInput.value, nicknameInput.value)
}

// Запуск гри
socket.on('init', code => {
    gameCode.innerHTML = code
    menu.style.display = 'none'
    game.style.display = 'flex'
    startGame()
})

// Повідомлення про помилку заповненості кімнати
socket.on('full-error', () => {
    errorLabel.innerHTML = `Кімната недоступна`
})
// Повідомлення про помилку зайнятості нікнейму
socket.on('nick-error', () => {
    errorLabel.innerHTML = `Нікнейм недоступний`
})

// Функція запуску гри
function startGame() {
    createBoard(userGrid, userSquares)
    createBoard(computerGrid, computerSquares)
    createShips(displayGrid)
    isInGame = true
    squaresSetup()
}

startMultiPlayer()
// Запуск мультиплеєру
function startMultiPlayer() {
    // Установка нікнеймів
    socket.on('set-nicknames', (enemyNn, num) => {
        enemyNickname = enemyNn
        document.querySelector(`.p${num === 0 ? 2 : 1}-name`).innerHTML = enemyNickname
        document.querySelector(`.p${num === 0 ? 1 : 2}-name`).innerHTML = nicknameInput.value.toLowerCase()
        document.querySelector(`.p${num === 0 ? 1 : 2}`).classList.add('you')
        document.querySelector(`.p${num === 0 ? 2 : 1}`).classList.add('enemy')
    })

    // Отримання номеру поточного гравця
    socket.on('player-number', num => {
        playerNum = parseInt(num)
        if(playerNum === 1) currentPlayer = "enemy"
        // Отримання статусу інших гравців
        socket.emit('check-players')
    })

    // Інший гравець зайшов/вийшов. Обробка
    socket.on('player-connection', num => {
        console.log(`Player number ${num} has connected or disconnected`)
        playerConnectedOrDisconnected(num)
    })

    // Ворог розставив кораблі
    socket.on('enemy-ready', num => {
        enemyReady = true
        playerReady(num)
        if (ready) playGameMulti(socket)
    })

    // Перевірка статусу гравців
    socket.on('check-players', players => {
        players.forEach((p, i) => {
            if(p.connected) playerConnectedOrDisconnected(i)
            if(p.ready) {
                playerReady(i)
                if(i !== playerReady) enemyReady = true
            }
        })
    })

    // Обробка натискання кнопки "Готовність"
    startButton.addEventListener('click', () => {
        if(allShipsPlaced) {
            if (enemyNickname !== '...') {
                startButton.style.display = 'none'
                playGameMulti(socket)
            }
            else fillInfoDisplay(`Зачекайте суперника`)
        }
        else fillInfoDisplay(`Спочатку розстав усі кораблі`)
    })

    // Обробка натискання кнопки "Грати знову"
    replayButton.addEventListener('click', () => {
        if (!isGameOver) return
        replayButton.disabled = true
        replayButton.classList.add('button-disabled')
        // Еміт грати знову
        socket.emit('replay', playerNum)
    })

    // Обробка натискання кнопки "Вийти"
    exitButton.addEventListener('click', clickExit)
    function clickExit() {
        document.location.reload()
    }

    // Перезапуск гри після того як обидва учасники натиснули "Грати знову"
    let replyCount = [0, 0]
    socket.on('replay', (num) => {
        replyCount[num]++
        if (replyCount[0]>0 && replyCount[1]>0){
            replay()
            replyCount = [0, 0]
        }
    })
    // Примусовий перезапуск гри або закінчення гри
    // при непередбаченому виході одного з гравців
    socket.on('hard-replay', () => { replay() })
    socket.on('hard-disconnect', () => { document.location.reload() })


    // Обробка ворожого пострілу
    socket.on('fire', id => {
        enemyGo(id)
        const square = userSquares[id]
        // Надсилання інформації серверу про клітику, в яку поцілив ворог
        socket.emit('fire-reply', square.classList)
        playGameMulti(socket)
    })

    // Обробка пострілу
    socket.on('fire-reply', classList => {
        revealSquare(classList)
        playGameMulti(socket)
    })

    // Функція обробки входу/виходу гравця
    function playerConnectedOrDisconnected(num) {
        let player = `.p${parseInt(num) + 1}`
        document.querySelector(`${player} .connected`).classList.toggle('green')
        if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
    }
}

function squaresSetup() {
    // Установка гральної сітки сітки суперника
    computerSquares.forEach(square => {
        // Обробка натискання на плитку (пострілу)
        square.addEventListener('click', () => {
            const isSquareBoomed = square.classList.contains('boom') || square.classList.contains('miss')
            if(currentPlayer === 'user' && ready && enemyReady && !isSquareBoomed) {
                shotFired = square.dataset.id
                // Надсилання серверу id клітинки пострілу
                socket.emit('fire', shotFired)
            }
        })
    })
    // Установка подій перетаскування для кораблів
    ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
    userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
    userSquares.forEach(square => square.addEventListener('dragover', dragOver))
    userSquares.forEach(square => square.addEventListener('drop', dragDrop))
    userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
}

// Функція створення грідів
function createBoard(grid, squares) {
    grid.innerHTML = ``
    for (let i = 0; i < width*width; i++) {
        const square = document.createElement('div')
        square.dataset.id = i
        grid.appendChild(square)
        squares.push(square)
    }
}

// Функція скасування обертання кораблів
function rotateRemove() {
    document.querySelectorAll('.ship-container').forEach(sc => sc.classList.remove('ship-container-vertical'))
    document.querySelectorAll('.ship').forEach(sh => sh.classList.remove('ship-vertical'))
    displayGrid.classList.remove('grid-display-vertical')
    isHorizontal = true
}

// Функція обертання кораблів
function rotate() {
    document.querySelectorAll('.ship-container').forEach(sc => sc.classList.toggle('ship-container-vertical'))
    document.querySelectorAll('.ship').forEach(sh => sh.classList.toggle('ship-vertical'))
    displayGrid.classList.toggle('grid-display-vertical')
    isHorizontal = isHorizontal ? false : true
}
// Обробка натискання кнопки "Обернути"
rotateButton.addEventListener('click', rotate)

// Змінні для перетягування
let draggedShip
let draggedShipLength
let allowedIds
let lastDragId
let busyIds = []

// Обробка початку перетягування
function dragStart() {
    draggedShip = this
    draggedShipLength = this.childNodes.length
}

// Обробка клітинки через яку було перетягнуто корабель
function dragLeave(e) {
    e.preventDefault()
    let dragCell = parseInt(this.dataset.id)
    try {
        if (allowedIds.includes(dragCell)) {
            if (isHorizontal) {
                for (let i=0; i<draggedShipLength; i++)
                    userSquares[dragCell+i].classList.remove('draged-over')
            } else if (!isHorizontal) {
                for (let i=0; i<draggedShipLength; i++)
                    userSquares[dragCell+i*width].classList.remove('draged-over')
            }
        }
    } catch {}
}

// Обробка клітинки через яку перетягується корабель
function dragOver(e) {
    e.preventDefault()
    let dragCell = parseInt(this.dataset.id)
    let shipCells = []
    if (isHorizontal) {
        for (let i=0; i<draggedShipLength; i++) shipCells.push(dragCell+i)
    } else {
        for (let i=0; i<draggedShipLength; i++) shipCells.push(dragCell+i*width)
    }
    let isNearShip = shipCells.filter(s => busyIds.includes(s)).length > 0

    if (isHorizontal) {
        allowedIds = [...Array(width*width).keys()].filter(a => width - a%width >= draggedShipLength)
        if (allowedIds.includes(dragCell) && !isNearShip) {
            for (let i=0; i<draggedShipLength; i++) userSquares[dragCell+i].classList.add('draged-over')
            lastDragId = dragCell
        } else lastDragId = undefined
    } else if (!isHorizontal) {
        allowedIds = [...Array(width*width).keys()].filter(a => width - Math.floor(a/width) >= draggedShipLength)
        if (allowedIds.includes(dragCell) && !isNearShip) {
            for (let i=0; i<draggedShipLength; i++) userSquares[dragCell+i*width].classList.add('draged-over')
            lastDragId = dragCell
        } else lastDragId = undefined
    } else allowedIds = []
}

// Обробка кінця перетягування, установка рорабля на сітку
function dragDrop() {
    userSquares.forEach(us => us.classList.remove('draged-over'))
    let shipNameWithLastId
    try {
        shipNameWithLastId = draggedShip.lastChild.id
    } catch {
        return
    }
    let shipClass = shipNameWithLastId.slice(0, -4)
    let shipName = shipNameWithLastId.slice(0, -2)
    let shipLastId = lastDragId

    if (isHorizontal && shipLastId !== undefined) {
        for (let i=0; i < draggedShipLength; i++) {
            userSquares[shipLastId+i].classList.add('taken', shipClass, shipName)
            fillBusy(shipLastId+i)
        }
    } else if (!isHorizontal && shipLastId !== undefined) {
        for (let i=0; i < draggedShipLength; i++) {
            userSquares[shipLastId + width*i].classList.add('taken', shipClass, shipName)
            fillBusy(shipLastId+width*i)
        }
    } else return

    document.querySelectorAll('.ship-container').forEach(sc => {
        if (sc.contains(draggedShip))
            sc.removeChild(draggedShip)
    })
    if(!displayGrid.querySelector('.ship')) {
        rotateRemove()
        infoDisplay.innerHTML = ``
        allShipsPlaced = true
        startButton.style.display = 'block'
        rotateButton.style.display = 'none'
        // document.querySelector('.game__container').style.marginTop = '100px'
    }
}


// Логіка гри
function playGameMulti(socket) {
    if (isGameOver) return
    if(!ready) {
        socket.emit('player-ready')
        ready = true
        playerReady(playerNum)
    }
    // Гру розпочато
    if (ready && enemyReady) {
        gameBegin = true
        exitButton.style.display = 'none'
        turnDisplay.style.display ='block'
        displayGrid.style.display = 'none'
        document.querySelector('.scores').style.display = 'flex'
    }
    // Установка ходу
    if(enemyReady) {
        if(currentPlayer === 'user') {
            if (wdWidth <= 900) changeGrid(true)
            turnDisplay.innerHTML = 'Ваш хід'
        }
        if(currentPlayer === 'enemy') {
            if (wdWidth <= 900) changeGrid(false)
            turnDisplay.innerHTML = `Хід суперника`
        }
    }
}

// Готовність гравця
function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready`).classList.toggle('green')
}

// Урон кораблів
let boomedShipsIds = []
let fourDeck1Count, threeDeck1Count, threeDeck2Count, doubleDeck1Count, doubleDeck2Count, doubleDeck3Count, singleDeck1Count, singleDeck2Count, singleDeck3Count, singleDeck4Count
let uFourDeck1Count, uThreeDeck1Count, uThreeDeck2Count, uDoubleDeck1Count, uDoubleDeck2Count, uDoubleDeck3Count, uSingleDeck1Count, uSingleDeck2Count, uSingleDeck3Count, uSingleDeck4Count
function countSetup() {
    fourDeck1Count = 0
    threeDeck1Count = 0
    threeDeck2Count = 0
    doubleDeck1Count = 0
    doubleDeck2Count = 0
    doubleDeck3Count = 0
    singleDeck1Count = 0
    singleDeck2Count = 0
    singleDeck3Count = 0
    singleDeck4Count = 0
    uFourDeck1Count = 0
    uThreeDeck1Count = 0
    uThreeDeck2Count = 0
    uDoubleDeck1Count = 0
    uDoubleDeck2Count = 0
    uDoubleDeck3Count = 0
    uSingleDeck1Count = 0
    uSingleDeck2Count = 0
    uSingleDeck3Count = 0
    uSingleDeck4Count = 0
}
// Установка урону
countSetup()

// Закраска ворожого корабля при затопленні
function fillDestroyedShip(id) {
    const startId = id-(id%width)
    const finishId = parseInt(id)+(width-(id%width))
    for (let i=id; i<finishId; i++) {
        if (!boomedShipsIds.includes(i)) break
        computerGrid.querySelector(`div[data-id='${i}']`).classList.add('destroyed')
    }
    for (let i=id; i>=startId; i--) {
        if (!boomedShipsIds.includes(i)) break
        computerGrid.querySelector(`div[data-id='${i}']`).classList.add('destroyed')
    }
    for (let i=id; i<width*width; i+=10) {
        if (!boomedShipsIds.includes(i)) break
        computerGrid.querySelector(`div[data-id='${i}']`).classList.add('destroyed')
    }
    for (let i=id; i>=0; i-=10) {
        if (!boomedShipsIds.includes(i)) break
        computerGrid.querySelector(`div[data-id='${i}']`).classList.add('destroyed')
    }
}

// Обробка пострілу
function revealSquare(classList) {
    if (isGameOver) return
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
    const obj = Object.values(classList)
    if (!enemySquare.classList.contains('boom') && currentPlayer === 'user') {
        if (obj.includes('single-deck-1')) singleDeck1Count++
        if (obj.includes('single-deck-2')) singleDeck2Count++
        if (obj.includes('single-deck-3')) singleDeck3Count++
        if (obj.includes('single-deck-4')) singleDeck4Count++
        if (obj.includes('double-deck-1')) doubleDeck1Count++
        if (obj.includes('double-deck-2')) doubleDeck2Count++
        if (obj.includes('double-deck-3')) doubleDeck3Count++
        if (obj.includes('three-deck-1')) threeDeck1Count++
        if (obj.includes('three-deck-2')) threeDeck2Count++
        if (obj.includes('four-deck-1')) fourDeck1Count++
    }
    if (obj.includes('taken')) {
        enemySquare.classList.add('boom')
        boomedShipsIds.push(parseInt(shotFired))
        checkForWins(parseInt(shotFired))
    } else {
        enemySquare.classList.add('miss')
        currentPlayer = 'enemy'
    }
}

// Обробка ворожого пострілу
function enemyGo(square) {
    if (isGameOver) return
    if (!userSquares[square].classList.contains('boom') && !userSquares[square].classList.contains('miss')) {
        if (userSquares[square].classList.contains('taken')) {
            userSquares[square].classList.add('boom')
            if (userSquares[square].classList.contains('single-deck-1')) uSingleDeck1Count++
            if (userSquares[square].classList.contains('single-deck-2')) uSingleDeck2Count++
            if (userSquares[square].classList.contains('single-deck-3')) uSingleDeck3Count++
            if (userSquares[square].classList.contains('single-deck-4')) uSingleDeck4Count++
            if (userSquares[square].classList.contains('double-deck-1')) uDoubleDeck1Count++
            if (userSquares[square].classList.contains('double-deck-2')) uDoubleDeck2Count++
            if (userSquares[square].classList.contains('double-deck-3')) uDoubleDeck3Count++
            if (userSquares[square].classList.contains('three-deck-1')) uThreeDeck1Count++
            if (userSquares[square].classList.contains('three-deck-2')) uThreeDeck2Count++
            if (userSquares[square].classList.contains('four-deck-1')) uFourDeck1Count++
            checkForWins(square)
        } else {
            userSquares[square].classList.add('miss')
            currentPlayer = 'user'
        }
    }
}

// Перевірка затоплень та кінця гри
function checkForWins(id) {
    let enemy = enemyNickname
    if (singleDeck1Count === 1 || singleDeck2Count === 1 || singleDeck3Count === 1 || singleDeck4Count === 1) {
        fillInfoDisplay(`Ви потопили однопалубний ворожий корабель`)
        fillDestroyedShip(id)
        if (singleDeck1Count === 1) singleDeck1Count = 10
        if (singleDeck2Count === 1) singleDeck2Count = 10
        if (singleDeck3Count === 1) singleDeck3Count = 10
        if (singleDeck4Count === 1) singleDeck4Count = 10
        let score = document.querySelector('.ship-score-1-computer div').textContent
        document.querySelector('.ship-score-1-computer div').innerHTML = --score
    }
    if (doubleDeck1Count === 2 || doubleDeck2Count === 2 || doubleDeck3Count === 2) {
        fillInfoDisplay(`Ви потопили двопалубний ворожий корабель`)
        fillDestroyedShip(id)
        if (doubleDeck1Count === 2) doubleDeck1Count = 10
        if (doubleDeck2Count === 2) doubleDeck2Count = 10
        if (doubleDeck3Count === 2) doubleDeck3Count = 10
        let score = document.querySelector('.ship-score-2-computer div').textContent
        document.querySelector('.ship-score-2-computer div').innerHTML = --score
    }
    if (threeDeck1Count === 3 || threeDeck2Count === 3) {
        fillInfoDisplay(`Ви потопили трипалубний ворожий корабель`)
        fillDestroyedShip(id)
        if (threeDeck1Count === 3) threeDeck1Count = 10
        if (threeDeck2Count === 3) threeDeck2Count = 10
        let score = document.querySelector('.ship-score-3-computer div').textContent
        document.querySelector('.ship-score-3-computer div').innerHTML = --score
    }
    if (fourDeck1Count === 4) {
        fillInfoDisplay(`Ви потопили чотирипалубний ворожий корабель`)
        fillDestroyedShip(id)
        fourDeck1Count = 10
        let score = document.querySelector('.ship-score-4-computer div').textContent
        document.querySelector('.ship-score-4-computer div').innerHTML = --score
    }
    if (uSingleDeck1Count === 1 || uSingleDeck2Count === 1 || uSingleDeck3Count === 1 || uSingleDeck4Count === 1) {
        fillInfoDisplay(`${enemy} потопив ваш однопалубний корабель`)
        if (uSingleDeck1Count === 1) uSingleDeck1Count = 10
        if (uSingleDeck2Count === 1) uSingleDeck2Count = 10
        if (uSingleDeck3Count === 1) uSingleDeck3Count = 10
        if (uSingleDeck4Count === 1) uSingleDeck4Count = 10
        let score = document.querySelector('.ship-score-1-user div').textContent
        document.querySelector('.ship-score-1-user div').innerHTML = --score
    }
    if (uDoubleDeck1Count === 2 || uDoubleDeck2Count === 2 || uDoubleDeck3Count === 2) {
        fillInfoDisplay(`${enemy} потопив ваш двопалубний корабель`)
        if (uDoubleDeck1Count === 2) uDoubleDeck1Count = 10
        if (uDoubleDeck2Count === 2) uDoubleDeck2Count = 10
        if (uDoubleDeck3Count === 2) uDoubleDeck3Count = 10
        let score = document.querySelector('.ship-score-2-user div').textContent
        document.querySelector('.ship-score-2-user div').innerHTML = --score
    }
    if (uThreeDeck1Count === 3 || uThreeDeck2Count === 3) {
        fillInfoDisplay(`${enemy} потопив ваш трипалубний корабель`)
        if (uThreeDeck1Count === 3) uThreeDeck1Count = 10
        if (uThreeDeck2Count === 3) uThreeDeck2Count = 10
        let score = document.querySelector('.ship-score-3-user div').textContent
        document.querySelector('.ship-score-3-user div').innerHTML = --score
    }
    if (uFourDeck1Count === 4) {
        fillInfoDisplay(`${enemy} потопив ваш чотирипалубний корабель`)
        uFourDeck1Count = 10;
        let score = document.querySelector('.ship-score-4-user div').textContent
        document.querySelector('.ship-score-4-user div').innerHTML = --score
    }

    let totalEnemyDamage = singleDeck1Count+singleDeck2Count+singleDeck3Count+singleDeck4Count
        +doubleDeck1Count+doubleDeck2Count+doubleDeck3Count+threeDeck1Count+threeDeck2Count+fourDeck1Count;
    let totalUserDamage = uSingleDeck1Count+uSingleDeck2Count+uSingleDeck3Count+uSingleDeck4Count
        +uDoubleDeck1Count+uDoubleDeck2Count+uDoubleDeck3Count+uThreeDeck1Count+uThreeDeck2Count+uFourDeck1Count;
    
    if (totalEnemyDamage === 100) {
        turnDisplay.innerHTML = 'Перемога!'
        gameOver()
    }
    if (totalUserDamage === 100) {
        turnDisplay.innerHTML = 'Поразка.'
        gameOver()
    }
}

// Функція завершення гри
function gameOver() {
    isGameOver = true
    replayButton.style.display = 'block'
    exitButton.style.display = 'block'
}

// Функція установки недоступних клітинок після встановлення корабля
function fillBusy(busyId) {
    busyIds.push(busyId)
    busyIds.push(busyId+width)
    busyIds.push(busyId-width)
    if (busyId % width === 0) {
        busyIds.push(busyId+1)
    } else if (busyId % width === 9) {
        busyIds.push(busyId-1)
    } else {
        busyIds.push(busyId+1)
        busyIds.push(busyId-1)
    }
    busyIds.filter(b => 0 <= b <= 99)
    busyIds = [...new Set(busyIds)]
}

// Функція створення html-елементів кораблів
function createShips(grid) {
    grid.innerHTML = ``
    const shipNames = ['single-deck', 'double-deck', 'three-deck', 'four-deck']
    const shipCount = [4, 3, 2, 1]

    for (let k=4; k>=1; k--) {
        const shipName = shipNames[k-1]
        const shipContainer = document.createElement('div')
        shipContainer.classList.add(`ship-container`)
        for (let i=0; i<shipCount[k-1]; i++) {
            const shipElement = document.createElement('div')
            shipElement.className = `ship port-${shipName} ${shipName}-${i+1}-container`
            shipElement.draggable = true
            shipContainer.append(shipElement)
            for (let j=0; j<k; j++){
                const square = document.createElement('div')
                square.id = `${shipName}-${i+1}-${j+1}`
                square.classList.add('ship-deck')
                if (j === 0) square.classList.add('ship-back')
                if (j === k-1) square.classList.add('ship-nose')
                shipElement.appendChild(square)
            } grid.appendChild(shipContainer)
        }
    }
    ships = document.querySelectorAll('.ship')
}

// Функція скидання рахунку
function refillScore() {
    document.querySelectorAll('.ship-score-4 div').forEach(sc => sc.innerHTML = '1')
    document.querySelectorAll('.ship-score-3 div').forEach(sc => sc.innerHTML = '2')
    document.querySelectorAll('.ship-score-2 div').forEach(sc => sc.innerHTML = '3')
    document.querySelectorAll('.ship-score-1 div').forEach(sc => sc.innerHTML = '4')
}

// Функція скидання основних параметрів гри для гри спочатку
function replay() {
    userSquares = []
    computerSquares = []

    createBoard(userGrid, userSquares)
    createBoard(computerGrid, computerSquares)
    createShips(displayGrid)
    squaresSetup()
    countSetup()

    isHorizontal = true
    isGameOver = false
    gameBegin = false
    currentPlayer = parseInt(playerNum) === 0 ? 'user' : 'enemy'
    ready = false
    enemyReady = false
    allShipsPlaced = false
    shotFired = -1
    busyIds = []
    boomedShipsIds = []

    infoDisplay.innerHTML = `Розставте кораблі`
    turnDisplay.innerHTML = ``
    startButton.style.display = 'none'
    rotateButton.style.display = 'block'
    replayButton.style.display = 'none'
    replayButton.disabled = false
    replayButton.classList.remove('button-disabled')
    turnDisplay.style.display = 'none'
    displayGrid.style.display = 'flex'
    exitButton.style.display = 'block'
    document.querySelector('.scores').style.display = 'none'
    // document.querySelector('.game__container').style.marginTop = '20px'
    refillScore()

    for (let i=1; i<=2; i++){
        document.querySelector(`.p${i} .ready`).classList.remove('green')
    }
}

// Функція для заповнення інформаційного блоку
function fillInfoDisplay(text) {
    infoDisplay.innerHTML = text
    setTimeout(() => {
        infoDisplay.innerHTML = ``
    }, 5000)
}
