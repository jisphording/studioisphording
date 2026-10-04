<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Tests for the pageMethods registered by the studio-isphording/site-methods
 * plugin (app/site/plugins/site-methods/index.php): keyvisual(), rendersWebgl(), webglWorld(), webglWorldChunk().
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

	public function testRendersWebglIsTrueForATemplateWithAWebglCanvas(): void
	{
		$this->assertTrue($this->kirby->site()->find('moodboard')->rendersWebgl());
	}

	public function testRendersWebglIsFalseElsewhere(): void
	{
		$this->assertFalse($this->kirby->site()->find('home')->rendersWebgl());
		$this->assertFalse($this->kirby->site()->find('about')->rendersWebgl());
	}

	public function testWebglWorldIsWorld01ForTheInneneinrichtungSlug(): void
	{
		$page = new Kirby\Cms\Page(['slug' => 'isphording-inneneinrichtung', 'template' => 'project.three']);

		$this->assertSame('World_01', $page->webglWorld());
		$this->assertSame('isphording-inneneinrichtung', $page->webglWorldChunk());
	}

	public function testWebglWorldIsWorld02ForEveryOtherPage(): void
	{
		$page = $this->kirby->site()->find('moodboard');

		$this->assertSame('World_02', $page->webglWorld());
		$this->assertSame('moodboard', $page->webglWorldChunk());
	}

	/** Guard: the world → chunk-folder map must match dev/js/three/worlds.mjs. */
	public function testWebglWorldChunksMatchTheWorldsRegistry(): void
	{
		$source = file_get_contents(dirname(__DIR__, 3) . '/dev/js/three/worlds.mjs');
		preg_match_all("/(World_\\d+):\\s*\\{[^}]*?projects\\/([^\\/]+)\\/index\\.mjs[^}]*?name:\\s*'([^']+)'/", $source, $m, PREG_SET_ORDER);

		$registry = [];
		foreach ($m as $row) {
			$this->assertSame($row[2], $row[3], 'chunk folder and Resources worldName agree');
			$registry[$row[1]] = $row[2];
		}
		ksort($registry);
		$map = WEBGL_WORLD_CHUNKS;
		ksort($map);

		$this->assertNotSame([], $registry);
		$this->assertSame($registry, $map);
	}

	/** Guard: the template list behind rendersWebgl() must match the templates
	 * that actually render a #webgl canvas snippet, or a new WebGL template
	 * would silently lose its Three.js modulepreload.
	 */
	public function testRendersWebglTemplatesMatchTemplatesRenderingAWebglCanvas(): void
	{
		$site = dirname(__DIR__, 3) . '/app/site';

		$canvasSnippets = [];
		foreach (glob($site . '/snippets/*.php') as $file) {
			if (str_contains(file_get_contents($file), 'id="webgl"')) {
				$canvasSnippets[] = basename($file, '.php');
			}
		}
		$this->assertNotSame([], $canvasSnippets);

		$templates = [];
		foreach (glob($site . '/templates/*.php') as $file) {
			$source = file_get_contents($file);
			foreach ($canvasSnippets as $snippet) {
				if (preg_match("/snippet\\(\\s*['\"]" . preg_quote($snippet, '/') . "['\"]/", $source) || str_contains($source, 'id="webgl"')) {
					$templates[] = basename($file, '.php');
					break;
				}
			}
		}
		sort($templates);

		$this->assertSame($templates, WEBGL_TEMPLATES);
	}
}
