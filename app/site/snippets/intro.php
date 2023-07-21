<header class="h1 section__main">
	<h1><?= $page->headline()->or($page->title())->esc() ?></h1>
	<?php if ($page->subheadline()->isNotEmpty()) : ?>
		<p class="color-grey"><?= $page->subheadline()->esc() ?></p>
	<?php endif ?>
</header>