<!-- INTRO-IMG -->
<section class="showreel">
	<!-- Showreel Title -->
	<div class="showreel__title--wrapper parallax__layer--title">
		<div class="showreel__title">
			<h1><?= $page->titlelong() ?></h1>
		</div>
	</div>
	<!-- Intro Video -->
	<section class="showreel__video parallax__layer--back">
        <video class="mood__film" playsinline autoplay muted loop>
			<source src="<?= $page->url() . '/' . $page->mood_film() ?>">
		</video>
	</section>
</section>