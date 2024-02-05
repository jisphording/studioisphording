// ---------- ---------- ---------- ---------- ---------- //
// G S A P //
// ---------- ---------- ---------- ---------- ---------- //
//
// Collecting smaller animations that are realised with gsap throughout the site
//

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger.js'

export function animGsap() {

    gsap.registerPlugin( ScrollTrigger );

    // Connect Parallax Layers
    let parallaxBack = document.getElementsByClassName( 'parallax__layer--back' )[ 0 ]
    let parallaxTitle = document.getElementsByClassName( 'parallax__layer--title' )[ 0 ]
    let parallaxFront = document.getElementsByClassName( 'parallax__layer--base' )[ 0 ]
    let parallaxTrigger = document.getElementsByClassName( 'parallax' )[ 0 ]

    gsap.to( parallaxBack, 
    {
        yPercent: 500,
        scale: 2,
        ease: 'none',
        scrollTrigger: 
        {
            trigger: parallaxTrigger,
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    })

    gsap.to( parallaxTitle, 
    {
        yPercent: 80,
        opacity: 0,
        ease: 'none',
        scrollTrigger: 
        {
            trigger: parallaxTitle,
            start: 'top top',
            end: 'bottom top',
            scrub: true
        }
    })
}
  