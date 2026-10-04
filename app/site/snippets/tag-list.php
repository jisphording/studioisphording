<?php
/**
 * Render <li> items for a page's comma-separated tags field.
 *
 * @var \Kirby\Content\Field|string $tags the tags field (or its value)
 *
 * Renders from the shared tag_items() helper (helpers plugin), the same as
 * create_tags(): each tag is trimmed, inner spaces are kept, empties are
 * skipped. Each tag is HTML-escaped. An empty field renders nothing.
 */
foreach (tag_items((string)($tags ?? '')) as $tag): ?>
	<li><?= esc($tag) ?></li>
<?php endforeach ?>
