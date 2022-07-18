import { mobileSizing, changeGrid } from './mobile.js'
import setLanguage from './languages.js'
import {innerHtmls} from './languages.js'

let ships

const DEFAULT_LANGUAGE = 'en'
const DEFAULT_NICKNAME = ''
let currentLanguage = localStorage.getItem('language') || DEFAULT_LANGUAGE
let currentNickname = localStorage.getItem('nickname') || DEFAULT_NICKNAME

// Ініціалізація основних html-елементів
const menu = document.querySelector('.menu')
const game = document.querySelector('.game')
const userGrid = document.querySelector('.grid-user')
const computerGrid = document.querySelector('.grid-computer')
const displayGrid = document.querySelector('.grid-display')
const startButton = document.querySelector('#start')
const rotateButton = document.querySelector('#rotate')
const setShipButton = document.querySelector('#set-ship')
const replayButton = document.querySelector('#play-again')
const exitButton = document.querySelector('#exit-room')
const turnDisplay = document.querySelector('.turn')
const infoDisplay = document.querySelector('#info')
const nicknameInput = document.getElementById('nickname')
const joinRoomInput = document.getElementById('join-room-code-input')
const createRoomButton = document.getElementById('create-room')
const joinRoomButton = document.getElementById('join-room')
const randomRoom = document.getElementById('random-room')
const playOffline = document.getElementById('play-offline')
const errorLabel = document.querySelector('.error-label')
const gameCode = document.querySelector('.game-code')
const timerElement = document.querySelector('.timer')
const languageBlock = document.querySelector('.language-block')
const languageElements = document.querySelectorAll('.language-element')

// Ініціалізація ігрових змінних
let wdWidth
let userSquares = []
let computerSquares = []
let isHorizontal = true
let isGameOver = false
let gameBegin = false
let currentPlayer = 'user'
let gameMode = 'public'
const width = 10
let totalEnemyDamage = 0
let totalUserDamage = 0
let playerNum = 0
let ready = false
let enemyReady = false
let allShipsPlaced = false
let shotFired = -1
let enemyNickname
let isShotAnimation = false

// Підключення до серверу
const socket = io()

// Моніторинг зміни розміру екрана
setWdSize()
function setWdSize() {
    wdWidth = window.innerWidth
    mobileSizing(wdWidth, gameBegin, currentPlayer)
}
window.addEventListener('resize', setWdSize)

// Обробка натискання кнопки "Створити кімнату"
createRoomButton.addEventListener('click', clickCreate)
function clickCreate() {
    if (nicknameInput.value === ''){
        errorLabel.innerHTML = innerHtmls['errorLabel'][0][currentLanguage]
        return
    }
    localStorage.setItem('nickname', nicknameInput.value)
    gameMode = 'private'
    // Еміт створення кімнати
    socket.emit('create-room', nicknameInput.value)
    setWdSize()
}

// Обробка натискання кнопки "Приєднатися"
joinRoomButton.addEventListener('click', clickJoin)
function clickJoin() {
    if (nicknameInput.value === '') errorLabel.innerHTML = innerHtmls['errorLabel'][0][currentLanguage]
    else if (joinRoomInput.value === '') errorLabel.innerHTML = innerHtmls['errorLabel'][1][currentLanguage]
    if (nicknameInput.value === '' || joinRoomInput.value === '') return
    localStorage.setItem('nickname', nicknameInput.value)
    gameMode = 'private'
    // Еміт приєднання до кімнати
    socket.emit('join-room', joinRoomInput.value, nicknameInput.value)
    setWdSize()
}

// Обробка натискання кнопки "Випадковий бій"
randomRoom.addEventListener('click', clickRandom)
function clickRandom() {
    if (nicknameInput.value === ''){
        errorLabel.innerHTML = innerHtmls['errorLabel'][0][currentLanguage]
        return
    }
    localStorage.setItem('nickname', nicknameInput.value)
    gameMode = 'public'
    socket.emit('random-room', nicknameInput.value)
    setWdSize()
}

// Обробка натискання кнопки "Грати оффлайн"
playOffline.addEventListener('click', clickOffline)
function clickOffline() {
    if (nicknameInput.value === ''){
        errorLabel.innerHTML = innerHtmls['errorLabel'][0][currentLanguage]
        return
    }
    localStorage.setItem('nickname', nicknameInput.value)
    gameMode = 'singleplayer'
    socket.emit('play-offline', nicknameInput.value)
    setWdSize()
}

// Установка останнього нікнейму
nicknameInput.value = currentNickname

// Налаштування мови
setLanguage(currentLanguage)
document.getElementById(currentLanguage).classList.add('active')
languageBlock.addEventListener('click', () => {
    document.querySelector('.language-list').classList.toggle('active')
})
languageElements.forEach(le => le.addEventListener('click', () => {
    if (le.classList.contains('active')) return
    languageElements.forEach(le_ => le_.classList.remove('active'))
    le.classList.add('active')
    setLanguage(le.id)
    currentLanguage = le.id
    localStorage.setItem('language', le.id)
    errorLabel.innerHTML = ''
}))

// Обробка копіювання коду кімнати
gameCode.addEventListener('click', copyCode)
document.querySelector('.copy-symb').addEventListener('click', copyCode)
function copyCode() {
    navigator.clipboard.writeText(gameCode.textContent)
    document.querySelector('.copy-symb').src = 'img/check-line.svg'
    setTimeout(() => {
        document.querySelector('.copy-symb').src = 'img/file-copy-line.svg'
    }, 10000);
}

// Зміна дошки в кінці гри (mobile)
let countClickOnBoard = 0
userGrid.addEventListener('click', changeGridGameOver)
computerGrid.addEventListener('click', changeGridGameOver)
function changeGridGameOver() {
    if (!isGameOver || wdWidth > 900) return
    let isWin = totalEnemyDamage == 100
    countClickOnBoard++
    if (isWin) changeGrid(countClickOnBoard % 2 === 0)
    else changeGrid(countClickOnBoard % 2 !== 0)
}

// Обробка кількості гравців онлайн
socket.on('cpc', (onlineNow) => {
    document.querySelector('.online-now .value').innerHTML = onlineNow
})

// Обробка запуску гри оффлайн
socket.on('offline-game', () => {
    setNickname('bot', 0)
    startSinglePlayer()
    timerCount = 2
    init(null)
})

// Запуск гри
socket.on('init', code => {
    startMultiPlayer()
    init(code)
})

function init(code) {
    if (gameMode === 'private') gameCode.innerHTML = code
    if (gameMode !== 'private') document.querySelector('.game-code-cont').style.display = 'none'
    else document.querySelector('.game-code-cont').style.display = 'flex'
    menu.style.display = 'none'
    game.style.display = 'flex'
    startGame()
}

// Повідомлення про помилку заповненості кімнати
socket.on('full-error', () => {
    errorLabel.innerHTML = innerHtmls['errorLabel'][2][currentLanguage]
})
// Повідомлення про помилку зайнятості нікнейму
socket.on('nick-error', () => {
    errorLabel.innerHTML = innerHtmls['errorLabel'][3][currentLanguage]
})

// Запуск таймеру
socket.on('set-timer', (num) => {
    setTimerCount(num)
})
socket.on('timer-out', () => {
    timerOut()
})

// Показ ворожих кораблів після гри
socket.on('send-board', (ids) => {
    showEnemyBoard(ids)
})
function showEnemyBoard(ids) {
    ids.forEach(i => {
        computerGrid.querySelector(`div[data-id='${i}']`).classList.add('taken')
    })
    computerGrid.querySelectorAll(`div`).forEach(s => {
        if (s.classList.contains('boom') && !s.classList.contains('destroyed')) s.classList.add('taken')
    })
}

// Установка нікнеймів
socket.on('set-nicknames', (enemyNn, num) => {
    setNickname(enemyNn, num)
})
function setNickname(enemyNn, num) {
    enemyNickname = enemyNn
    document.querySelector(`.p${num === 0 ? 2 : 1}-name`).innerHTML = enemyNickname
    document.querySelector(`.p${num === 0 ? 1 : 2}-name`).innerHTML = nicknameInput.value.toLowerCase()
    document.querySelector(`.p${num === 0 ? 1 : 2}`).classList.add('you')
    document.querySelector(`.p${num === 0 ? 2 : 1}`).classList.add('enemy')
    document.querySelector(`.p${parseInt(num) + 1}`).style.fontWeight = 'bold'
}

// Функція запуску гри
function startGame() {
    createBoard(userGrid, userSquares)
    createBoard(computerGrid, computerSquares)
    createShips(displayGrid)
    squaresSetup()
}

// Запуск сінглплеєру
let shipsComputer = {}
let notAllowedShotComputer = []
let injureShotsComputer = []
async function userShot(id) {
    let target = id in shipsComputer ? shipsComputer[id] : document.createElement('div')
    revealSquare(target.classList)
    playGameSingle()
}
async function computerShot() {
    await setPause(Math.random() * 2 + 1)
    let recommendedChoises = [...Array(Math.pow(width, 2)).keys()]
    if (injureShotsComputer.length) {
        if (injureShotsComputer.length === 1) {
            recommendedChoises = [injureShotsComputer[0]-1, injureShotsComputer[0]+1,
                                  injureShotsComputer[0]+width, injureShotsComputer[0]-width]
        }
        else {
            if (Math.abs(injureShotsComputer[0]-injureShotsComputer[1]) === 1) recommendedChoises = [Math.min(...injureShotsComputer)-1, Math.max(...injureShotsComputer)+1]
            else if (Math.abs(injureShotsComputer[0]-injureShotsComputer[1]) === width) recommendedChoises = [Math.min(...injureShotsComputer)-width, Math.max(...injureShotsComputer)+width]
        }
        injureShotsComputer.forEach(isc => {
            if (isc % width === 9) recommendedChoises = recommendedChoises.filter(s => s % width !== 0)
            else if (isc % width === 0) recommendedChoises = recommendedChoises.filter(s => s % width !== 9)
        })
    }
    recommendedChoises = recommendedChoises.filter(s => !notAllowedShotComputer.includes(s) && s >= 0 && s < 100)
    let choosenSquare = recommendedChoises[Math.floor(Math.random()*recommendedChoises.length)]
    notAllowedShotComputer.push(choosenSquare)
    enemyGo(choosenSquare)
    playGameSingle()
}
function startSinglePlayer() {
    // Обробка натискання кнопки "Готовність"
    startButton.addEventListener('click', clickStartSimpleplayer)
    async function clickStartSimpleplayer() {
        if(allShipsPlaced) {
            await setPause(0.1)
            startButton.style.display = 'none'
            ready = true
            playerReady(0)
            shipsComputer = shipsAutoSet()
            playerReady(1)
            enemyReady = true
            playGameSingle()
            console.log(shipsComputer);
        } else fillInfoDisplay(`Спочатку розстав усі кораблі`)
    }
    replayButton.addEventListener('click', clickReplaySimpleplayer)
    async function clickReplaySimpleplayer() {
        await setPause(0.1)
        if (!isGameOver) return
        replayButton.disabled = true
        replayButton.classList.add('button-disabled')
        replay()
    }
}

// Запуск мультиплеєру
function startMultiPlayer() {
    // Отримання номеру поточного гравця
    socket.on('player-number', num => {
        playerNum = parseInt(num)
        if(playerNum === 1) currentPlayer = "enemy"
        // Отримання статусу інших гравців
        socket.emit('check-players')
    })

    // Ворог розставив кораблі
    socket.on('enemy-ready', num => {
        enemyReady = true
        playerReady(num)
        if (ready) playGameMulti()
    })

    // Перевірка статусу гравців
    socket.on('check-players', players => {
        players.forEach((p, i) => {
            if(p.ready) {
                playerReady(i)
                if(i !== playerReady) enemyReady = true
            }
        })
    })

    // Обробка натискання кнопки "Готовність"
    startButton.addEventListener('click', clickStart)
    async function clickStart() {
        if(allShipsPlaced) {
            if (enemyNickname !== '...') {
                await setPause(0.1)
                startButton.style.display = 'none'
                socket.emit('player-ready')
                ready = true
                playerReady(playerNum)
                playGameMulti()
            } else fillInfoDisplay(`Зачекайте суперника`)
        } else fillInfoDisplay(`Спочатку розстав усі кораблі`)
    }

    // Обробка натискання кнопки "Грати знову"
    replayButton.addEventListener('click', clickReplay)
    async function clickReplay() {
        await setPause(0.1)
        if (!isGameOver) return
        replayButton.disabled = true
        replayButton.classList.add('button-disabled')
        // Еміт грати знову
        socket.emit('replay', playerNum)
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
        playGameMulti()
    })

    // Обробка пострілу
    socket.on('fire-reply', classList => {
        revealSquare(classList)
        playGameMulti()
    })
}

// Обробка натискання кнопки "Вийти"
exitButton.addEventListener('click', clickExit)
function clickExit() {
    document.location.reload()
}

function squaresSetup() {
    // Установка гральної сітки сітки суперника
    computerSquares.forEach(square => {
        // Обробка натискання на плитку (пострілу)
        square.addEventListener('click', handleShot)
    })
    // Установка подій перетаскування для кораблів (мишка)
    ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
    userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
    userSquares.forEach(square => square.addEventListener('dragover', dragOver))
    userSquares.forEach(square => square.addEventListener('drop', dragDrop))
    userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))

    // Установка подій перетаскування для кораблів (екран)
    ships.forEach(ship => ship.addEventListener('touchstart', touchStart))
    document.addEventListener('touchstart', cancelDragShip)
    userGrid.addEventListener('touchstart', setDraggedShip)
    setShipButton.addEventListener('touchstart', setShip)
}
async function handleShot(e) {
    const square = e.path[0]
    const isSquareBoomed = square.classList.contains('miss') || square.classList.contains('boom')
    if(currentPlayer === 'user' && ready && enemyReady && !isSquareBoomed && timerCount > 1 && !isShotAnimation) {
        isShotAnimation = true
        shotFired = square.dataset.id
        square.classList.add('checked')
        await waitForAnimation(square)
        square.classList.remove('checked')
        // Надсилання серверу id клітинки пострілу
        if (gameMode !== 'singleplayer') socket.emit('fire', shotFired)
        else userShot(shotFired)
        await setPause(0.5)
        isShotAnimation = false
    }
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

//      Функції перетягування (мишка)
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
    if (draggedShip === undefined) return
    userSquares.forEach(cell => cell.classList.remove('draged-over'))
    e.preventDefault()
    let dragCell = parseInt(e.path[0].dataset.id)
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
// Обробка кінця перетягування, установка корабля на сітку
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
            busyIds = fillBusy(shipLastId+i, busyIds)
        }
    } else if (!isHorizontal && shipLastId !== undefined) {
        for (let i=0; i < draggedShipLength; i++) {
            userSquares[shipLastId + width*i].classList.add('taken', shipClass, shipName)
            busyIds = fillBusy(shipLastId+width*i, busyIds)
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
    }
}

//      Функції перетягування (екран)
// Обробка вибору корабля
function touchStart(e) {
    if (draggedShip !== e.path[1]) {
        ships.forEach(ship => ship.classList.remove('dragged'))
        userSquares.forEach(cell => cell.classList.remove('draged-over'))
        rotateButton.style.display = 'block'
        setShipButton.style.display = 'none'
        draggedShip = undefined
        draggedShipLength = undefined
        lastDragId = undefined
    }
    if (!e.path[1].classList.contains('ship')) return
    draggedShip = e.path[1]
    draggedShipLength = draggedShip.childNodes.length
    draggedShip.classList.add('dragged')
}
// Обробка скасування вибору корабля
function cancelDragShip(e) {
    if (draggedShip === undefined) return
    const touchedElements = e.path
    let doCancel = true
    touchedElements.slice(0, -2).forEach(touchElem => {
        if (touchElem === draggedShip || touchElem.classList.contains('grid-user') || lastDragId === undefined ||
            touchElem.classList.contains('set-ship') || touchElem.classList.contains('rotate') || !gameBegin) doCancel = false
    })
    if (doCancel) {
        draggedShip.classList.remove('dragged')
        draggedShip = undefined
        draggedShipLength = undefined
        lastDragId = undefined
        rotateButton.style.display = 'block'
        setShipButton.style.display = 'none'
        userSquares.forEach(cell => cell.classList.remove('draged-over'))
    }
}
// Обробка установки корабля
function setDraggedShip(e) {
    if (allShipsPlaced) return
    dragOver(e)
    if (draggedShip === undefined) lastDragId = undefined
    if (lastDragId !== undefined) {
        rotateButton.style.display = 'none'
        setShipButton.style.display = 'block'
    } else {
        rotateButton.style.display = 'block'
        setShipButton.style.display = 'none'
    }
}
// Підтвердження установки корабля
async function setShip() {
    await setPause(0.1)
    dragDrop()
    if (!allShipsPlaced) {
        rotateButton.style.display = 'block'
        setShipButton.style.display = 'none'
    } else setShipButton.style.display = 'none'
    draggedShip = undefined
    draggedShipLength = undefined
    lastDragId = undefined
}

function shipsAutoSet() {
    let busyIdsComputer = []
    let shipsIdComputerElements = {}
    for (let i=4; i>0; i--) {
        for (let j=0; j<5-i; j++) {
            let isLegalPosition
            let filledIds
            let shipNames = [`${['single', 'double', 'three', 'four'][i-1]}-deck-${j+1}`, `${['single', 'double', 'three', 'four'][i-1]}`]
            do {
                filledIds = []
                isLegalPosition = true
                let isHorizontalComputer = Math.floor(Math.random()*2) == 0
                let firstId = Math.floor(Math.random()*Math.pow(width, 2))
                if (isHorizontalComputer) {
                    for (let k=0; k<i; k++) filledIds.push(firstId+k)
                    isLegalPosition = filledIds[0]%width <=          filledIds[filledIds.length-1]%width  ? isLegalPosition : false
                } else {
                    for (let k=0; k<i; k++) filledIds.push(firstId+k*width)
                    isLegalPosition = filledIds[filledIds.length-1] < 100 ? isLegalPosition : false
                }
                isLegalPosition = filledIds.filter(s => busyIdsComputer.includes(s)).length > 0 ? false : isLegalPosition
            } while (!isLegalPosition)
            filledIds.forEach(id => {
                busyIdsComputer = fillBusy(id, busyIdsComputer)
                let shipsIdComputerElement = document.createElement('div')
                shipsIdComputerElement.classList.add(shipNames[0], shipNames[1], 'taken')
                shipsIdComputerElements[id] = shipsIdComputerElement
            })
        }
    }
    return shipsIdComputerElements
}

// Логіка гри (сінглплеєр)
async function playGameSingle() {
    if (isGameOver) return
    if (ready && enemyReady) {
        beginGame()
        if (currentPlayer === 'enemy') computerShot()
    }
}

// Логіка гри (мультиплеєр)
function playGameMulti() {
    if (isGameOver) return
    // Гру розпочато
    if (ready && enemyReady) {
        timerElement.style.display = 'flex'
        beginGame()
        // Запуск таймеру хостом
        if (playerNum === 0) {
            setTimer(10)
        }
    }
}

async function beginGame () {
    gameBegin = true
    rotateButton.style.display = 'none'
    exitButton.style.display = 'none'
    turnDisplay.style.display ='block'
    displayGrid.style.display = 'none'
    document.querySelector('.scores').style.display = 'flex'
    await setPause(0.25)
    if (wdWidth <= 900) changeGrid(currentPlayer === 'user')
    // Установка ходу
    if(currentPlayer === 'user') {
        turnDisplay.innerHTML = innerHtmls['turnDisplay'][0][currentLanguage]
    }
    if(currentPlayer === 'enemy') {
        turnDisplay.innerHTML = innerHtmls['turnDisplay'][1][currentLanguage]
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
    if (!userSquares[square].classList.contains('miss') && !userSquares[square].classList.contains('boom')) {
        if (userSquares[square].classList.contains('taken')) {
            userSquares[square].classList.add('boom')
            injureShotsComputer.push(square)
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
        fillInfoDisplay(`${innerHtmls['infoDisplay'][1][currentLanguage]}`)
        fillDestroyedShip(id)
        if (singleDeck1Count === 1) singleDeck1Count = 10
        if (singleDeck2Count === 1) singleDeck2Count = 10
        if (singleDeck3Count === 1) singleDeck3Count = 10
        if (singleDeck4Count === 1) singleDeck4Count = 10
        let score = document.querySelector('.ship-score-1-computer div').textContent
        document.querySelector('.ship-score-1-computer div').innerHTML = --score
    }
    if (doubleDeck1Count === 2 || doubleDeck2Count === 2 || doubleDeck3Count === 2) {
        fillInfoDisplay(`${innerHtmls['infoDisplay'][2][currentLanguage]}`)
        fillDestroyedShip(id)
        if (doubleDeck1Count === 2) doubleDeck1Count = 10
        if (doubleDeck2Count === 2) doubleDeck2Count = 10
        if (doubleDeck3Count === 2) doubleDeck3Count = 10
        let score = document.querySelector('.ship-score-2-computer div').textContent
        document.querySelector('.ship-score-2-computer div').innerHTML = --score
    }
    if (threeDeck1Count === 3 || threeDeck2Count === 3) {
        fillInfoDisplay(`${innerHtmls['infoDisplay'][3][currentLanguage]}`)
        fillDestroyedShip(id)
        if (threeDeck1Count === 3) threeDeck1Count = 10
        if (threeDeck2Count === 3) threeDeck2Count = 10
        let score = document.querySelector('.ship-score-3-computer div').textContent
        document.querySelector('.ship-score-3-computer div').innerHTML = --score
    }
    if (fourDeck1Count === 4) {
        fillInfoDisplay(`${innerHtmls['infoDisplay'][4][currentLanguage]}`)
        fillDestroyedShip(id)
        fourDeck1Count = 10
        let score = document.querySelector('.ship-score-4-computer div').textContent
        document.querySelector('.ship-score-4-computer div').innerHTML = --score
    }
    if (uSingleDeck1Count === 1 || uSingleDeck2Count === 1 || uSingleDeck3Count === 1 || uSingleDeck4Count === 1) {
        fillInfoDisplay(`${enemy} ${innerHtmls['infoDisplay'][5][currentLanguage]}`)
        injureShotsComputer.forEach(inj => notAllowedShotComputer = fillBusy(inj, notAllowedShotComputer))
        injureShotsComputer = []
        if (uSingleDeck1Count === 1) uSingleDeck1Count = 10
        if (uSingleDeck2Count === 1) uSingleDeck2Count = 10
        if (uSingleDeck3Count === 1) uSingleDeck3Count = 10
        if (uSingleDeck4Count === 1) uSingleDeck4Count = 10
        let score = document.querySelector('.ship-score-1-user div').textContent
        document.querySelector('.ship-score-1-user div').innerHTML = --score
    }
    if (uDoubleDeck1Count === 2 || uDoubleDeck2Count === 2 || uDoubleDeck3Count === 2) {
        fillInfoDisplay(`${enemy} ${innerHtmls['infoDisplay'][6][currentLanguage]}`)
        injureShotsComputer.forEach(inj => notAllowedShotComputer = fillBusy(inj, notAllowedShotComputer))
        injureShotsComputer = []
        if (uDoubleDeck1Count === 2) uDoubleDeck1Count = 10
        if (uDoubleDeck2Count === 2) uDoubleDeck2Count = 10
        if (uDoubleDeck3Count === 2) uDoubleDeck3Count = 10
        let score = document.querySelector('.ship-score-2-user div').textContent
        document.querySelector('.ship-score-2-user div').innerHTML = --score
    }
    if (uThreeDeck1Count === 3 || uThreeDeck2Count === 3) {
        fillInfoDisplay(`${enemy} ${innerHtmls['infoDisplay'][7][currentLanguage]}`)
        injureShotsComputer.forEach(inj => notAllowedShotComputer = fillBusy(inj, notAllowedShotComputer))
        injureShotsComputer = []
        if (uThreeDeck1Count === 3) uThreeDeck1Count = 10
        if (uThreeDeck2Count === 3) uThreeDeck2Count = 10
        let score = document.querySelector('.ship-score-3-user div').textContent
        document.querySelector('.ship-score-3-user div').innerHTML = --score
    }
    if (uFourDeck1Count === 4) {
        fillInfoDisplay(`${enemy} ${innerHtmls['infoDisplay'][8][currentLanguage]}`)
        injureShotsComputer.forEach(inj => notAllowedShotComputer = fillBusy(inj, notAllowedShotComputer))
        injureShotsComputer = []
        uFourDeck1Count = 10;
        let score = document.querySelector('.ship-score-4-user div').textContent
        document.querySelector('.ship-score-4-user div').innerHTML = --score
    }

    totalEnemyDamage = singleDeck1Count+singleDeck2Count+singleDeck3Count+singleDeck4Count
        +doubleDeck1Count+doubleDeck2Count+doubleDeck3Count+threeDeck1Count+threeDeck2Count+fourDeck1Count;
    totalUserDamage = uSingleDeck1Count+uSingleDeck2Count+uSingleDeck3Count+uSingleDeck4Count
        +uDoubleDeck1Count+uDoubleDeck2Count+uDoubleDeck3Count+uThreeDeck1Count+uThreeDeck2Count+uFourDeck1Count;
    
    if (totalEnemyDamage === 100) {
        turnDisplay.innerHTML = innerHtmls['turnDisplay'][2][currentLanguage]
        gameOver()
    }
    if (totalUserDamage === 100) {
        turnDisplay.innerHTML = innerHtmls['turnDisplay'][3][currentLanguage]
        gameOver()
    }
}

// Функція завершення гри
function gameOver() {
    isGameOver = true
    replayButton.style.display = 'block'
    exitButton.style.display = 'block'
    clearInterval(currentInterval)
    timerElement.style.display = 'none'
    // Надсилання "живих" кораблів
    let sendBoardIds = []
    sendBoardIds = [].slice.call(userGrid.children).filter(s => s.classList.contains('taken') && !s.classList.contains('boom'))
    if (gameMode !== 'singleplayer') socket.emit('send-board', sendBoardIds.map(s => s.dataset.id))
    else showEnemyBoard(Object.keys(shipsComputer))
}

// Функція установки недоступних клітинок після встановлення корабля
function fillBusy(busyId, busyIds_) {
    busyIds_.push(busyId)
    busyIds_.push(busyId+width)
    busyIds_.push(busyId-width)
    if (busyId%width < (busyId+1)%width) {
        busyIds_.push(busyId+1)
        busyIds_.push(busyId+1+width)
        busyIds_.push(busyId+1-width)
    }
    if (busyId%width > (busyId-1)%width && busyId !== 0) {
        busyIds_.push(busyId-1)
        busyIds_.push(busyId-1+width)
        busyIds_.push(busyId-1-width)
    }
    busyIds_ = busyIds_.filter(b => 0 <= b && b <= 99)
    busyIds_ = [...new Set(busyIds_)]
    return busyIds_
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
    isShotAnimation = false
    countClickOnBoard = 0
    totalEnemyDamage = 0
    totalUserDamage = 0
    shotFired = -1
    busyIds = []
    boomedShipsIds = []
    shipsComputer = {}
    notAllowedShotComputer = []
    injureShotsComputer = []
    timerCount = gameMode !== 'singleplayer' ? 0 : 2

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
    clearInterval(currentInterval)
    timerElement.style.display = 'none'
    document.querySelector('.scores').style.display = 'none'
    refillScore()
    mobileSizing(wdWidth, gameBegin, currentPlayer)

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


function waitForAnimation(element) {
    return new Promise(resolve => {
        return element.addEventListener("animationend", resolve, {once: true})
    })
}

function setPause(sec) {
    return new Promise(resolve => {
        return setTimeout(resolve, sec*1000);
    })
}

let timerCount
let currentInterval
function setTimer(secs) {
    clearInterval(currentInterval)
    socket.emit('set-timer', secs)
    secs--
    currentInterval = setInterval(function() {
        if (secs <= 0) {
            socket.emit('timer-out')
        } else {
            socket.emit('set-timer', secs)
            secs--
        }
    }, 1000)
}
function setTimerCount(num) {
    timerCount = num
    timerElement.querySelector('span').innerHTML = num - 1
}
function timerOut() {
    currentPlayer = currentPlayer === 'user' ? 'enemy' : 'user'
    mobileSizing(wdWidth, gameBegin, currentPlayer)
    playGameMulti(socket)
}