<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Tests for the pageMethods registered by the studio-isphording/site-methods
 * plugin (app/site/plugins/site-methods/index.php): keyvisual(), rendersWebgl().
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

	/**
	 * Guard: the template list behind rendersWebgl() must match the templates
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
