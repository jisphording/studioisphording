<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * The vite-manifest plugin (app/site/plugins/vite-manifest/index.php) in
 * production mode, against the fixture build manifest at
 * tests/php/fixtures/assets/bundle/.vite/manifest.json, which has the
 * route-split shape: Three.js and the worlds are reached only through the
 * js/three/runExperience.js dynamic import.
 *
 * Only pages whose template renders a #webgl canvas may reference the Three
 * chunks; every other page must not script or modulepreload them.
 */
final class ViteManifestTest extends KirbyTestCase
{
	private const THREE_CHUNKS = ['vendor-three-', 'runExperience-', 'isphording-inneneinrichtung-', 'moodboard-'];

	/** href/src of every modulepreload link and module script in $html. */
	private function scriptUrls(string $html): array
	{
		$xpath = $this->dom($html);
		$urls  = [];

		foreach ($xpath->query("//link[@rel='modulepreload']/@href | //script[@type='module']/@src") as $attr) {
			$urls[] = $attr->value;
		}

		return $urls;
	}

	private function threeUrls(array $urls): array
	{
		return array_values(array_filter($urls, function ($url) {
			foreach (self::THREE_CHUNKS as $chunk) {
				if (str_contains($url, $chunk)) {
					return true;
				}
			}
			return false;
		}));
	}

	public function testNonWebglPageReferencesNoThreeOrWorldChunk(): void
	{
		$urls = $this->scriptUrls($this->kirby->site()->find('home')->render());

		$this->assertContains('https://example.test/assets/bundle/app.bundle.js', $urls, 'the entry still loads');
		$this->assertContains('https://example.test/assets/bundle/cookieconsent-AAAA0004.js', $urls, 'non-three dynamic imports are still preloaded');
		$this->assertSame([], $this->threeUrls($urls));
	}

	public function testAboutPageReferencesNoThreeOrWorldChunk(): void
	{
		$urls = $this->scriptUrls($this->kirby->site()->find('about')->render());

		$this->assertSame([], $this->threeUrls($urls));
	}

	public function testWebglPageModulepreloadsTheExperienceAndVendorThree(): void
	{
		$html  = $this->kirby->site()->find('moodboard')->render();
		$xpath = $this->dom($html);
		$hrefs = [];

		foreach ($xpath->query("//link[@rel='modulepreload']/@href") as $attr) {
			$hrefs[] = $attr->value;
		}

		$this->assertSame(1, $xpath->query("//canvas[@id='webgl']")->length, 'the page renders #webgl');
		$this->assertContains('https://example.test/assets/bundle/runExperience-AAAA0005.js', $hrefs);
		$this->assertContains('https://example.test/assets/bundle/vendor-three-AAAA0002.js', $hrefs);
		$this->assertSame(count($hrefs), count(array_unique($hrefs)), 'no chunk is preloaded twice');
		$this->assertNotContains('https://example.test/assets/bundle/app.bundle.js', $hrefs, 'the entry is loaded by its <script>, not preloaded again');
	}

	public function testHelperOnlyPreloadsThreeChunksWhenAskedFor(): void
	{
		$this->assertSame([], $this->threeUrls($this->scriptUrls(vite('js/index.js'))));
		$this->assertNotSame([], $this->threeUrls($this->scriptUrls(vite('js/index.js', true))));
	}
}
