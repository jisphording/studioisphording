<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * The responsive-image snippet: <picture> from the media manifest, and the
 * thumb-based getResponsiveImage() output on a manifest miss.
 */
final class ResponsiveImageTest extends KirbyTestCase
{
	private function render(string $page, array $data = []): DOMXPath
	{
		$file = $this->kirby->site()->find($page)->keyvisual();

		return $this->dom($this->snippetHtml('responsive-image', array_merge([
			'file'  => $file,
			'alt'   => 'Alt text',
			'class' => 'cls',
			'sizes' => null,
			'eager' => false,
		], $data)));
	}

	public function testPictureSourceOrderIsAvifWebpThenJpegImg(): void
	{
		$xpath = $this->render('projects/01-alpha');

		$types = [];
		foreach ($xpath->query('//picture//source') as $source) {
			$types[] = $source->getAttribute('type');
		}
		$this->assertSame(['image/avif', 'image/webp'], $types);

		// libxml's HTML4 parser may nest children oddly, so assert document order.
		$order = [];
		foreach ($xpath->query('//picture//*') as $node) {
			$order[] = $node->nodeName;
		}
		$this->assertSame(['source', 'source', 'img'], $order, 'avif, webp, then the img');
	}

	public function testEachSourceCarriesSrcsetAndTheSharedSizes(): void
	{
		$xpath = $this->render('projects/01-alpha', ['sizes' => '50vw']);

		$avif = $xpath->query('//source[@type="image/avif"]')->item(0);
		$this->assertStringContainsString('alpha_keyvisual-480-aaaa.avif 480w', $avif->getAttribute('srcset'));
		$this->assertStringContainsString('alpha_keyvisual-1200-bbbb.avif 1200w', $avif->getAttribute('srcset'));

		$webp = $xpath->query('//source[@type="image/webp"]')->item(0);
		$this->assertStringContainsString('.webp 1200w', $webp->getAttribute('srcset'));

		$img = $xpath->query('//picture//img')->item(0);
		$this->assertStringContainsString('alpha_keyvisual-1200-ffff.jpg 1200w', $img->getAttribute('srcset'));

		foreach ([$avif, $webp, $img] as $node) {
			$this->assertSame('50vw', $node->getAttribute('sizes'));
		}
	}

	public function testDefaultSizesAreUsedWhenNoneGiven(): void
	{
		$img = $this->render('projects/01-alpha')->query('//picture//img')->item(0);

		$this->assertSame(mediaDefaultSizes(), $img->getAttribute('sizes'));
	}

	public function testImgCarriesIntrinsicDimensionsFromTheManifest(): void
	{
		$img = $this->render('projects/01-alpha')->query('//picture//img')->item(0);

		$this->assertSame('1600', $img->getAttribute('width'));
		$this->assertSame('1000', $img->getAttribute('height'));
		$this->assertSame('Alt text', $img->getAttribute('alt'));
		$this->assertSame('cls', $img->getAttribute('class'));
	}

	public function testLazyByDefaultAndEagerWithFetchpriorityWhenFlagged(): void
	{
		$lazy = $this->render('projects/01-alpha')->query('//picture//img')->item(0);
		$this->assertSame('lazy', $lazy->getAttribute('loading'));
		$this->assertFalse($lazy->hasAttribute('fetchpriority'));

		$eager = $this->render('projects/01-alpha', ['eager' => true])->query('//picture//img')->item(0);
		$this->assertSame('eager', $eager->getAttribute('loading'));
		$this->assertSame('high', $eager->getAttribute('fetchpriority'));
	}

	public function testManifestMissFallsBackToTheThumbImg(): void
	{
		$xpath = $this->render('projects/02-beta', ['eager' => true]);

		$this->assertSame(0, $xpath->query('//picture')->length, 'no <picture> on a miss');

		$img = $xpath->query('//img')->item(0);
		$this->assertNotNull($img, 'still renders an image');
		$this->assertNotSame('', $img->getAttribute('srcset'));
		$this->assertStringContainsString('beta_keyvisual', $img->getAttribute('src'));
		$this->assertSame('eager', $img->getAttribute('loading'), 'eager flag survives the fallback');
		$this->assertSame('high', $img->getAttribute('fetchpriority'));
	}

	public function testAbsentManifestFallsBackToTheThumbImg(): void
	{
		unlink($this->tmp . '/assets/media/manifest.json');
		$this->tmp = sys_get_temp_dir() . '/studioisphording-tests-' . bin2hex(random_bytes(8));
		\Kirby\Filesystem\Dir::copy(__DIR__ . '/../fixtures', $this->tmp);
		unlink($this->tmp . '/assets/media/manifest.json');
		$this->app();

		$xpath = $this->render('projects/01-alpha');

		$this->assertSame(0, $xpath->query('//picture')->length);
		$this->assertSame(1, $xpath->query('//img[@srcset]')->length);
	}

	public function testAltAndClassAreEscapedInThePictureBranch(): void
	{
		$html = $this->snippetHtml('responsive-image', [
			'file'  => $this->kirby->site()->find('projects/01-alpha')->keyvisual(),
			'alt'   => 'a" onerror="x',
			'class' => 'c" data-x="y',
			'sizes' => null,
			'eager' => false,
		]);
		$img = $this->dom($html)->query('//picture//img')->item(0);

		$this->assertSame('a" onerror="x', $img->getAttribute('alt'));
		$this->assertFalse($img->hasAttribute('onerror'));
		$this->assertFalse($img->hasAttribute('data-x'));
	}
}
