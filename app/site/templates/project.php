<?php snippet('header') ?>
	<section class="parallax">

		<?php snippet('intro-img') ?>

		<!-- PROJECT SINGLE VIEW MAIN CONTENT -->
		<main class="section__main project__single parallax__layer--base" role="main">
			
			<!-- PROJECT CONTENT -->
			<div class="project__single--content">

				<!-- Project Description  -->
				<h3><?php echo t('Project Description') ?></h3>
				
				<!-- Kirbytext - Intro -->
				<article class="article__main article__main--top">
					<?= $page->intro()->kirbytext() ?>
				</article>

				<!-- PROJECT GALLERY -->
				<ul class="project__single--gallery">
					<?php
					// The project gallery pulls in all images and videos from the content folder. 
					// Videos are displayed first, then images
					
					// Display videos first
					foreach($page->videos() as $video): ?>
						<li>
							<figure>
								<video class="showcase__grid--image" playsinline autoplay muted loop>
									<source src="<?= $video->url() ?>" type="<?= $video->mime() ?>">
								</video>
							</figure>
						</li>
					<?php endforeach;

					// Then display images, filtering out keyvisual and intro images
					// Group images by base name to handle WebP/JPG duplicates
					$imageGroups = [];
					foreach($page->images()->filterBy('filename', '!*=', '_keyvisual')->filterBy('filename', '!*=', 'intro-img') as $image) {
						$baseName = pathinfo($image->filename(), PATHINFO_FILENAME);
						$extension = strtolower($image->extension());
						
						if (!isset($imageGroups[$baseName])) {
							$imageGroups[$baseName] = [];
						}
						$imageGroups[$baseName][$extension] = $image;
					}
					
					// Process each image group, prioritizing WebP over other formats
					foreach($imageGroups as $baseName => $images) {
						// Check if there's a corresponding video file with the same base name
						$videoAlreadyDisplayed = false;
						foreach($page->videos() as $video) {
							$videoBaseName = pathinfo($video->filename(), PATHINFO_FILENAME);
							if ($videoBaseName === $baseName) {
								$videoAlreadyDisplayed = true;
								break;
							}
						}
						
						// Show image if no corresponding video was displayed
						if (!$videoAlreadyDisplayed) {
							// Prioritize WebP, then fallback to other formats
							$selectedImage = null;
							if (isset($images['webp'])) {
								$selectedImage = $images['webp'];
							} elseif (isset($images['jpg'])) {
								$selectedImage = $images['jpg'];
							} elseif (isset($images['jpeg'])) {
								$selectedImage = $images['jpeg'];
							} else {
								// Fallback to first available image
								$selectedImage = reset($images);
							}
							
							if ($selectedImage): ?>
								<li>
									<figure class="showcase__grid--image">
										<?= $site->getResponsiveImage($selectedImage, $page->title(), 'showcase__grid--image--inside') ?>
									</figure>
								</li>
							<?php endif;
						}
					} ?>
				</ul>

				<!-- Kirbytext - Main -->
				<article class="article__main">
					<?= $page->text()->kirbytext() ?>
				</article>
			</div>
			<!-- END - PROJECT CONTENT -->
		</main>
		<!-- END - PROJECT SINGLE VIEW MAIN CONTENT -->

		<!-- RELATED CONTENT -->
		<section class="related__showcase">
			<h3><?php echo t('Related projects') ?></h3>
			
			<div>    
				<!-- Sub Pages Loop -->
				<?php $site->pullRelatedPages('projects', 8) ?>
			</div>

		</section>
		<!-- END - RELATED CONTENT -->
	</section>
	<!-- END - PARALLAX -->

<?php snippet('footer') ?>
