// ---------- ---------- ---------- ---------- ---------- //
// A P P   E N T R Y   P O I N T //
// ---------- ---------- ---------- ---------- ---------- //
//
// This is the main entry point for the app itself.
// This is the place to connect the app with the calling website/device
// All DOM-integrations can be created here.

// CSS for app integration on site
import './../css/main.scss'

// ANIMATION

// Animation - Hide Scrollbar
let lastScrollTop = 0;
let navbar = document.querySelector('.menu__main');

window.addEventListener("scroll", () => {
    let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    if (currentScroll > lastScrollTop) {
        navbar.classList.add('hide');
    } else {
        navbar.classList.remove('hide');
    }
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
}, false);

// Animation - Page Transitions
import { animBarba } from './animation/animBarba.mjs'
import { animGsap } from './animation/animGsap.mjs'

// Cookie Consent
import customCookieConsent from './cookieconsent.js'

// RELOAD PAGE
// Trigger Reload after Resize so everything looks correct
// This is a current workaround until I have the issue causing Barba script corrected.
let windowWidth = window.innerWidth;

window.addEventListener( "resize", ( event ) => {
    // Check window width has actually changed and it's not just iOS triggering a resize event on scroll
    if (window.innerWidth != windowWidth) {

        // Update the window width for next time
        windowWidth = window.innerWidth;

        location.reload()
    }
});

// RUN ANIMATION
// Check if document ready has already passed. If it has, run the animations. If not, wait for it to be ready.
if (document.readyState !== 'loading') {
    animGsap();
    if( windowWidth > 1025) 
    { 
        animBarba()
    }
} else {
    window.addEventListener( "DOMContentLoaded", ( event ) => {
        animGsap();
        if( windowWidth > 1025) 
        { 
            animBarba()
        }
    });
}