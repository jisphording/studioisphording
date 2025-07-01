<?php snippet('header') ?>
	<section class="parallax">

		<?php snippet('canvas') ?>

		<!-- PROJECT SINGLE VIEW MAIN CONTENT -->
		<main class="section__main project__single parallax__layer--base" role="main">
			
			<!-- PROJECT CONTENT -->
			<div class="project__single--content">

				<!-- Project Description  -->
				<h3><?php echo t('Project Description') ?></h3>

			</div>
			<!-- END - PROJECT CONTENT -->
		</main>
		<!-- END - PROJECT SINGLE VIEW MAIN CONTENT -->
	</section>
	<!-- END - PARALLAX -->

    <?php echo vite('dev/js/index.js') ?>

<?php snippet('footer') ?>
