<?php snippet('header') ?>

<!-- PROJECT SINGLE VIEW MAIN CONTENT -->
<main class="section__main project__single" role="main">
	
	<!-- LOCAL PAGE HEADER -->
    <?php snippet('section-header') ?>
	
	<!-- PROJECT CONTENT -->
    <div class="text project__single--text">

		<!-- Project Description  -->
		<h3><?php echo t('Project Description') ?></h3>
		
		<!-- Kirbytext - Intro -->
		<article>
			<?= $page->intro()->kirbytext() ?>
		</article>
		
		<!-- Intro Image after initial Text -->
		<!-- Image -->
		<?php $introimg = $page->images()->filterBy('filename', '*=', 'intro-img')->first(); 
		if ( !empty( $introimg )) { ?>
		
			<ul  class="project__single--gallery">
				<li>
					<!-- Image Wrapper -->
					<figure class="showcase__grid--image">

						<!-- TODO - The way the following img code is implemented is used so frequently on this website that it
									is probably a good idea to roll it into it's own function -->
						<img class="showcase__grid--image--inside" srcset="<?= $introimg -> srcset([480, 768, 1024, 1280, 1440, 1680, 1920, 2560, 3840]) ?>"
								src="<?= $introimg -> url()?>" alt="Project: <?= $page->title() ?>" loading="lazy" 
								style="height:<?= floor(($introimg -> height()) * 0.5) ?>; width:<?= floor(($introimg -> width()) * 0.5) ?>;">
					</figure>
				</li>
			</ul>
		<?php } ?>
		
		<!-- Kirbytext - Main -->
		<article id="article-main">
			<?= $page->text()->kirbytext() ?>
		</article>

		<!-- PROJECT GALLERY -->
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
            $video_dir = "video/";
			$file_video = NULL;
			$file_video = $image->filename();
			$file_video = substr($file_video, 0, strrpos($file_video, '.')) . ".webm";

			// Testing if a video with the same filename exists 
			$filetocheck = $video_dir . $file_video;
			// If exists -> put video here
			if ( file_exists( $filetocheck )) { ?>
				<li>
					<figure>
						<video playsinline autoplay muted loop>
                        	<source src="<?= $site->url('') . '/' . $video_dir . $file_video ?>" type="video/webm">
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

<?php snippet('footer') ?>
