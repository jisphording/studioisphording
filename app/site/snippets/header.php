<!DOCTYPE html>
<html lang="en" class="page--<?php echo( $page->slug() ); ?> lightmode is-loading">

<head>

	<meta charset="utf-8">
	<meta name="viewport" content="height=device-height, 
                      width=device-width, initial-scale=1.0, 
                      minimum-scale=1.0, maximum-scale=1.0, 
                      user-scalable=no">
	<meta name="description" content="Thoughts, Writings & Ideas on Design & Technology." />
	<meta name="author" content="Johannes Isphording" />
	<meta name="keywords" content="design, digital, writing, longform" />

	<title><?= $site->title()->esc() ?> | <?= $page->title()->esc() ?></title>

	<link rel="stylesheet" href="<?= url('assets/bundle/app.css') ?>">

	<?= vite('dev/js/index.js') ?>

	<link rel="shortcut icon" type="image/x-icon" href="<?= url('favicon.ico') ?>">

	<!-- Open source GPDR compliant website analytics -->
	<script defer data-domain="studioisphording.de" src="https://plausible.io/js/script.js"></script>
	
</head>

<body data-barba="wrapper">
	<div class="loadingScreen"><!-- LOADING SCREEN --></div>
	<div data-barba="container">

	<header class="header">
		<?php snippet('menu-main') ?>
		
		<?php snippet('utils') ?>
	</header>
