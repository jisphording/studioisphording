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

	<!-- MOBILE MENU -->
	<nav class="menu menu__mobile">
		<div class="menu__mobile__toggle__wrapper">
			<label for="menu__mobile__toggle" class="menu__mobile__toggle">
				<input type="checkbox" />
			</label>
			
			<aside class="sidebar">
			<ul>
				<?php foreach ($items as $item) : ?>
					<li>
						<a<?php e($item->isOpen(), ' class="active"') ?> href="<?= $item->url() ?>"><?= $item->title()->html() ?></a>
					</li>
				<?php endforeach ?>
			</ul>
		</aside>
		</div>
	</nav>

	<!-- DESKTOP MENU -->
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