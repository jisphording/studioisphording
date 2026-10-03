<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Tests for the home template's showreel video markup
 * (app/site/templates/home.php). RES-02: the hero video downloaded 22.6 MB
 * before LCP because Chrome always picked the first <source>, which used to
 * be the MP4, and there was no preload attribute to bound eager buffering.
 */
final class HomeTest extends KirbyTestCase
{
	private function renderHome(): string
	{
		return $this->kirby->site()->find('home')->render();
	}

	public function testShowreelSourcesFollowTheLadderAv1Vp9H264(): void
	{
		$xpath   = $this->dom($this->renderHome());
		$sources = $xpath->query("//video//source");

		$this->assertSame(3, $sources->length, 'AV1, VP9 and H.264 sources render');
		$this->assertStringStartsWith('video/webm; codecs="av01', $sources->item(0)->getAttribute('type'), 'AV1 comes first');
		$this->assertStringStartsWith('video/webm; codecs="vp09', $sources->item(1)->getAttribute('type'), 'VP9 comes second');
		$this->assertStringStartsWith('video/mp4', $sources->item(2)->getAttribute('type'), 'H.264 comes last');
	}

	public function testShowreelVideoHasExplicitPreloadAndKeepsPoster(): void
	{
		$xpath = $this->dom($this->renderHome());
		$video = $xpath->query("//video")->item(0);

		$this->assertNotNull($video);
		$this->assertSame('none', $video->getAttribute('preload'));
		$this->assertStringContainsString('reel.poster-1920', $video->getAttribute('poster'));
		$this->assertFalse($video->hasAttribute('loading'), 'the hero is not lazy');
	}

	public function testHeroPosterIsPreloadedWithHighFetchPriority(): void
	{
		$xpath = $this->dom($this->renderHome());
		$link  = $xpath->query("//link[@rel='preload'][@as='image']")->item(0);

		$this->assertNotNull($link);
		$this->assertSame('high', $link->getAttribute('fetchpriority'));
		$this->assertStringContainsString('reel.poster-1920', $link->getAttribute('href'));
	}
}
