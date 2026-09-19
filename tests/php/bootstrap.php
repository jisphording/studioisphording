<?php

// PHPUnit bootstrap for the app/site test suite.
//
// Loads Composer's autoloader (PHPUnit + Kirby classes) and Kirby's own
// bootstrap so a real Kirby instance can be constructed in-process by
// KirbyTestCase. Both live under app/, which is Composer-managed and
// gitignored; run `(cd app && composer install)` before the suite.

$root = dirname(__DIR__, 2);

require $root . '/app/vendor/autoload.php';
require $root . '/app/kirby/bootstrap.php';

// Disable Kirby's Whoops error handler for the whole suite. Kirby registers a
// Whoops handler on every boot (a PlainTextHandler under CLI) and never
// restores it, which PHPUnit's failOnRisky flags as a leaked error/exception
// handler. App::$enableWhoops is Kirby's documented CI switch for exactly this.
Kirby\Cms\App::$enableWhoops = false;
