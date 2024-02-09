<!-- MENU: MAIN -->
<?php

// main menu items
$items = $pages->unlisted()->not( 'articles', 'disclaimer', 'error', 'gdpr', 'home', 'imprint', 'privacy' );

// only show the menu if items are available
if ($items->isNotEmpty()) :

?>
	<section class="branding">
		<a href="<?= $site->url() ?>">Isphording</a>
	</section>

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