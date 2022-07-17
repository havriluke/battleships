import Swiper from 'https://unpkg.com/swiper@8/swiper-bundle.esm.browser.min.js'

const swiper = new Swiper('.swiper', {

    // loop: true,
    initialSlide: 0,
    grabCursor: true,
    speed: 600,

    pagination: {
        el: '.swiper-pagination',
    },

    navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
    }
})
