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

	public function testShowreelSourcesListWebmBeforeMp4(): void
	{
		$xpath   = $this->dom($this->renderHome());
		$sources = $xpath->query("//video//source");

		$this->assertSame(2, $sources->length, 'both mp4 and webm sources render');
		$this->assertSame('video/webm', $sources->item(0)->getAttribute('type'), 'webm source comes first');
		$this->assertSame('video/mp4', $sources->item(1)->getAttribute('type'), 'mp4 source comes second');
	}

	public function testShowreelVideoHasExplicitPreloadAndKeepsPoster(): void
	{
		$xpath = $this->dom($this->renderHome());
		$video = $xpath->query("//video")->item(0);

		$this->assertNotNull($video);
		$this->assertSame('none', $video->getAttribute('preload'));
		$this->assertStringContainsString('reel.jpg', $video->getAttribute('poster'));
	}
}
