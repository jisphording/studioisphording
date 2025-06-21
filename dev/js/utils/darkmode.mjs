// ---------- ---------- ---------- ---------- ---------- //
// D A R K M O D E //
// ---------- ---------- ---------- ---------- ---------- //
//
// Switch Website to Darkmode for better reading at night.
//

export function darkmode() {

    const darkmodeButton = document.getElementsByClassName( 'darkmode__toggle' )[0]
    const lightmodeButton = document.getElementsByClassName( 'lightmode__toggle' )[0]
    
    if ( darkmodeButton || lightmodeButton ) {
        const body = document.getElementsByTagName( 'html' )[0]

        /* SWITCH TO DARKMODE */
        darkmodeButton.addEventListener( 'click', function () {
            console.log("DARKMODE")
            
            lightmodeButton.classList.add( 'toggle--active' )
            darkmodeButton.classList.remove( 'toggle--active' )

            body.classList.add( 'darkmode' )
            body.classList.remove( 'lightmode' )
        })
        
        /* SWITCH TO LIGHTMODE */
        lightmodeButton.addEventListener( 'click', function () {
            console.log("LIGHTMODE")

            darkmodeButton.classList.add( 'toggle--active' )
            lightmodeButton.classList.remove( 'toggle--active' )

            body.classList.add( 'lightmode' )
            body.classList.remove( 'darkmode' )
        })
    }

} 