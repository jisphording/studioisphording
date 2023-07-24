// ---------- ---------- ---------- ---------- ---------- //
// A P P   E N T R Y   P O I N T //
// ---------- ---------- ---------- ---------- ---------- //
//
// This is the main entry point for the app itself.
// This is the place to connect the app with the calling website/device
// All DOM-integrations can be created here.

// CSS for app integration on site
import './../css/main.scss'

// Animation - Page Transitions
import { animBarba } from './animation/animBarba.mjs'
import { animGsap } from './animation/animGsap.mjs'

// Run Everything
window.addEventListener( "DOMContentLoaded", ( event ) => {
    animGsap(),
    animBarba()
});

// Cookie Consent
import customCookieConsent from './cookieconsent.js'