<?php snippet('header') ?>

<!-- PROJECTS PAGE MAIN CONTENT -->
<main class="main" role="main">

	<!-- PROJECT SHOWCASE -->
	<section class="section__main projects__showcase">

		<!-- Showcase Loop -->
		<?php snippet('showcase-grid', ['parent' => 'projects', 'limit' => 99]) ?>

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
            <?php snippet('responsive-image', ['file' => $coverImage, 'alt' => $project->title()->titleText('raw')->value(), 'class' => 'project-list-image', 'sizes' => '100vw']) ?>
          <?php endif ?>
          <figcaption><?= $project->title()->titleHtml() ?> <small><?= $project->year()->escape() ?></small></figcaption>
        </figure>
      </a>
    </li>
    <?php endforeach ?>
  </ul>

	</section>

</main>
<!-- END - PROJECTS PAGE MAIN CONTENT -->

<?php snippet('footer') ?>
