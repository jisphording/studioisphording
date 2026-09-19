<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Tests for the pageMethods registered by the studio-isphording/site-methods
 * plugin (app/site/plugins/site-methods/index.php): keyvisual().
 */
final class PageMethodsTest extends KirbyTestCase
{
	public function testKeyvisualReturnsTheKeyvisualImage(): void
	{
		$image = $this->kirby->site()->find('projects/01-alpha')->keyvisual();

		$this->assertNotNull($image);
		$this->assertSame('alpha_keyvisual.png', $image->filename());
	}

	public function testKeyvisualIgnoresOtherImagesOnThePage(): void
	{
		// Beta also has beta-work-01.png; only the _keyvisual file matches.
		$image = $this->kirby->site()->find('projects/02-beta')->keyvisual();

		$this->assertSame('beta_keyvisual.png', $image->filename());
	}

	public function testKeyvisualIsNullWhenThePageHasNone(): void
	{
		$this->assertNull($this->kirby->site()->find('projects')->keyvisual());
	}
}
