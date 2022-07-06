
export function mobileSizing(widthSize, gameBegin, isInGame, currentPlayer) {
    // console.log(widthSize);
    if (widthSize <= 1260) size_1260()
    else more_size_1260()

    if (widthSize <= 900) size_900(gameBegin, isInGame, currentPlayer)
    else more_size_900()

    if(widthSize <= 575) size_575()
    else more_size_575(gameBegin, currentPlayer)
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
function size_900(gameBegin, isInGame, currentPlayer) {
    if (!isInGame) return
    if (gameBegin) changeGrid(currentPlayer === 'user')
    else {
        const enemyContainer = document.querySelector('.enemy-container')
        const userContainer = document.querySelector('.user-container')
        userContainer.style.display = 'block'
        enemyContainer.style.display = 'none'
    }
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
    userContainer.style.display = 'block'
    enemyContainer.style.display = 'block'
    enemyContainer.style.order = 3
    boardButtons.style.order = 2
    userContainer.style.order = 1
}
function more_size_575(gameBegin, currentPlayer) {
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
        userContainer.style.display = 'none'
        enemyContainer.style.display = 'block'
        enemyContainer.style.order = 1
        boardButtons.style.order = 2
        userContainer.style.order = 3
    } else {
        userContainer.style.display = 'block'
        enemyContainer.style.display = 'none'
        enemyContainer.style.order = 3
        boardButtons.style.order = 2
        userContainer.style.order = 1
    }
}