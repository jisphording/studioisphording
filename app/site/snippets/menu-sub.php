<!-- MENU: SUB -->
<?php

$items = false;

// get the open item on the first level
if ($root = $pages->find( 'articles' )) {

	// get visible children for the root item
	$items = $root->children()->unlisted();
}

// only show the menu if items are available
if ($items and $items->isNotEmpty()) :

?>
	<nav class="menu menu__sub">
		<ul>
			<?php foreach ($items as $item) : ?>
				<li>
					<a<?php e($item->isOpen(), ' class="active"') ?> href="<?= $item->url() ?>"><?= $item->title()->html() ?></a>
				</li>
			<?php endforeach ?>
		</ul>
	</nav>
	<nav class="menu menu__sub menu__settings">
		<button type="button" id="darkmode" class="darkmode__toggle toggle--active">Darkmode</button>
		<button type="button" id="lightmode" class="lightmode__toggle">Lightmode</button>
	</nav>
<?php endif ?>