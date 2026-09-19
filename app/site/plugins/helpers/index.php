<?php
// ---------- ---------- ---------- ---------- ---------- //
// P H P   U T I L I T I E S //
// ---------- ---------- ---------- ---------- ---------- //
//
// This file contains a few small utility functions in php that are used inside this Kirby project.

if (!function_exists('remove_br_tags')) {
	// STRIP ALL <BR> TAGS
	// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //
	/**
	 * Strip all <br> tags from an input text.
	 *
	 * @param {string} $text - The input the <br> tags should be stripped from.
	 * @return {string} - A string that has all <br> tags removed.
	 */
	function remove_br_tags($text)
	{
		return preg_replace('/<br\W*?\/>/', '', $text);
	}
}

if (!function_exists('create_tags')) {
	// CREATE TAGS LIST
	// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //
	/**
	 * Create an html list from the tags that are saved for the text in Kirby markdown.
	 * @param {string} $tags - The input field from Kirby markdown.
	 * @return {string} - The <li> markup for every tag, escaped.
	 */
	function create_tags($tags)
	{
		// Remove whitespace from string
		$tags = str_replace(' ', '', $tags);

		// Put tag list from kirby into array
		$tag_list = explode(',', $tags);

		// Create <li> markup for every non-empty element in array
		$items = '';
		foreach ($tag_list as $tag) {
			if ($tag === '') {
				continue;
			}
			$items .= '<li>' . esc($tag) . '</li>';
		}

		return $items;
	}
}

Kirby::plugin('studio-isphording/helpers', [
	'fieldMethods' => [
		// TITLE HTML
		// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //
		/**
		 * HTML-escape a title field, then restore the only inline markup
		 * titles are authored with: bare <mark>…</mark> highlights (project
		 * titles) and <br> / <br/> / <br /> line breaks (titlelong). Anything
		 * else — attributes on <mark>, other tags, &, quotes — stays escaped.
		 *
		 * Usage: <?= $page->title()->titleHtml() ?>
		 */
		'titleHtml' => function ($field) {
			$field->value = preg_replace(
				'/&lt;(\/?mark|br\s*\/?)&gt;/',
				'<$1>',
				esc((string)$field->value)
			);

			return $field;
		},
	],
]);
