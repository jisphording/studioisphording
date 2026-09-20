import { animGsap } from '../animGsap.mjs'

/**
 * Prepare the new page by initializing animations and resources
 * @param {Object} ScrollTrigger - ScrollTrigger instance
 * @returns {Promise} Promise that resolves when page is ready
 */
export function prepareNewPage(ScrollTrigger) {
    return new Promise(resolve => {
        // Two requestAnimationFrame ticks let the browser paint the new
        // container before the wipe opens. (The real asset-readiness signal
        // lives in readiness.mjs; no fixed setTimeout stands in for one here.)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // The outgoing container was removed at the end of leave(), so
                // these all run against the new container only.
                animGsap();

                // Restart video autoplay
                restartVideos();

                // ScrollTrigger.refresh() restores the scroll position it
                // remembered from the outgoing page, undoing the reset done in
                // resetPageElements(). Drop that memory, then pin the new page
                // to the top once the refresh has run.
                ScrollTrigger.clearScrollMemory?.();
                ScrollTrigger.refresh();
                window.scrollTo(0, 0);
                console.log('Barba: New page ready, resolving enter transition');
                resolve();
            });
        });
    });
}

/**
 * Keep the incoming page at the top while the loader covers it.
 *
 * ScrollTrigger records the scroll position at the start of every refresh and
 * restores it at the end, and animGsap() queues a further refresh after
 * prepareNewPage() has run - so a one-off scrollTo(0, 0) gets undone and the
 * new page is revealed part-way down. Pinning on every 'refresh' event wins
 * regardless of how many refreshes fire.
 * @param {Object} ScrollTrigger - ScrollTrigger instance
 * @returns {Function} Call to stop pinning (once the reveal has finished)
 */
export function pinScrollToTop(ScrollTrigger) {
    const pin = () => window.scrollTo(0, 0);
    ScrollTrigger.addEventListener?.('refresh', pin);
    return () => ScrollTrigger.removeEventListener?.('refresh', pin);
}

/**
 * Warn loudly if the DOM does not hold exactly one Barba container before the
 * reveal. With the outgoing container removed at the end of leave() and the new
 * one appended by Barba, the count must be 1 for the whole animateLoaderOut
 * tween - anything else means the reveal can flash the page we just left.
 */
export function assertSingleContainer() {
    const count = document.querySelectorAll('[data-barba="container"]').length;
    if (count !== 1) {
        console.warn(`Barba: expected exactly 1 container before the reveal, found ${count} - the outgoing page may flash during animateLoaderOut`);
    }
}

/**
 * Restart video autoplay for all video elements on the new page
 */
export function restartVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(vid => { 
        const playPromise = vid.play();
        if (playPromise !== undefined) { 
            playPromise.catch(error => {
                console.log('Video autoplay prevented:', error);
            }); 
        } 
    });
}

/**
 * Add CSS classes during transition
 */
export function addTransitionClasses() {
    document.querySelector('html').classList.add('is-transitioning');
    const wrapper = window.barba?.wrapper;
    if (wrapper) {
        wrapper.classList.add('is-animating');
    }
}

/**
 * Remove CSS classes after transition
 */
export function removeTransitionClasses() {
    document.querySelector('html').classList.remove('is-transitioning');
    const wrapper = window.barba?.wrapper;
    if (wrapper) {
        wrapper.classList.remove('is-animating');
    }
}

/**
 * Copy the incoming page's page--<slug> class onto <html>.
 *
 * The class is rendered server-side on <html>, which Barba never swaps, so
 * without this the origin page's class (and the page-specific backgrounds keyed
 * on it) would stay applied to the destination. Other <html> classes
 * (lightmode/darkmode, js-ready, transition state) are left alone.
 * @param {string} nextHtml - Full HTML string of the incoming page (barba data.next.html)
 */
export function syncPageClass(nextHtml) {
    if (typeof nextHtml !== 'string') return;
    const match = nextHtml.match(/<html\b[^>]*\bclass\s*=\s*(["'])(.*?)\1/is);
    const nextClasses = match ? match[2].split(/\s+/).filter(c => c.startsWith('page--')) : [];
    const root = document.documentElement;
    [...root.classList].filter(c => c.startsWith('page--')).forEach(c => root.classList.remove(c));
    nextClasses.forEach(c => root.classList.add(c));
}

/**
 * Reset page elements to their initial state
 */
export function resetPageElements() {
    // Reset scroll position
    window.scrollTo(0, 0);
    
    // Reset showreel position
    const showreel = document.querySelector('.showreel');
    if (showreel) {
        showreel.style.top = '0%';
    }
    
    // Reset parallax elements
    resetParallaxElements();
}

/**
 * Reset parallax elements to their initial positions
 */
export function resetParallaxElements() {
    const parallaxTitle = document.querySelector('.parallax__layer--title');
    if (parallaxTitle) {
        parallaxTitle.style.transform = '';
        parallaxTitle.style.opacity = '1';
    }
    
    const parallaxBack = document.querySelector('.parallax__layer--back');
    if (parallaxBack) {
        parallaxBack.style.transform = '';
    }
}
