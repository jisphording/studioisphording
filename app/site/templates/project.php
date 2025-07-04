<?php snippet('header') ?>
	<section class="parallax">

		<?php snippet('intro-img') ?>

		<!-- PROJECT SINGLE VIEW MAIN CONTENT -->
		<main class="section__main project__single parallax__layer--base" role="main">
			
			<!-- PROJECT CONTENT -->
			<div class="project__single--content">

				<!-- Project Description  -->
				<h3><?php echo t('Project Description') ?></h3>
				
				<!-- Kirbytext - Intro -->
				<article class="article__main article__main--top">
					<?= $page->intro()->kirbytext() ?>
				</article>

				<!-- PROJECT GALLERY -->
				<?php snippet('project-gallery') ?>

				<!-- Kirbytext - Main -->
				<article class="article__main">
					<?= $page->text()->kirbytext() ?>
				</article>
			</div>
			<!-- END - PROJECT CONTENT -->
		</main>
		<!-- END - PROJECT SINGLE VIEW MAIN CONTENT -->

		<!-- RELATED CONTENT -->
		<section class="related__showcase">
			<h3><?php echo t('Related projects') ?></h3>
			
			<div>    
				<!-- Sub Pages Loop -->
				<?php $site->pullRelatedPages('projects', 8) ?>
			</div>

		</section>
		<!-- END - RELATED CONTENT -->
	</section>
	<!-- END - PARALLAX -->

<?php snippet('footer') ?>
