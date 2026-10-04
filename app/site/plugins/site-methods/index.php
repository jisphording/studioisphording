<?php

use Kirby\Cms\Html;

// CUSTOM SITE METHODS
// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
//
// This "plugin" contains a few custom functions used across multiple pages on different sites.

// Templates that render a #webgl canvas (the canvas / canvas-minimal snippets).
// Only these pages load and modulepreload the Three.js chunks; PageMethodsTest
// fails if a template starts or stops rendering #webgl without updating this.
const WEBGL_TEMPLATES = ['moodboard', 'project.three'];

Kirby::plugin('studio-isphording/site-methods', [
  'siteMethods' => [

		// GET THUMBNAIL
		// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
		//
		// Helper function to get thumbnails with consistent crop/resize behavior
		'getThumbnail' => function ($file, $width, $height, $quality = 85) {
			$useCrop = kirby()->option('custom.images.use_crop', false);
			
			if ($useCrop) {
				return $file->crop($width, $height, $quality);
			} else {
				return $file->thumb([
					'width' => $width,
					'height' => $height,
					'quality' => $quality
				]);
			}
		},

		// GET RESPONSIVE IMAGE
		// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
		//
		// Helper function to generate responsive image markup with multiple sizes
		// IMPORTANT: These sizes and quality settings are generated on demand by Kirby's own crop()/thumb() (see getThumbnail() above)
		// $priority marks the element as the (or one of the) LCP candidate(s): it
		// renders loading="eager" fetchpriority="high" instead of the default
		// loading="lazy". Callers should reserve it for the images actually
		// visible above the fold.
		'getResponsiveImage' => function ($image, $alt, $class = '', $sizes = null, $priority = false) {
			// [width, height, quality] per breakpoint, mobile/low-res first, matching media cache exactly.
			// Pruned from ten steps (490..4320) to six (480..2560): nothing on
			// this site renders wider than a 2560 CSS-pixel box, so the
			// 3200/3840/4320 tier was pure waste. Quality 82 replaces the old
			// flat 99 for the 1600w+ JPEG fallback tier — a defensible
			// stopgap until the encoder pipeline (phase 3+) owns quality
			// targeting via SSIMULACRA2.
			$sizeTable = [
				[480, 384, 60],
				[800, 640, 75],
				[1200, 960, 90],
				[1600, 1280, 82],
				[2000, 1600, 82],
				[2560, 2048, 82],
			];

			$thumbs = [];
			foreach ($sizeTable as [$width, $height, $quality]) {
				$thumbs[] = kirby()->site()->getThumbnail($image, $width, $height, $quality);
			}

			$srcset = implode(', ', array_map(
				fn ($thumb, $size) => $thumb->url() . ' ' . $size[0] . 'w',
				$thumbs,
				$sizeTable
			));

			// Default sizes attribute if not provided: single column below
			// 1025px, two columns at ~46vw (4vw gap) from 1025px up (see
			// .showcase__grid in dev/css/templates/_projects-showcase.scss).
			// Both figures are inflated by the relevant CSS `scale` transform
			// so srcset still picks a large-enough candidate for the
			// on-screen (post-transform) size: 1.4x below 1025px, where
			// `.showreel img { scale: 1.4 }` dominates, and 1.1x from 1025px
			// up, where the grid's hover zoom (`.showcase__grid--item:hover
			// img { scale: 1.1 }`) is the largest render.
			if (!$sizes) {
				$sizes = mediaDefaultSizes();
			}

			$attributes = [
				'srcset'  => $srcset,
				'sizes'   => $sizes,
				'alt'     => (string)$alt,
				'class'   => $class,
				'loading' => $priority ? 'eager' : 'lazy',
			];

			if ($priority) {
				$attributes['fetchpriority'] = 'high';
			}

			return Html::img($thumbs[0]->url(), $attributes);
		}
  ], // end site methods

  'pageMethods' => [

		// KEYVISUAL
		// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
		//
		// The page's keyvisual image (first file whose name contains "_keyvisual"),
		// or null when the page has none. The showcase-grid and related-grid
		// snippets both use it instead of repeating the filterBy() lookup.
		'keyvisual' => function () {
			return $this->images()->filterBy('filename', '*=', '_keyvisual')->first();
		},

		// RENDERS WEBGL
		// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
		//
		// Whether the page's template renders the #webgl canvas, i.e. whether
		// the header should modulepreload the Three.js chunks (see vite()).
		'rendersWebgl' => function (): bool {
			return in_array($this->template()->name(), WEBGL_TEMPLATES, true);
		}
  ]
]);
