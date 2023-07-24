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
				<video playsinline autoplay muted loop poster="<?= $site->uri() . '/content/home/' . $page->showreel() ?>.jpg">
					<?php print_r($page->videos()) ?>
					<source src="<?= $site->uri() . 'home/' . $page->showreel() ?>.webm" type="video/webm" />
					<source src="<?= $site->uri() . 'home/' . $page->showreel() ?>.ogg" type="video/ogg" />
					Sorry, your browser doesn't support embedded videos, but don't worry, you can <a href="<?= $site->url() . 'home/' . $page->showreel() ?>.mp4">download it</a>
					and watch it with your favorite video player!
				</video>
			</section>
		</section>

		<!-- MAIN -->
		<main class="section__main parallax__layer--base">
			<section class="section__bodycopy">
				<p><?= $page->outro() ?></p>
			</section>

			<!-- PROJECT SHOWCASE -->
			<section class="projects__showcase">

				<!-- Showcase Loop -->
				<?php $site->displayShowcase('projects', 4) ?>

				<!-- Link to all projects -->
				<p class="projects__showcase--more">
					<a href="<?= page('projects')->url() ?>" class="btn"><?php echo t('Show all projects') ?></a>
				</p>

			</section>

		</main>

	<?php snippet('footer') ?>

	</section><!-- End: Parallax -->

	</body>