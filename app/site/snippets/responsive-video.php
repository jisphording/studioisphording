<?php
/**
 * Responsive video: <video> whose sources come from the media manifest in
 * ladder order (AV1 WebM, VP9 WebM, H.264 MP4) so the browser takes the first
 * codec it can decode. A master the manifest does not know falls back to the
 * given plain file URLs, so this never emits a video without sources.
 *
 * @var \Kirby\Cms\File|null $file      the video master (manifest key); null = no lookup
 * @var array                $fallback  [['url' => ..., 'type' => ...], ...] used on a manifest miss
 * @var string|null          $poster    poster URL used on a manifest miss
 * @var string               $class
 * @var bool                 $hero      above the fold: no loading="lazy"
 * @var string               $preload   none|metadata|auto (default none)
 */
$file     = ($file ?? null) instanceof \Kirby\Cms\File ? $file : null;
$fallback = $fallback ?? [];
$poster   = $poster ?? null;
$class    = $class ?? '';
$hero     = !empty($hero);
$preload  = in_array($preload ?? 'none', ['none', 'metadata', 'auto'], true) ? ($preload ?? 'none') : 'none';

$entry   = $file ? getMediaVideoEntry($file) : null;
$sources = [];

if ($entry) {
	foreach ($entry['variants'] as $variant) {
		$sources[] = ['url' => mediaUrl($variant['url']), 'type' => $variant['type']];
	}
	$poster = getMediaPosterUrl($entry) ?? $poster;
} else {
	$sources = $fallback;
}

if (!$sources) {
	return;
}
?>
<video<?php if ($class !== ''): ?> class="<?= esc($class, 'attr') ?>"<?php endif ?> playsinline autoplay muted loop preload="<?= esc($preload, 'attr') ?>"<?= $hero ? '' : ' loading="lazy"' ?><?php if ($poster): ?> poster="<?= esc($poster, 'attr') ?>"<?php endif ?>>
	<?php foreach ($sources as $source): ?>
	<source src="<?= esc($source['url'], 'attr') ?>" type="<?= esc($source['type'], 'attr') ?>">
	<?php endforeach ?>
</video>
