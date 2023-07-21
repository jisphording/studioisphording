	<?php snippet('header') ?>

	<main class="section__main">

		<?php snippet( 'section-headline' ) ?>

		<section class="section__content imprint">
			<?= remove_br_tags($page->text()->kirbytext()) ?>
		</section>

		<footer>
			<p class="copyright"><?= $site->copyright()->html() ?></p>
		</footer>

	</main>
</body>

<?php snippet('footer') ?>