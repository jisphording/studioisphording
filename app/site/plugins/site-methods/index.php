<?php

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
		// IMPORTANT: These sizes and quality settings must match exactly with utils/build-media-cache.php
		'getResponsiveImage' => function ($image, $alt, $class = '', $sizes = null) {
			// Generate multiple image sizes for responsive display - matching media cache exactly
			$thumbSmall = kirby()->site()->getThumbnail($image, 490, 390, 60);     // Small: mobile and low-res displays
			$thumbMedium = kirby()->site()->getThumbnail($image, 800, 640, 75);    // Medium: tablets and standard displays  
			$thumbLarge = kirby()->site()->getThumbnail($image, 1200, 960, 90);    // Large: desktop and high-res displays
			$thumbXL = kirby()->site()->getThumbnail($image, 1600, 1280, 99);      // Extra Large: high-DPI displays (2x)
			$thumbXXL = kirby()->site()->getThumbnail($image, 1920, 1536, 99);     // XXL: Full HD high-DPI displays
			$thumbUHD = kirby()->site()->getThumbnail($image, 2160, 1728, 99);     // UHD: Ultra high-resolution displays
			$thumb2K = kirby()->site()->getThumbnail($image, 2560, 2048, 99);      // 2K: Large 4K displays
			$thumb3K = kirby()->site()->getThumbnail($image, 3200, 2560, 99);      // 3K: Ultra large displays
			$thumb4K = kirby()->site()->getThumbnail($image, 3840, 3072, 99);      // 4K: Maximum resolution displays
			$thumb5K = kirby()->site()->getThumbnail($image, 4320, 3456, 99);      // 5K: Professional displays
			
			// Default sizes attribute if not provided
			if (!$sizes) {
				$sizes = "(max-width: 768px) 490px, (max-width: 1024px) 800px, (max-width: 1440px) 1200px, (max-width: 1920px) 1600px, (max-width: 2160px) 1920px, (max-width: 2560px) 2160px, (max-width: 3200px) 2560px, (max-width: 3840px) 3200px, (max-width: 4320px) 3840px, 4320px";
			}
			
			return '<img src="' . $thumbSmall->url() . '" 
					 srcset="' . $thumbSmall->url() . ' 490w,
							 ' . $thumbMedium->url() . ' 800w,
							 ' . $thumbLarge->url() . ' 1200w,
							 ' . $thumbXL->url() . ' 1600w,
							 ' . $thumbXXL->url() . ' 1920w,
							 ' . $thumbUHD->url() . ' 2160w,
							 ' . $thumb2K->url() . ' 2560w,
							 ' . $thumb3K->url() . ' 3200w,
							 ' . $thumb4K->url() . ' 3840w,
							 ' . $thumb5K->url() . ' 4320w"
					 sizes="' . $sizes . '"
					 alt="' . $alt . '" 
					 class="' . $class . '" 
					 loading="lazy" />';
		},

		// PULL RELATED PAGES
		// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
		//
		// Pulling all related child pages of a given page into the loop
		'pullRelatedPages' => function ($page = '', $limit = 8) {

			if( !is_int( $limit) ) {
				$limit = 8;
			}

			$subpages = kirby()->site()->pages()->find($page)->children()->limit($limit); ?>

			<ul class="related__showcase--grid">

			<?php foreach($subpages as $subpage): ?>

				<!-- TODO - The following should be reworked together with the site method function
    			to be more consistent with Display Showcase Function -->
				<li class="related__showcase--item">
					<a href="<?= $subpage->url() ?>">
					<?php if($image = $subpage->images()->filterBy('filename', '*=', '_keyvisual')->first()): ?>
					<div class="related__showcase--image-wrap">
						<?= kirby()->site()->getResponsiveImage($image, 'Thumbnail for ' . $subpage->title(), 'rel-article-showcase--image') ?>
					</div>
					
					<?php endif ?>
					<div class="related__showcase--caption">
						
						<h1 class="related__showcase--title"><?= $subpage->title() ?></h1>
						
						<div class="related__showcase--tags">	
							<ul>					
							<?php $tags =  $subpage->tags();
								$taglist = explode(',', $tags);
								foreach($taglist as $tag): ?>
									<li><?= $tag ?></li>
							<?php endforeach ?>
							</ul>
						</div>
						
					</div>
					</a>
				</li>

			<?php endforeach ?>

			</ul>

			<?php
		},

		// DISPLAY SHOWCASE
		// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
		//
		// Pulling all related child pages of a given page into the loop to display
		// as the main showcase for projects or articles
		'displayShowcase' => function ($page = '', $limit = 8) {

			if( !is_int( $limit) ) {
				$limit = 8;
			}

			$subpages = kirby()->site()->pages()->find($page)->children()->limit($limit); ?>

			<ul class="showcase__grid">

			<?php foreach($subpages as $subpage): ?>

				<li class="showcase__grid--item">
					<a href="<?= $subpage->url() ?>" class="showcase-link">

						<div class="showcase-image-wrap">
							<?php if($image = $subpage->images()->filterBy('filename', '*=', '_keyvisual')->first()): ?>

				<!-- Image Wrapper -->
				<figure class="showcase__grid--image">

					<!-- Responsive Image -->
					<?= kirby()->site()->getResponsiveImage($image, 'Project: ' . $subpage->title(), 'showcase__grid--image--inside') ?>

				</figure>

							<?php endif ?>
						</div>

						<!-- Image/Project Title -->
						<div class="showcase--caption">
							<h1 class="showcase--title"><?= $subpage->title() ?></h1>
						</div>

					</a>
				</li>

			<?php endforeach ?>

			</ul>

			<?php
		}
  ] // end site methods
]); 
?>
