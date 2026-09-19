<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Characterization tests for the studio-isphording/site-methods plugin
 * (app/site/plugins/site-methods/index.php): getThumbnail and
 * getResponsiveImage. The grid markup the plugin used to print now lives in
 * the showcase-grid / related-grid snippets (see tests/php/snippets/).
 * Assertions query the rendered DOM, not raw strings, so they pin behaviour
 * without breaking when phase 6 escapes field output.
 */
final class SiteMethodsTest extends KirbyTestCase
{
	private function keyvisual(string $projectId = 'projects/01-alpha')
	{
		return $this->kirby->site()
			->find($projectId)
			->images()
			->filterBy('filename', '*=', '_keyvisual')
			->first();
	}

	/** Widths, in order, extracted from a srcset attribute value. */
	private function srcsetWidths(string $srcset): array
	{
		preg_match_all('/\s(\d+)w/', $srcset, $m);
		return array_map('intval', $m[1]);
	}

	public function testGetThumbnailResizesByDefault(): void
	{
		$thumb = $this->kirby->site()->getThumbnail($this->keyvisual(), 490, 390, 60);
		$mods  = $thumb->modifications();

		$this->assertArrayNotHasKey('crop', $mods, 'default config should resize, not crop');
		$this->assertSame(490, $mods['width']);
		$this->assertSame(390, $mods['height']);
		$this->assertSame(60, $mods['quality']);
	}

	public function testGetThumbnailCropsWhenEnabled(): void
	{
		$this->app(['custom' => ['images' => ['use_crop' => true]]]);

		$thumb = $this->kirby->site()->getThumbnail($this->keyvisual(), 490, 390, 60);
		$mods  = $thumb->modifications();

		$this->assertArrayHasKey('crop', $mods, 'custom.images.use_crop=true should crop');
		$this->assertSame(490, $mods['width']);
		$this->assertSame(390, $mods['height']);
	}

	public function testGetResponsiveImageEmitsOneImgWithDefaultSizesContract(): void
	{
		$html  = $this->kirby->site()->getResponsiveImage($this->keyvisual(), 'Alpha keyvisual', 'showcase');
		$xpath = $this->dom($html);
		$imgs  = $xpath->query('//img');

		$this->assertSame(1, $imgs->length, 'exactly one <img>');
		$img = $imgs->item(0);

		$this->assertStringContainsString('-490x390-q60.', $img->getAttribute('src'), 'src is the 490-wide thumb');
		$this->assertSame('lazy', $img->getAttribute('loading'));
		$this->assertSame('showcase', $img->getAttribute('class'));
		$this->assertSame('Alpha keyvisual', $img->getAttribute('alt'));

		$this->assertSame(
			[490, 800, 1200, 1600, 1920, 2160, 2560, 3200, 3840, 4320],
			$this->srcsetWidths($img->getAttribute('srcset')),
			'ten srcset candidates in the documented order'
		);

		$this->assertSame(
			'(max-width: 768px) 490px, (max-width: 1024px) 800px, (max-width: 1440px) 1200px, (max-width: 1920px) 1600px, (max-width: 2160px) 1920px, (max-width: 2560px) 2160px, (max-width: 3200px) 2560px, (max-width: 3840px) 3200px, (max-width: 4320px) 3840px, 4320px',
			$img->getAttribute('sizes'),
			'default sizes attribute when none is passed'
		);
	}

	public function testGetResponsiveImageUsesGivenSizes(): void
	{
		$sizes = '(max-width: 600px) 100vw, 50vw';
		$html  = $this->kirby->site()->getResponsiveImage($this->keyvisual(), 'Alpha keyvisual', '', $sizes);
		$xpath = $this->dom($html);

		$this->assertSame($sizes, $xpath->query('//img')->item(0)->getAttribute('sizes'));
	}

	public function testSiteNoLongerHasMarkupPrintingGridMethods(): void
	{
		// Phase 5 moved both grids into the showcase-grid / related-grid
		// snippets; the site methods that echoed them must be gone.
		$site = $this->kirby->site();

		$this->assertTrue($site->hasMethod('getResponsiveImage'), 'control: plugin methods are registered');
		$this->assertFalse($site->hasMethod('displayShowcase'));
		$this->assertFalse($site->hasMethod('pullRelatedPages'));
	}

	public function testResponsiveImageAltIsEscaped(): void
	{
		// SEC-01: $alt used to be concatenated into the <img> string
		// unescaped, so a title containing a double quote broke out of the
		// alt attribute. getResponsiveImage now builds the tag with
		// Html::img(), which encodes every attribute.
		$alt   = 'Say "hi" & bye';
		$html  = $this->kirby->site()->getResponsiveImage($this->keyvisual(), $alt, 'cls');
		$xpath = $this->dom($html);

		$this->assertSame($alt, $xpath->query('//img')->item(0)->getAttribute('alt'));
	}

	public function testResponsiveImageClassIsEscaped(): void
	{
		$class = 'showcase" onerror="alert(1)';
		$html  = $this->kirby->site()->getResponsiveImage($this->keyvisual(), 'Alpha keyvisual', $class);
		$xpath = $this->dom($html);

		$this->assertSame($class, $xpath->query('//img')->item(0)->getAttribute('class'));
	}

	public function testResponsiveImageDefaultClassIsPresentAndEmpty(): void
	{
		// No class argument passed -> parity with the pre-refactor markup,
		// which always emitted class="" rather than omitting the attribute.
		$html  = $this->kirby->site()->getResponsiveImage($this->keyvisual(), 'Alpha keyvisual');
		$xpath = $this->dom($html);
		$img   = $xpath->query('//img')->item(0);

		$this->assertTrue($img->hasAttribute('class'));
		$this->assertSame('', $img->getAttribute('class'));
	}

	public function testResponsiveImageCustomSizesIsEscaped(): void
	{
		$sizes = '"><script>alert(1)</script>';
		$html  = $this->kirby->site()->getResponsiveImage($this->keyvisual(), 'Alpha keyvisual', '', $sizes);
		$xpath = $this->dom($html);

		$this->assertSame($sizes, $xpath->query('//img')->item(0)->getAttribute('sizes'));
		$this->assertSame(0, $xpath->query('//script')->length, 'sizes value must not break out into markup');
	}
}
