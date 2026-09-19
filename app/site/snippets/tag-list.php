<?php
/**
 * Render <li> items for a page's comma-separated tags field.
 *
 * @var \Kirby\Content\Field|string $tags the tags field (or its value)
 *
 * Behaviour is a verbatim move of the tag loop that lived inline in the
 * old related-pages site method: explode on ',' with NO trimming, so a
 * "R&D, Branding" field still yields the leading space on " Branding".
 * Each tag is HTML-escaped. An empty field renders nothing.
 */
$value = (string)($tags ?? '');
if ($value === '') {
	return;
}
$taglist = explode(',', $value);
foreach ($taglist as $tag): ?>
	<li><?= esc($tag) ?></li>
<?php endforeach ?>
