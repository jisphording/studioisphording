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
				<!-- Filtering videos from backend -->
				<?php foreach($page->videos() as $video): ?>
					<li>
						<video class="showcase__grid--image" playsinline autoplay muted loop>
							<source src="<?= $video->url() ?>" type="<?= $video->mime() ?>">
						</video>
					</li>
					<?php endforeach ?>
					
				<ul class="project__single--gallery">
					<?php
					// The project gallery pulls in all images from the content folder. 
					// Before an image is rendered to the page it's checked for a video with the same name as the image on the server.
					// If a video is present, the video is shown instead of the image
					// TODO: Graceful degradation -> Show the image as long as the video is loading. When video has loaded, show video. 

					// Filtering images from backend
					foreach($page->images()->filterBy('extension', 'webp')->filterBy('filename', '!*=', '_keyvisual')->filterBy('filename', '!*=', 'intro-img') as $image): 

					// Writing filename to video variable while stripping the file extension
					// This is achieved with basename and the respective kirbyobjects. 
					// The dot has to be 'manually' connected to the extension
					// TODO: video check is used multiple times, should be moved to site methods plugin
					// The file extension can probably be extracted from the main string to reduce the doubling of variables.
					$video_dir = "video/";
					$file_video_mp4 = NULL;
					$file_video_webm = NULL;
					$file_video_mp4 = $image->filename();
					$file_video_webm = $image->filename();
					$file_video_mp4 = substr($file_video_mp4, 0, strrpos($file_video_mp4, '.')) . ".mp4";
					$file_video_webm = substr($file_video_webm, 0, strrpos($file_video_webm, '.')) . ".webm";

					// Testing if a video with the same filename exists 
					$filetocheck = $video_dir . $file_video_mp4;
					// If exists -> put video here
					if ( file_exists( $filetocheck )) { ?>
						<li>
							<figure>
								<video playsinline autoplay muted loop>
									<source src="<?= $site->url('') . '/' . $video_dir . $file_video_mp4 ?>" type="video/mp4">
									<source src="<?= $site->url('') . '/' . $video_dir . $file_video_webm ?>" type="video/webm">
								</video>
							</figure>
						</li>
					<?php } // endif

					// if no video than just put the image
					else { ?>
						<li>
							<figure class="showcase__grid--image">
								<img src="<?= $image->url() ?>" alt="<?= $page->title() ?>">
							</figure>
						</li>
					<?php } // endelse ?>

					<?php endforeach ?>
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
