<?php

use Kirby\Cms\Html;

// CUSTOM SITE METHODS
// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
//
// This "plugin" contains a few custom functions used across multiple pages on different sites.

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
		'getResponsiveImage' => function ($image, $alt, $class = '', $sizes = null) {
			// [width, height, quality] per breakpoint, mobile/low-res first, matching media cache exactly
			$sizeTable = [
				[490, 390, 60],
				[800, 640, 75],
				[1200, 960, 90],
				[1600, 1280, 99],
				[1920, 1536, 99],
				[2160, 1728, 99],
				[2560, 2048, 99],
				[3200, 2560, 99],
				[3840, 3072, 99],
				[4320, 3456, 99],
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

			// Default sizes attribute if not provided
			if (!$sizes) {
				$sizes = "(max-width: 768px) 490px, (max-width: 1024px) 800px, (max-width: 1440px) 1200px, (max-width: 1920px) 1600px, (max-width: 2160px) 1920px, (max-width: 2560px) 2160px, (max-width: 3200px) 2560px, (max-width: 3840px) 3200px, (max-width: 4320px) 3840px, 4320px";
			}

			return Html::img($thumbs[0]->url(), [
				'srcset'  => $srcset,
				'sizes'   => $sizes,
				'alt'     => (string)$alt,
				'class'   => $class,
				'loading' => 'lazy',
			]);
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
		}
  ]
]);
