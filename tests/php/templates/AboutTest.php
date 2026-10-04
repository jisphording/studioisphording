<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * About template (app/site/templates/about.php): every mood image goes
 * through the responsive-image snippet — <picture> on a manifest hit, the
 * thumb-based <img> on a miss — with its class, alt and a layout-derived sizes.
 */
final class AboutTest extends KirbyTestCase
{
	private function renderAbout(): DOMXPath
	{
		return $this->dom($this->kirby->site()->find('about')->render());
	}

	public function testManifestHitRendersPictureWithClassAndAlt(): void
	{
		$xpath = $this->renderAbout();

		$img = $xpath->query('//picture//img[contains(@class, "mood-image")]')->item(0);
		$this->assertNotNull($img, 'mood-01 is in the manifest, so it renders a <picture>');
		$this->assertSame('mood-image', $img->getAttribute('class'));
		$this->assertSame('Mood <script>alert(1)</script> & "Q"', $img->getAttribute('alt'));
		$this->assertSame(1, $xpath->query('//picture//source[@type="image/avif"]')->length >= 1 ? 1 : 0);
		$this->assertSame(1, $xpath->query('//picture//source[@type="image/webp"]')->length >= 1 ? 1 : 0);
	}

	public function testManifestMissFallsBackToThumbImg(): void
	{
		$xpath = $this->renderAbout();

		$img = $xpath->query('//img[@class="mood-image-full"]')->item(0);
		$this->assertNotNull($img, 'mood-02 has no manifest entry');
		$this->assertSame('Mood image', $img->getAttribute('alt'));
		$this->assertSame(0, $xpath->query('//img[@class="mood-image-full"]/parent::picture')->length);
		$this->assertStringContainsString('/media/', $img->getAttribute('srcset'));
	}

	public function testFirstMoodImageIsEagerAndTheRestLazy(): void
	{
		$xpath = $this->renderAbout();

		$first = $xpath->query('//img[@class="mood-image"]')->item(0);
		$this->assertSame('eager', $first->getAttribute('loading'));
		$this->assertSame('high', $first->getAttribute('fetchpriority'));

		foreach ($xpath->query('//img[contains(@class, "mood-image-")]') as $img) {
			$this->assertSame('lazy', $img->getAttribute('loading'));
		}
	}

	public function testEachClassGetsItsOwnSizes(): void
	{
		$xpath = $this->renderAbout();

		$sizes = [];
		foreach (['mood-image', 'mood-image-full', 'mood-image-quarter'] as $class) {
			$sizes[$class] = $xpath->query('//img[@class="' . $class . '"]')->item(0)->getAttribute('sizes');
			$this->assertNotSame(mediaDefaultSizes(), $sizes[$class], "$class overrides the grid default");
		}
		$this->assertSame('100vw', $sizes['mood-image']);
		$this->assertSame('100vw', $sizes['mood-image-full']);
		$this->assertSame('(max-width: 767px) 100vw, 50vw', $sizes['mood-image-quarter']);
	}

	public function testTemplateNoLongerCallsTheThumbMethodDirectly(): void
	{
		$this->assertStringNotContainsString(
			'getResponsiveImage',
			file_get_contents(dirname(__DIR__, 3) . '/app/site/templates/about.php')
		);
	}
}
