<!-- INTRO-IMG -->
<section class="showreel">
	<!-- Showreel Title -->
	<div class="showreel__title--wrapper parallax__layer--title">
		<div class="showreel__title">
			<h1><?= $page->titlelong()->titleHtml() ?></h1>
		</div>
	</div>
	<!-- Intro Video -->
	<section class="showreel__video parallax__layer--back">
		<?php
		if ($film = $page->mood_film()->toFile()) {
			snippet('responsive-video', [
				'file'     => $film,
				'fallback' => [['url' => $film->url(), 'type' => $film->mime()]],
				'class'    => 'mood__film',
				'hero'     => true,
			]);
		}
		?>
	</section>
</section>