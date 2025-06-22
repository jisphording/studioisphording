<!-- INTRO-IMG -->
<section class="showreel">
	<!-- Showreel Title -->
	<div class="showreel__title--wrapper parallax__layer--title">
		<div class="showreel__title">
			<h1><?= $page->titlelong() ?></h1>
		</div>
	</div>
	<!-- Intro Image -->
	<section class="showreel__video parallax__layer--back">
		<?php $introimg = $page->images()->filterBy('filename', '*=', 'intro-img')->first(); 
		if ( !empty( $introimg )) { ?>
			<!-- Image Wrapper -->
			<figure class="showcase__intro__image">
				<?= $site->getResponsiveImage($introimg, 'Project: ' . $page->title(), 'showcase__intro__image--inside') ?>
			</figure>
		<?php } ?>
	</section>
</section>
