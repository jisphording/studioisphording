	<?php snippet('header') ?>

	<!-- SHOWREEL -->
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
				<figure class="showreel__video parallax__layer--back showcase__intro__image">
					<!-- TODO - The way the following img code is implemented is used so frequently on this website that it
								is probably a good idea to roll it into it's own function -->
					<img srcset="<?= $introimg -> srcset([480, 768, 1024, 1280, 1440, 1680, 1920, 2560, 3840]) ?>"
							src="<?= $introimg -> url()?>" alt="Project: <?= $page->title() ?>" loading="lazy" 
							style="height:<?= floor(($introimg -> height()) * 0.5) ?>; width:<?= floor(($introimg -> width()) * 0.5) ?>;">
				</figure>
			<?php } ?>
		</section>
	</section>

	<main class="section__main">

		<?php snippet( 'section-headline' ) ?>

		<section class="section__content">
			<section class="section__bodycopy">
				<article class="article__main imprint">
					<?= remove_br_tags($page->text()->kirbytext()) ?>
				<article>
			</section>
		</section>

	</main>
</body>

<?php snippet('footer') ?>