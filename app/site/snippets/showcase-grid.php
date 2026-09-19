<?php
/**
 * Main showcase grid for a parent page's children.
 *
 * @var string $parent parent page id (e.g. 'projects')
 * @var int    $limit  max children to render (default 8)
 *
 * Moved verbatim from the showcase site method the site-methods plugin used
 * to print. Renders nothing when $parent does not resolve, which fixes the
 * latent fatal the old method hit on ->children() of null.
 */
$limit = is_int($limit ?? null) ? $limit : 8;

$parentPage = kirby()->site()->pages()->find($parent);
if (!$parentPage) {
	return;
}

$subpages = $parentPage->children()->limit($limit); ?>

<ul class="showcase__grid">

<?php foreach($subpages as $subpage): ?>

	<li class="showcase__grid--item">
		<a href="<?= $subpage->url() ?>" class="showcase-link">

			<div class="showcase-image-wrap">
				<?php if($image = $subpage->keyvisual()): ?>

	<!-- Image Wrapper -->
	<figure class="showcase__grid--image">

		<!-- Responsive Image -->
		<?= kirby()->site()->getResponsiveImage($image, 'Project: ' . $subpage->title(), 'showcase__grid--image--inside') ?>

	</figure>

				<?php endif ?>
			</div>

			<!-- Image/Project Title -->
			<div class="showcase--caption">
				<h1 class="showcase--title"><?= $subpage->title()->titleHtml() ?></h1>
			</div>

		</a>
	</li>

<?php endforeach ?>

</ul>
