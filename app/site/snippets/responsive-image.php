<?php
/**
 * Responsive image: <picture> with AVIF, WebP and JPEG sources from the media
 * manifest. A file the manifest does not know (or knows without a JPEG)
 * falls back to the thumb-based getResponsiveImage() output, so this never
 * emits a broken image.
 *
 * @var \Kirby\Cms\File $file
 * @var string          $alt
 * @var string          $class
 * @var string|null     $sizes  defaults to mediaDefaultSizes()
 * @var bool            $eager  LCP candidate: loading="eager" fetchpriority="high"
 * @var object          $site   optional stand-in for kirby()->site()
 */
$alt   = $alt ?? '';
$class = $class ?? '';
$sizes = !empty($sizes) ? $sizes : mediaDefaultSizes();
$eager = !empty($eager);
$site  = $site ?? kirby()->site();

$entry     = getMediaEntry($file);
$byFormat  = $entry ? getMediaVariantsByFormat($entry) : [];
$fallbacks = $byFormat['jpeg'] ?? [];

if (!$entry || !$fallbacks) {
	echo $site->getResponsiveImage($file, $alt, $class, $sizes, $eager);
	return;
}

$sources = [
	'image/avif' => $byFormat['avif'] ?? [],
	'image/webp' => $byFormat['webp'] ?? [],
];
?>
<picture>
	<?php foreach ($sources as $type => $variants): if (!$variants) continue; ?>
	<source type="<?= esc($type, 'attr') ?>" srcset="<?= esc(mediaSrcset($variants), 'attr') ?>" sizes="<?= esc($sizes, 'attr') ?>">
	<?php endforeach ?>
	<img src="<?= esc(mediaUrl($fallbacks[0]['url']), 'attr') ?>" srcset="<?= esc(mediaSrcset($fallbacks), 'attr') ?>" sizes="<?= esc($sizes, 'attr') ?>" width="<?= esc((int)$entry['width'], 'attr') ?>" height="<?= esc((int)$entry['height'], 'attr') ?>" alt="<?= esc((string)$alt, 'attr') ?>" class="<?= esc((string)$class, 'attr') ?>" loading="<?= $eager ? 'eager' : 'lazy' ?>"<?= $eager ? ' fetchpriority="high"' : '' ?>>
</picture>
