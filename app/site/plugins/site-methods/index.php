<?php

// CUSTOM SITE METHODS
// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
//
// This "plugin" contains a few custom functions used across multiple pages on different sites.

Kirby::plugin('studio-isphording/site-methods', [
  'siteMethods' => [

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
					<?php if($image = $subpage->images()->filterBy('filename', '*=', '_keyvisual')->first()): 
					// thumb for all browsers
					$thumb = $image->crop(490, 390, 35, true);
					// hq thumb is loaded were interaction observer is available
					$thumbHQ = $image->crop(690, 590, 75); ?>
					<div class="related__showcase--image-wrap">
						<img src="<?= $thumb->url() ?>" data-src="<?= $thumbHQ->url() ?>" alt="Thumbnail for <?= $subpage->title() ?>" class="rel-article-showcase--image" />
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

									<!-- Image -->
									<img class="showcase__grid--image--inside" srcset="<?= $image -> srcset([480, 768, 1024, 1280, 1440, 1680, 1920, 2560, 3840]) ?>"
												src="<?= $image -> url()?>" alt="Project: <?= $subpage->title() ?>" loading="lazy" 
												style="height:<?= floor(($image -> height()) * 0.5) ?>; width:<?= floor(($image -> width()) * 0.5) ?>;">

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