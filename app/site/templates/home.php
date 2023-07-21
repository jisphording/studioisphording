<?php snippet('header') ?>

	<main class="section__main">

		<!-- SHOWREEL -->
		<section class="showreel">
			<video playsinline autoplay muted loop poster="<?= $site->uri() . '/content/home/' . $page->showreel() ?>.jpg">
				<?php print_r($page->videos()) ?>
				<source src="<?= $site->uri() . 'home/' . $page->showreel() ?>.webm" type="video/webm" />
				<source src="<?= $site->uri() . 'home/' . $page->showreel() ?>.ogg" type="video/ogg" />
				Sorry, your browser doesn't support embedded videos, but don't worry, you can <a href="<?= $site->url() . 'home/' . $page->showreel() ?>.mp4">download it</a>
				and watch it with your favorite video player!
			</video>
			<!-- Showreel Headline -->
			<h1 class="showreel--title"><?= $page->title() ?></h1>
		</section>

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
	</body>

	<?php snippet('footer') ?>