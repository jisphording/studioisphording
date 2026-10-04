<!-- WEBGL CANVAS -->
<section class="showreel">
	<!-- Showreel Title -->
	<div class="showreel__title--wrapper parallax__layer--title">
		<div class="showreel__title">
			<h1><?= $page->titlelong()->titleHtml() ?></h1>
		</div>
	</div>
	<!-- Intro Image -->
	<section class="showreel__video parallax__layer--back">
        <canvas id="webgl" class="showreel__video parallax__layer--back showcase__intro__image" 
		data-world="<?= $page->webglWorld() // raw: fixed World_NN registry key, never content ?>"></canvas>
	</section>
</section>
