<?php
// Resolve each variant through Kirby's own file objects so URLs
// go through the media route, not the blocked /content/ tree.
$showreelName   = $page->showreel()->value();
$showreelPoster = $page->file($showreelName . '.jpg');
$showreelMp4    = $page->file($showreelName . '.mp4');
$showreelWebm   = $page->file($showreelName . '.webm');
$showreelMaster = $showreelMp4 ?: $showreelWebm;

// The hero poster is an LCP candidate: header.php preloads it.
$showreelEntry     = $showreelMaster ? getMediaVideoEntry($showreelMaster) : null;
$showreelPosterUrl = ($showreelEntry ? getMediaPosterUrl($showreelEntry) : null)
	?? ($showreelPoster ? $showreelPoster->url() : null);

snippet('header', ['preloadPoster' => $showreelPosterUrl]);
?>
	<section class="parallax">

		<!-- SHOWREEL -->
		<section class="showreel">
			<!-- Showreel Title -->
			<div class="showreel__title--wrapper parallax__layer--title">
				<div class="showreel__title">
					<h3><?= $page->topline()->escape() ?></h3>
					<h1><?= $page->title()->escape() ?></h1>
					<h2><?= $page->subline()->escape() ?></h2>
				</div>
			</div>
			<!-- Showreel Video -->
			<section class="showreel__video parallax__layer--back">
				<?php // preload="none": the reel is not the LCP element (the first
				// showcase grid image is) and must not compete for bandwidth
				// before first paint; autoplay still starts it, and the poster
				// is the fast-loading first frame. ?>
				<?php
				$fallback = [];
				foreach ([$showreelWebm, $showreelMp4] as $f) {
					if ($f) {
						$fallback[] = ['url' => $f->url(), 'type' => $f->mime()];
					}
				}
				snippet('responsive-video', [
					'file'     => $showreelMaster,
					'fallback' => $fallback,
					'poster'   => $showreelPosterUrl,
					'hero'     => true,
					'preload'  => 'none',
				]);
				?>
			</section>
		</section>

		<!-- INTRO -->
		<section class="section__main intro__txt">
			<article class="article__main large__quote">
				<?= $page->intro()->kirbytext() ?>
			</article>
		</section>

		<!-- MAIN -->
		<main class="section__main parallax__layer--base">

			<!-- PROJECT SHOWCASE -->
			<section class="projects__showcase">

				<!-- Showcase Loop -->
				<?php snippet('showcase-grid', ['parent' => 'projects', 'limit' => 14]) ?>

				<!-- Link to all projects -->
				<!--p class="projects__showcase--more">
					<a href="<= page('projects')->url() ?>" class="btn"><php echo t('Show all projects') ?></a>
				</p-->

			</section>

		</main>

	</section><!-- End: Parallax -->

<?php snippet('footer') ?>
