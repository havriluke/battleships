
export function mobileSizing(widthSize, gameBegin, currentPlayer) {
    // console.log(widthSize);
    if (widthSize <= 1260) size_1260()
    else more_size_1260()

    if (widthSize <= 900) size_900(gameBegin, currentPlayer)
    else more_size_900()

    if(widthSize <= 575) size_575()
    else more_size_575()
}

function size_1260() {
    const codeElement = document.querySelector('.game-code-cont')
    const boardButtons = document.querySelector('.board-buttons')
    const turn = document.querySelector('.turn')
    codeElement.remove()
    boardButtons.insertBefore(codeElement, turn)

    const players = document.querySelector('.players')
    const gameContainer = document.querySelector('.game__container')
    const gameContentContainer = document.querySelector('.game-content__container')
    players.remove()
    gameContainer.insertBefore(players, gameContentContainer)
}
function size_900(gameBegin, currentPlayer) {
    if (gameBegin) changeGrid(currentPlayer === 'user')
    else changeGrid(false)
}
function size_575() {
    const boards = document.querySelector('.boards')
    const boardButtons = document.querySelector('.board-buttons')
    const gridDisplay = document.querySelector('.grid-display')
    boardButtons.remove()
    boardButtons.style.flexDirection = 'row'
    boardButtons.style.flexWrap = 'wrap'
    boards.insertBefore(boardButtons, gridDisplay)
}

function more_size_1260() {
    const codeElement = document.querySelector('.game-code-cont')
    const gameContainer = document.querySelector('.game__container')
    const gameContentContainer = document.querySelector('.game-content__container')
    codeElement.remove()
    gameContainer.insertBefore(codeElement, gameContentContainer)
}
function more_size_900() {
    const enemyContainer = document.querySelector('.enemy-container')
    const userContainer = document.querySelector('.user-container')
    const boardButtons = document.querySelector('.board-buttons')
    userContainer.classList.remove('grid-invisible')
    enemyContainer.classList.remove('grid-invisible')
    userContainer.classList.remove('grid-visible')
    enemyContainer.classList.remove('grid-visible')
    enemyContainer.style.order = 3
    boardButtons.style.order = 2
    userContainer.style.order = 1

    document.querySelectorAll('.grid-user > div').forEach(cell => cell.classList.remove('draged-over'))
    document.querySelectorAll('.ship').forEach(ship => ship.classList.remove('dragged'))
    if (document.querySelector('.ship')) {
        document.querySelector('#rotate').style.display = 'block'
        document.querySelector('#set-ship').style.display = 'none'
    }
}
function more_size_575() {
    const enemyContainer = document.querySelector('.enemy-container')
    const boardButtons = document.querySelector('.board-buttons')
    const boardsContainer = document.querySelector('.boards__container')
    boardButtons.remove()
    boardButtons.style.flexDirection = 'column'
    boardButtons.style.flexWrap = 'no-wrap'
    boardsContainer.insertBefore(boardButtons, enemyContainer)
}

export function changeGrid(isYourTurn) {
    const enemyContainer = document.querySelector('.enemy-container')
    const userContainer = document.querySelector('.user-container')
    const boardButtons = document.querySelector('.board-buttons')
    if (isYourTurn) {
        userContainer.classList.add('grid-invisible')
        enemyContainer.classList.remove('grid-invisible')
        userContainer.classList.remove('grid-visible')
        enemyContainer.classList.add('grid-visible')
        enemyContainer.style.order = 1
        boardButtons.style.order = 2
        userContainer.style.order = 3
    } else {
        userContainer.classList.remove('grid-invisible')
        enemyContainer.classList.add('grid-invisible')
        userContainer.classList.add('grid-visible')
        enemyContainer.classList.remove('grid-visible')
        enemyContainer.style.order = 3
        boardButtons.style.order = 2
        userContainer.style.order = 1
    }
}
