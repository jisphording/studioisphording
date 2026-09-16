<?php snippet('header') ?>
	<section class="parallax">

		<!-- SHOWREEL -->
		<section class="showreel">
			<!-- Showreel Title -->
			<div class="showreel__title--wrapper parallax__layer--title">
				<div class="showreel__title">
					<h3><?= $page->topline() ?></h3>
					<h1><?= $page->title() ?></h1>
					<h2><?= $page->subline() ?></h2>
				</div>
			</div>
			<!-- Showreel Video -->
			<section class="showreel__video parallax__layer--back">
				<?php
				// Get the showreel field value
				$showreelName = $page->showreel()->value();

				// Resolve each variant through Kirby's own file objects so URLs
				// go through the media route, not the blocked /content/ tree.
				$showreelPoster = $page->file($showreelName . '.jpg');
				$showreelMp4    = $page->file($showreelName . '.mp4');
				$showreelWebm   = $page->file($showreelName . '.webm');
				?>

				<?php if ($showreelMp4 || $showreelWebm): ?>
				<video playsinline autoplay muted loop<?= $showreelPoster ? ' poster="' . $showreelPoster->url() . '"' : '' ?>>
					<?php if ($showreelMp4): ?>
					<source src="<?= $showreelMp4->url() ?>" type="video/mp4" />
					<?php endif ?>
					<?php if ($showreelWebm): ?>
					<source src="<?= $showreelWebm->url() ?>" type="video/webm" />
					<?php endif ?>
					Sorry, your browser doesn't support embedded videos, but don't worry, you can <a href="<?= $showreelMp4 ? $showreelMp4->url() : $showreelWebm->url() ?>">download it</a>
					and watch it with your favorite video player!
				</video>
				<?php endif ?>
			</section>
		</section>

		<!-- INTRO -->
		<section class="section__main intro__txt">
			<article class="article__main large__quote">
				<?= $page->intro()->kirbytext() ?>
			</article>
		</section>

		<!-- MAIN -->
		<main class="section__main parallax__layer--base">

			<!-- PROJECT SHOWCASE -->
			<section class="projects__showcase">

				<!-- Showcase Loop -->
				<?php $site->displayShowcase('projects', 14) ?>

				<!-- Link to all projects -->
				<!--p class="projects__showcase--more">
					<a href="<= page('projects')->url() ?>" class="btn"><php echo t('Show all projects') ?></a>
				</p-->

			</section>

		</main>

	</section><!-- End: Parallax -->

<?php snippet('footer') ?>
