	<?php snippet('header') ?>

	<main class="section__main">

		<?php snippet( 'section-headline' ) ?>

		<section class="section__content imprint">
			<article class="article__main">
				<?= remove_br_tags($page->text()->kirbytext()) ?>
			</article>
		</section>

	</main>
</body>

<?php snippet('footer') ?>