<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * The responsive-video snippet: manifest-backed ladder (AV1, VP9, H.264) with
 * poster and preload, and the plain-file fallback on a manifest miss.
 */
final class ResponsiveVideoTest extends KirbyTestCase
{
	private function render(array $data = []): DOMXPath
	{
		$reel = $this->kirby->site()->find('home')->file('reel.mp4');

		return $this->dom($this->snippetHtml('responsive-video', array_merge([
			'file'     => $reel,
			'fallback' => [
				['url' => 'https://example.test/home/reel.webm', 'type' => 'video/webm'],
				['url' => 'https://example.test/home/reel.mp4', 'type' => 'video/mp4'],
			],
			'poster'   => 'https://example.test/home/reel.jpg',
		], $data)));
	}

	private function sourceTypes(DOMXPath $xpath): array
	{
		$types = [];
		foreach ($xpath->query('//video[not(ancestor::noscript)]//source') as $source) {
			$types[] = $source->getAttribute('type');
		}

		return $types;
	}

	public function testSourcesFollowLadderOrderAv1Vp9H264(): void
	{
		$xpath = $this->render();

		$this->assertSame([
			'video/webm; codecs="av01.0.08M.08"',
			'video/webm; codecs="vp09.00.40.08"',
			'video/mp4; codecs="avc1.640028"',
		], $this->sourceTypes($xpath));
		$this->assertStringContainsString('reel.av1.1111.webm', $xpath->query('//source')->item(0)->getAttribute('data-src'));
	}

	public function testPosterComesFromTheManifestPosterEntry(): void
	{
		$video = $this->render()->query('//video')->item(0);

		$this->assertStringEndsWith('assets/media/home/reel.poster-1920-pppp.jpg', $video->getAttribute('poster'));
	}

	public function testPreloadIsExplicitAndDefaultsToNone(): void
	{
		$this->assertSame('none', $this->render()->query('//video')->item(0)->getAttribute('preload'));
		$this->assertSame('metadata', $this->render(['preload' => 'metadata'])->query('//video')->item(0)->getAttribute('preload'));
		$this->assertSame('none', $this->render(['preload' => 'bogus'])->query('//video')->item(0)->getAttribute('preload'));
	}

	public function testPlaybackAttributesArePreserved(): void
	{
		$video = $this->render(['hero' => true])->query('//video')->item(0);

		foreach (['playsinline', 'autoplay', 'muted', 'loop'] as $attr) {
			$this->assertTrue($video->hasAttribute($attr), $attr);
		}
	}

	public function testNonHeroVideoIsLazyAndHeroIsNot(): void
	{
		$this->assertSame('lazy', $this->render()->query('//video')->item(0)->getAttribute('loading'));
		$this->assertFalse($this->render(['hero' => true])->query('//video')->item(0)->hasAttribute('loading'));
	}

	public function testLazyVideoShipsDataSrcAndNoAutoplay(): void
	{
		$xpath = $this->render();
		$video = $xpath->query('//body/video | //video[not(ancestor::noscript)]')->item(0);

		$this->assertFalse($video->hasAttribute('autoplay'));
		$this->assertSame(0, $xpath->query('//video[@loading="lazy"]//source[@src]')->length);
		$sources = $xpath->query('//video[@loading="lazy"]//source[@data-src]');
		$this->assertSame(3, $sources->length);
		$this->assertStringContainsString('reel.av1.1111.webm', $sources->item(0)->getAttribute('data-src'));
		$this->assertSame('video/webm; codecs="av01.0.08M.08"', $sources->item(0)->getAttribute('type'));
	}

	public function testLazyVideoCarriesANoscriptFallbackWithRealSources(): void
	{
		$html = $this->snippetHtml('responsive-video', [
			'file'     => $this->kirby->site()->find('home')->file('reel.mp4'),
			'fallback' => [],
		]);

		$this->assertMatchesRegularExpression('#<noscript>\s*<video[^>]*autoplay[^>]*>\s*<source src="[^"]*reel\.av1\.1111\.webm"#', $html);
	}

	public function testHeroVideoKeepsRealSrcAndAutoplayWithoutNoscript(): void
	{
		$html  = $this->snippetHtml('responsive-video', [
			'file'     => $this->kirby->site()->find('home')->file('reel.mp4'),
			'fallback' => [],
			'hero'     => true,
		]);
		$xpath = $this->dom($html);

		$this->assertTrue($xpath->query('//video')->item(0)->hasAttribute('autoplay'));
		$this->assertSame(3, $xpath->query('//video//source[@src]')->length);
		$this->assertSame(0, $xpath->query('//source[@data-src]')->length);
		$this->assertStringNotContainsString('<noscript', $html);
	}

	public function testManifestMissFallsBackToTheGivenFileUrls(): void
	{
		$gamma = $this->kirby->site()->find('projects/03-gamma')->keyvisual();
		$xpath = $this->render(['file' => $gamma]);

		$this->assertSame(['video/webm', 'video/mp4'], $this->sourceTypes($xpath));
		$this->assertSame('https://example.test/home/reel.jpg', $xpath->query('//video')->item(0)->getAttribute('poster'));
	}

	public function testNoFileAndNoFallbackRendersNothing(): void
	{
		$html = $this->snippetHtml('responsive-video', ['file' => null, 'fallback' => []]);

		$this->assertSame('', trim($html));
	}
}
