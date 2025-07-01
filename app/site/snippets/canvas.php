<!-- WEBGL CANVAS -->
<section class="showreel">
	<!-- Showreel Title -->
	<div class="showreel__title--wrapper parallax__layer--title">
		<div class="showreel__title">
			<h1><?= $page->titlelong() ?></h1>
		</div>
	</div>
	<!-- Intro Image -->
	<section class="showreel__video parallax__layer--back">
        <canvas id="webgl" class="showreel__video parallax__layer--back showcase__intro__image" 
		data-world="<?= $page->slug() == 'isphording-inneneinrichtung' ? 'World_01' : 'World_02' ?>"></canvas>
	</section>
</section>
