// ---------- ---------- ---------- ---------- ---------- //
// S I M P L I F I E D   A P P   E N T R Y   P O I N T //
// ---------- ---------- ---------- ---------- ---------- //
//
// Simplified version to test Barba.js functionality

// CSS for app integration on site
import './../css/main.scss'

// Simple loading state
let animBarba, animGsap, customCookieConsent;
let modulesLoaded = false;

// Load animation modules
async function loadAnimationModules() {
    try {
        console.log('Loading animation modules...');
        
        const [animGsapModule, animBarbaModule, cookieConsentModule] = await Promise.all([
            import('./animation/animGsap.mjs'),
            import('./animation/animBarba.mjs'),
            import('./cookieconsent.js')
        ]);

        animGsap = animGsapModule.animGsap;
        animBarba = animBarbaModule.animBarba;
        customCookieConsent = cookieConsentModule.default;
        
        modulesLoaded = true;
        console.log('All modules loaded successfully');
        
        // Initialize immediately when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp, { passive: true });
        } else {
            initializeApp();
        }
        
    } catch (error) {
        console.error('Failed to load modules:', error);
    }
}

// Wait for CDN libraries to load
function waitForLibraries() {
    return new Promise((resolve) => {
        const checkLibraries = () => {
            const barbaReady = typeof window.barba !== 'undefined';
            const gsapReady = typeof window.gsap !== 'undefined';
            const scrollTriggerReady = typeof window.ScrollTrigger !== 'undefined';
            
            console.log('Library check:', { barbaReady, gsapReady, scrollTriggerReady });
            
            if (barbaReady && gsapReady && scrollTriggerReady) {
                console.log('✅ All CDN libraries loaded');
                resolve();
            } else {
                console.log('⏳ Waiting for CDN libraries...');
                setTimeout(checkLibraries, 100);
            }
        };
        
        checkLibraries();
    });
}

// Initialize the app
async function initializeApp() {
    if (!modulesLoaded) {
        console.log('Modules not loaded yet, waiting...');
        return;
    }
    
    console.log('Initializing app...');
    
    // Wait for CDN libraries to be available
    await waitForLibraries();
    
    console.log('Barba available:', typeof window.barba !== 'undefined');
    console.log('GSAP available:', typeof window.gsap !== 'undefined');
    console.log('Loading screen element exists:', !!document.querySelector('.loadingScreen'));
    
    // Initialize Barba first
    if (animBarba && typeof window.barba !== 'undefined') {
        try {
            animBarba();
            console.log('✅ Barba initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing Barba:', error);
        }
    } else {
        console.error('❌ Barba not available or animBarba function missing');
    }
    
    // Initialize GSAP animations
    if (animGsap && typeof window.gsap !== 'undefined') {
        try {
            animGsap();
            console.log('✅ GSAP animations initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing GSAP:', error);
        }
    } else {
        console.error('❌ GSAP not available or animGsap function missing');
    }
    
    // Show content
    document.documentElement.classList.remove('is-loading');
    document.documentElement.classList.add('js-ready');
    
    console.log('✅ App initialization complete');
}

// Start loading
loadAnimationModules();

// Fallback timeout
setTimeout(() => {
    if (!modulesLoaded) {
        console.warn('⚠️ Module loading timeout, forcing display');
        document.documentElement.classList.remove('is-loading');
        document.documentElement.classList.add('js-ready');
    }
}, 3000);
