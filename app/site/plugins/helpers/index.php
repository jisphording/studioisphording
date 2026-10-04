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

if (!function_exists('tag_items')) {
	// TAG ITEMS
	// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //
	/**
	 * Split a comma-separated tags field into clean tag names: each is
	 * trimmed, inner spaces are kept ('Brand Design' stays two words) and
	 * empties are dropped. The one explode-on-comma for tags in app/site.
	 * @param {string} $tags - The raw tags field value.
	 * @return {string[]} - The tag names, unescaped.
	 */
	function tag_items(string $tags): array
	{
		return array_values(array_filter(
			array_map('trim', explode(',', $tags)),
			fn ($tag) => $tag !== ''
		));
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
		$items = '';
		foreach (tag_items((string)$tags) as $tag) {
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

		// TITLE TEXT
		// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //
		/**
		 * Plain-text version of a title for contexts that cannot render
		 * markup (<title>, data-* and alt attributes): <br> becomes a space,
		 * every other tag is stripped and whitespace is collapsed.
		 *
		 * $context picks the escaping: 'html' (default) and 'attr' escape for
		 * that context; 'raw' returns unescaped text for values handed to a
		 * snippet that escapes them itself (e.g. responsive-image's $alt).
		 *
		 * Usage: <title><?= $page->title()->titleText() ?></title>
		 */
		'titleText' => function ($field, string $context = 'html') {
			$text = preg_replace('/<br\s*\/?>/i', ' ', (string)$field->value);
			$text = trim(preg_replace('/\s+/', ' ', strip_tags($text)));

			$field->value = $context === 'raw' ? $text : esc($text, $context);

			return $field;
		},
	],
]);
