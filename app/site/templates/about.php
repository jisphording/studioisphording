<?php snippet('header') ?>
	<section class="parallax">

	<?php snippet('intro-video') ?>

		<!-- ABOUT PAGE MAIN CONTENT -->
		<main class="section__main about parallax__layer--base">
				
			<!-- ABOUT BODY CONTENT -->
			<div class="text">
					
				<!-- Kirbytext - Main -->
				<article class="article__main">
					<?= $page->intro()->kirbytext() ?>
				</article>
				
				<!-- about mood -->
				<section class="mood full">
					<?php if($moodImage = $page->file($page->mood_01())): ?>
						<?php snippet('responsive-image', ['file' => $moodImage, 'alt' => $page->mood_01_txt()->value(), 'class' => 'mood-image', 'sizes' => '100vw', 'eager' => true]) ?>
					<?php endif ?>
					<p class="bildunterschrift"><?= $page->mood_01_txt()->escape() ?></p>
				</section>
					
				<!-- about experience -->
				<article class="article__main experience">
					<h3>Experience</h3>
					<?= $page->experience()->kirbytext() ?>
				</article>
					
				<!-- about mood images -->
				<section class="moods">
					<ul>
						<li class="full border">
							<?php if($moodImage2 = $page->file($page->mood_02())): ?>
								<?php snippet('responsive-image', ['file' => $moodImage2, 'alt' => 'Mood image', 'class' => 'mood-image-full', 'sizes' => '100vw']) ?>
							<?php endif ?>
						</li>
						<li class="quarter">
							<?php if($moodImage3a = $page->file($page->mood_03a())): ?>
								<?php snippet('responsive-image', ['file' => $moodImage3a, 'alt' => 'Mood image', 'class' => 'mood-image-quarter', 'sizes' => '(max-width: 767px) 100vw, 50vw']) ?>
							<?php endif ?>
						</li>
						<li class="quarter">
							<?php if($moodImage3b = $page->file($page->mood_03b())): ?>
								<?php snippet('responsive-image', ['file' => $moodImage3b, 'alt' => 'Mood image', 'class' => 'mood-image-quarter', 'sizes' => '(max-width: 767px) 100vw, 50vw']) ?>
							<?php endif ?>
						</li>
					</ul>
				</section>
					
				<!-- about awards & recognition -->
				<!--article class="recognition">
					<h3>Awards &amp; Recognition</h3>
					<= $page->recognition()->kirbytext() ?>
				</article>
				
			</div>
			<!-- END - ABOUT BODY CONTENT -->
				
			<!-- OFFICE LOCATIONS -->

		</main>
		<!-- END - ABOUT PAGE MAIN CONTENT -->

	</section>
	<!-- END - PARALLAX -->

<?php snippet('footer') ?>
