<?php snippet('header') ?>

<!-- PROJECTS PAGE MAIN CONTENT -->
<main class="main" role="main">

	<!-- PROJECT SHOWCASE -->
	<section class="section__main projects__showcase">

		<!-- Showcase Loop -->
		<?php $site->displayShowcase('projects', 99) ?>

		<!-- Link to all projects -->
		<p class="projects__showcase--more">
			<a href="<?= page('projects')->url() ?>" class="btn"><?php echo t('Show all projects') ?></a>
		</p>

		<ul class="projects"<?= attr(['data-even' => $page->children()->listed()->isEven()], ' ') ?>>
    <?php foreach ($page->children()->listed() as $project): ?>
    <li>
      <a href="<?= $project->url() ?>">
        <figure>
          <?php if($coverImage = $project->images()->filterBy('filename', '*=', '_keyvisual')->first()): ?>
            <?= $site->getResponsiveImage($coverImage, $project->title(), 'project-list-image') ?>
          <?php endif ?>
          <figcaption><?= $project->title() ?> <small><?= $project->year() ?></small></figcaption>
        </figure>
      </a>
    </li>
    <?php endforeach ?>
  </ul>

	</section>

</main>
<!-- END - PROJECTS PAGE MAIN CONTENT -->

<?php snippet('footer') ?>
