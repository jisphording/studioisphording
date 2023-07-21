<!-- MENU: MAIN -->
<?php

// main menu items
$items = $pages->unlisted()->not( 'articles', 'disclaimer', 'error', 'home', 'imprint', 'privacy' );

// only show the menu if items are available
if ($items->isNotEmpty()) :

?>
	<nav class="menu menu__main">
		<ul>
		<?php foreach ($items as $item) : ?>
				<li>
					<a<?php e($item->isOpen(), ' class="active"') ?> href="<?= $item->url() ?>"><?= $item->title()->html() ?></a>
				</li>
			<?php endforeach ?>
		</ul>
	</nav>
<?php endif ?>