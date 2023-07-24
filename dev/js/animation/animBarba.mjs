// ---------- ---------- ---------- ---------- ---------- //
// B A R B A:   S C R E E N   T R A N S I T I O N //
// ---------- ---------- ---------- ---------- ---------- //
//
// Barba.js is used for easier page transitions 
//

import { animGsap } from './animGsap.mjs'

export function animBarba() {

    // INIT BARBA
    barba.init({
        transitions: [{
            async leave() {
                await loaderIn();
            },
            enter() {
                loaderAway();
            }
        }]
    });

    // REFERENCES
    const loader = document.querySelector('.loadingScreen');

    // RESET
    gsap.set( loader, 
    {
        scaleX: 0,
        xPercent: -5,
        yPercent: -50,
        transformOrigin: 'left center',
        autoAlpha: 1
    });

    // LOADER
    function loaderIn() {
        // GSAP tween to stretch the loading screen across the whole screen
        return new gsap.timeline()
            .fromTo( loader,
            {
                scaleX: 0,
                xPercent: -5
            },
            {
                duration: 0.8,
                xPercent: 0,
                scaleX: 1,
                ease: 'power4.inOut',
                transformOrigin: 'left center'
            })
    }

    function loaderAway() {
        // GSAP tween to hide loading screen
        return gsap.to( loader,
        {
            duration: 0.8,
            scaleX: 0,
            xPercent: 5,
            transformOrigin: 'right center',
            ease: 'power4.inOut'
        });
    }

    // BARBA TRANSITION HOOKS
    // do something BEFORE the transition starts
    barba.hooks.before(() => {
        document.querySelector('html').classList.add('is-transitioning')
        barba.wrapper.classList.add('is-animating')
        deleteExperience()
    });

    // Next page ENTER transition
    barba.hooks.enter(() => {
        // ### TODO ### This feels like a hack and has to be revised
        let showreel = document.getElementsByClassName( 'showreel' )[ 0 ]
        showreel.style.top = '0%'

        window.scrollTo(0, 0)
        animGsap()
    });

    // AFTER ENTER transition/view
    // Restart video autoplay after transition
    barba.hooks.afterEnter(() => {
        let videos = document.querySelectorAll( 'video' )
        
        videos.forEach( vid => { 
            let playPromise = vid.play() 
            
            if ( playPromise !== undefined ) 
            { 
                playPromise
                    .then( _ => {} )
                    .catch( error => {} ) 
            } 
        })
    });

    // AFTER everything
    barba.hooks.after(() => {
        document.querySelector('html').classList.remove('is-transitioning')
        barba.wrapper.classList.remove('is-animating')
    });
}