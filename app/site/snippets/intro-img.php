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
				<!-- TODO - The way the following img code is implemented is used so frequently on this website that it
							is probably a good idea to roll it into it's own function -->
				<img srcset="<?= $introimg -> srcset([480, 768, 1024, 1280, 1440, 1680, 1920, 2560, 3840]) ?>"
						src="<?= $introimg -> url()?>" alt="Project: <?= $page->title() ?>" loading="lazy" 
						style="height:<?= floor(($introimg -> height()) * 0.5) ?>; width:<?= floor(($introimg -> width()) * 0.5) ?>;">
			</figure>
		<?php } ?>
	</section>
</section>