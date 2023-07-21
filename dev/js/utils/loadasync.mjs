// ### TODO ### Check if this is actually the best way to load the script this way.
// ### TODO ### REFACTOR ### Those two functions probably could be better rolled into one function

// ---------- ---------- ---------- ---------- ---------- //
// L O A D   A S Y N C //
// ---------- ---------- ---------- ---------- ---------- //
//
// Load Async with callback to propagate script availability to Webflow
//
export function loadAsync(src, callback) {
    // creates a <script> tag and appends it to the page head
    let script = document.createElement('script');
    // provide src of script to be loaded with callback
    script.src = src;

    // Fire callback onload
    script.onload = () => callback(script);

    // Append script to <head> of page
    document.head.append(script);
}

// ---------- ---------- ---------- ---------- ---------- //
// D Y N A M I C A L L Y   L O A D   J S   &   C S S //
// ---------- ---------- ---------- ---------- ---------- //
//
export function loadjscss(filename, filetype) {
    if (filetype == "js") { //if filename is a external JavaScript file
        var fileref = document.createElement('script')
        fileref.setAttribute("type", "text/javascript")
        fileref.setAttribute("src", filename)
    }
    else if (filetype == "css") { //if filename is an external CSS file
        var fileref = document.createElement("link")
        fileref.setAttribute("rel", "stylesheet")
        fileref.setAttribute("type", "text/css")
        fileref.setAttribute("href", filename)
    }
    if (typeof fileref != "undefined")
        document.getElementsByTagName("head")[0].appendChild(fileref)
}