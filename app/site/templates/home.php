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
				
				// Use direct content paths to bypass media processing issues
				$contentPath = '/content/' . $page->diruri() . '/';
				?>
				
				<video playsinline autoplay muted loop poster="<?= $contentPath . $showreelName ?>.jpg">
					<source src="<?= $contentPath . $showreelName ?>.mp4" type="video/mp4" />
					<source src="<?= $contentPath . $showreelName ?>.webm" type="video/webm" />
					<source src="<?= $contentPath . $showreelName ?>.ogg" type="video/ogg" />
					Sorry, your browser doesn't support embedded videos, but don't worry, you can <a href="<?= $contentPath . $showreelName ?>.mp4">download it</a>
					and watch it with your favorite video player!
				</video>
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
