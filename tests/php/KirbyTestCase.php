<?php

use Kirby\Cms\App as Kirby;
use Kirby\Filesystem\Dir;
use PHPUnit\Framework\TestCase;

/**
 * Base class for every app/site test.
 *
 * It boots a REAL Kirby 5 instance in-process — real plugins, snippets and
 * templates from app/site — but points content, media, cache and sessions at
 * a throwaway copy of tests/php/fixtures/ made fresh in setUp() and deleted in
 * tearDown(). Tests therefore never read or write the live content folder,
 * need no running PHP server and no network, and can run in any order.
 *
 * The site root is the real app/site, so Kirby also loads app/site/config.php
 * (production defaults: languages on, gd thumbs, custom.images.use_crop=false)
 * and the four language definitions in app/site/languages. Host-specific
 * overrides (config.localhost.php / config.127.0.0.1.php) are NOT loaded: the
 * index url is https://example.test, whose host has no matching config file.
 * Any option a test needs beyond the production defaults is passed explicitly.
 *
 * How to use it:
 *   - Extend this class; $this->kirby is booted for you.
 *   - $this->app([...]) rebuilds Kirby with deep-merged option overrides,
 *     e.g. $this->app(['custom' => ['images' => ['use_crop' => true]]]).
 *   - $this->snippetHtml('name', [...]) renders a snippet to a string.
 *   - $this->captureOutput(fn) captures what a callback echoes (site methods
 *     such as displayShowcase print their markup instead of returning it).
 *   - $this->dom($html) returns a DOMXPath so assertions can query elements
 *     and attributes instead of matching brittle raw strings.
 */
abstract class KirbyTestCase extends TestCase
{
	protected string $tmp;
	protected Kirby $kirby;

	protected function setUp(): void
	{
		$this->tmp = sys_get_temp_dir() . '/studioisphording-tests-' . bin2hex(random_bytes(8));
		Dir::copy(__DIR__ . '/fixtures', $this->tmp);

		$this->kirby = $this->app();
	}

	protected function tearDown(): void
	{
		if (isset($this->tmp) && is_dir($this->tmp)) {
			Dir::remove($this->tmp);
		}
	}

	/**
	 * (Re)build the Kirby instance, deep-merging $options over the fixture
	 * defaults. Rebuilding replaces the global App instance, so later
	 * kirby()/site() calls see the override.
	 */
	protected function app(array $options = []): Kirby
	{
		$this->kirby = new Kirby([
			'roots' => [
				'index'    => $this->tmp,
				'site'     => dirname(__DIR__, 2) . '/app/site',
				'content'  => $this->tmp . '/content',
				'media'    => $this->tmp . '/media',
				'cache'    => $this->tmp . '/cache',
				'sessions' => $this->tmp . '/sessions',
			],
			'urls' => [
				'index' => 'https://example.test',
			],
			'options' => $options,
		]);

		return $this->kirby;
	}

	/**
	 * Render a snippet to a string (snippet(..., return: true)).
	 */
	protected function snippetHtml(string $name, array $data = []): string
	{
		return snippet($name, $data, true);
	}

	/**
	 * Capture what a callback echoes — for site methods that print markup.
	 */
	protected function captureOutput(callable $fn): string
	{
		ob_start();
		try {
			$fn();
		} finally {
			$html = ob_get_clean();
		}

		return $html;
	}

	/**
	 * Parse an HTML fragment into a DOMXPath so tests can query elements and
	 * attributes. libxml errors are captured (not emitted as PHP warnings) so
	 * fragments without a full document shell don't trip failOnWarning.
	 */
	protected function dom(string $html): DOMXPath
	{
		$doc = new DOMDocument();
		$previous = libxml_use_internal_errors(true);
		$doc->loadHTML(
			'<?xml encoding="UTF-8"><div id="__root__">' . $html . '</div>',
			LIBXML_NOERROR | LIBXML_NOWARNING
		);
		libxml_clear_errors();
		libxml_use_internal_errors($previous);

		return new DOMXPath($doc);
	}
}
