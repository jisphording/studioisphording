<?php snippet('header') ?>

	<main class="section__main">

			<?= remove_br_tags($page->text()->kirbytext()) ?>

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