<!DOCTYPE html>
<html lang="en" class="page--<?php echo( $page->slug() ); ?> lightmode">

<head>

	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1.0">
	<meta name="description" content="Thoughts, Writings & Ideas on Design & Technology." />
	<meta name="author" content="Johannes Isphording" />
	<meta name="keywords" content="design, digital, writing, longform" />

	<title><?= $site->title()->esc() ?> | <?= $page->title()->esc() ?></title>

	<?= css([
		'assets/bundle/app.css',
		'@auto'
	]) ?>

	<link rel="shortcut icon" type="image/x-icon" href="<?= url('favicon.ico') ?>">

	<!-- Open source GPDR compliant website analytics -->
	<!-- script defer data-domain="studioisphording.de" src="https://plausible.io/js/script.js"></script-->
</head>

<div class="loadingScreen"><!-- LOADING SCREEN --></div>

<body data-barba="wrapper">
	<div data-barba="container">

	<header class="header">
		<a class="branding" href="<?= $site->url() ?>">Studio Isphording</a>
		<?php snippet('menu-main') ?>
		
		<?php snippet('utils') ?>
	</header>