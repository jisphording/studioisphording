<?php

/**
 * Media Manifest Plugin
 *
 * Reads app/assets/media/manifest.json, written by the build-time media
 * pipeline (scripts/media/), and resolves a content file to its AVIF / WebP /
 * JPEG variants. Modelled on the vite-manifest plugin: the file is read once
 * per request and statically cached.
 *
 * The schema is specified in scripts/media/manifest.mjs. A file absent from
 * the manifest (or an absent manifest) is not an error: lookups return null /
 * empty and callers fall back to Kirby's thumb path.
 */

/**
 * The default `sizes` attribute for grid images: single column below 1025px,
 * two columns at ~46vw (4vw gap) from 1025px up, both inflated by the CSS
 * `scale` transforms (see dev/css/templates/_projects-showcase.scss).
 *
 * @return string
 */
function mediaDefaultSizes() {
	return '(max-width: 1024px) 140vw, 50.6vw';
}

/**
 * Retrieves the decoded media manifest. Cached per manifest path.
 *
 * @return array The decoded manifest, or an empty array if absent or invalid.
 */
function getMediaManifest() {
	static $manifests = [];

	$path = kirby()->root('assets') . '/media/manifest.json';

	if (!array_key_exists($path, $manifests)) {
		$manifest = [];

		if (file_exists($path)) {
			$decoded = json_decode((string)file_get_contents($path), true);
			if (is_array($decoded)) {
				$manifest = $decoded;
			}
		}

		$manifests[$path] = $manifest;
	}

	return $manifests[$path];
}

/**
 * A content file's manifest key: its path relative to the content root
 * (forward slashes), which is what the pipeline writes; it is derived from
 * the file root so numbered folder prefixes match.
 *
 * @param \Kirby\Cms\File $file
 * @return string|null null when the file lies outside the content root
 */
function getMediaKey($file) {
	// realpath() on both sides: the content root may be reached through a symlink.
	$contentRoot = rtrim(str_replace('\\', '/', realpath(kirby()->root('content')) ?: kirby()->root('content')), '/') . '/';
	$root = str_replace('\\', '/', realpath($file->root()) ?: $file->root());

	return str_starts_with($root, $contentRoot) ? substr($root, strlen($contentRoot)) : null;
}

/**
 * Looks up a content file in the manifest.
 *
 * @param \Kirby\Cms\File $file
 * @return array|null The entry (width, height, eager, variants) or null on a miss.
 */
function getMediaEntry($file) {
	$images = getMediaManifest()['images'] ?? [];
	$key = $images ? getMediaKey($file) : null;
	$entry = $key !== null ? ($images[$key] ?? null) : null;

	return is_array($entry) && !empty($entry['variants']) ? $entry : null;
}

/**
 * Looks up a content video master in the manifest's `videos` map.
 *
 * @param \Kirby\Cms\File $file
 * @return array|null The entry (width, height, duration, poster, variants) or null on a miss.
 */
function getMediaVideoEntry($file) {
	$videos = getMediaManifest()['videos'] ?? [];
	$key = $videos ? getMediaKey($file) : null;
	$entry = $key !== null ? ($videos[$key] ?? null) : null;

	return is_array($entry) && !empty($entry['variants']) ? $entry : null;
}

/**
 * URL of a video entry's poster: the JPEG variant of its poster image entry
 * closest to (not below) $width, else the widest one. Null when the poster
 * is not in the manifest.
 *
 * @param array $videoEntry
 * @param int $width
 * @return string|null
 */
function getMediaPosterUrl($videoEntry, $width = 1920) {
	$poster = getMediaManifest()['images'][$videoEntry['poster'] ?? ''] ?? null;
	$jpegs = $poster ? (getMediaVariantsByFormat($poster)['jpeg'] ?? []) : [];
	if (!$jpegs) {
		return null;
	}

	$pick = end($jpegs);
	foreach ($jpegs as $variant) {
		if ($variant['width'] >= $width) {
			$pick = $variant;
			break;
		}
	}

	return mediaUrl($pick['url']);
}

/**
 * Groups an entry's variants by format, in manifest (width ascending) order.
 *
 * @param array $entry
 * @return array<string, array> format => variants
 */
function getMediaVariantsByFormat($entry) {
	$byFormat = [];
	foreach ($entry['variants'] ?? [] as $variant) {
		$byFormat[$variant['format']][] = $variant;
	}

	return $byFormat;
}

/**
 * Builds a srcset string ("url 480w, url 800w") from variants.
 *
 * @param array $variants
 * @return string
 */
function mediaSrcset($variants) {
	return implode(', ', array_map(
		fn ($variant) => mediaUrl($variant['url']) . ' ' . $variant['width'] . 'w',
		$variants
	));
}

/**
 * Full URL for a manifest variant url (relative to the web root).
 *
 * @param string $path e.g. "assets/media/home/x-480.avif"
 * @return string
 */
function mediaUrl($path) {
	return url($path);
}

Kirby::plugin('studioisphording/media-manifest', [
	'options' => [
		'cache' => true
	]
]);
