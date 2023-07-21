<?php
// ---------- ---------- ---------- ---------- ---------- //
// P H P   U T I L I T I E S //
// ---------- ---------- ---------- ---------- ---------- //
//
// This file contains a few small utility functions in php that are used inside this Kirby project.

// STRIP ALL <BR> TAGS
// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //
/**
 * Strip all <br> tags from an input text.
 * 
 * @param {string} $text - The input the <br> tags should be stripped from.
 * @return {string} - A string that has all <br> tags removed.
 */
function remove_br_tags( $text ) 
{
    return preg_replace('/<br\W*?\/>/', '', $text );
} 

// CREATE TAGS LIST
// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //
/**
 * Create an html list from the tags that are saved for the text in Kirby markdown.
 * @param {string} $tags - The input field from Kirby markdown.
 */
function create_tags( $tags )
{
    // Give PHP ability to manipulate DOM
    // Create new document with specified version number
    $dom = new DOMDocument('1.0');

    // Remove whitespace from string
    $tags = str_replace( ' ', '', $tags);

    // Put tag list from kirby into array
    $tag_list = explode( ',', $tags );

    // Create <li> tag for every element in array
    foreach( $tag_list as $tag ) 
    {
        $li = $dom->createElement( 'li', $tag );
        $dom->appendChild( $li );      
    }

    // Outputs the generated source code
    echo $dom->saveHTML();
}

?>