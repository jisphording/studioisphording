<?php
/**
 * Related-projects grid for a parent page's children.
 *
 * @var string $parent parent page id (e.g. 'projects')
 * @var int    $limit  max children to render (default 8)
 *
 * Moved verbatim from the related-pages site method the site-methods plugin
 * used to print (TODO comment kept). Renders nothing when $parent does not resolve, which fixes the
 * latent fatal the old method hit on ->children() of null.
 */
$limit = is_int($limit ?? null) ? $limit : 8;

$parentPage = kirby()->site()->pages()->find($parent);
if (!$parentPage) {
	return;
}

$subpages = $parentPage->children()->limit($limit); ?>

<ul class="related__showcase--grid">

<?php foreach($subpages as $subpage): ?>

	<!-- TODO - The following should be reworked together with the site method function
    			to be more consistent with Display Showcase Function -->
	<li class="related__showcase--item">
		<a href="<?= $subpage->url() ?>">
		<?php if($image = $subpage->keyvisual()): ?>
		<div class="related__showcase--image-wrap">
			<?= kirby()->site()->getResponsiveImage($image, 'Thumbnail for ' . $subpage->title(), 'rel-article-showcase--image') ?>
		</div>

		<?php endif ?>
		<div class="related__showcase--caption">

			<h1 class="related__showcase--title"><?= $subpage->title()->titleHtml() ?></h1>

			<div class="related__showcase--tags">
				<ul>
				<?php snippet('tag-list', ['tags' => $subpage->tags()]) ?>
				</ul>
			</div>

		</div>
		</a>
	</li>

<?php endforeach ?>

</ul>
