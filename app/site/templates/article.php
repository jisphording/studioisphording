<?php snippet('header') ?>

	<section class="navigation section__main">
		<nav class="menu menu__sub menu__settings">
			<button type="button" id="darkmode" class="darkmode__toggle toggle--active">Darkmode</button>
			<button type="button" id="lightmode" class="lightmode__toggle">Lightmode</button>
		</nav>
	</section>

	<section class="section__webgl">
			<canvas class="webgl webgl__intro"><!-- The WebGl Canvas will be inserted here at runtime. --></canvas>
	</section>

	<main class="section__main">
	
		<?php snippet( 'section-headline' ) ?>

		<section class="section__content">
			<section class="section__bodycopy--divider"><div class="divider__box"></div><!-- Empty --></section>
			
			<section class="section__meta-information">
				<section class="section__analytics">
					<h3>Text Information:</h3>
				</section>

				<section class="section__tags">
					<h3>Tags:</h3>
					<ul class="tags">
						<?= create_tags( $page->tags() ) ?>
					</ul>
				</section>
			</section>

			<section class="section__bodycopy">
				<?= remove_br_tags($page->text()->kirbytext()) ?>
			</section>

		</section>

		<footer>
			<p class="copyright"><?= $site->copyright()->html() ?></p>
		</footer>

	</main>

</body>

<?php snippet('footer') ?>