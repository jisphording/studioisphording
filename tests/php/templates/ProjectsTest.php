<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Projects template (app/site/templates/projects.php): the list covers go
 * through the responsive-image snippet.
 */
// Fixture note: Kirby only lists NN_-prefixed folders, so the listed children live under content/work/ (template "projects") to keep the 01-alpha fixtures untouched.
final class ProjectsTest extends KirbyTestCase
{
	private function renderProjects(): DOMXPath
	{
		return $this->dom($this->kirby->site()->find('work')->render());
	}

	public function testManifestHitRendersPictureWithClassAndAlt(): void
	{
		$xpath = $this->renderProjects();

		$img = $xpath->query('//ul[contains(@class, "projects")]//picture//img[@class="project-list-image"]')->item(0);
		$this->assertNotNull($img, '1_listed-hit is in the manifest, so it renders a <picture>');
		$this->assertStringContainsString('Listed Hit', $img->getAttribute('alt'));
		$this->assertStringContainsString('hit_keyvisual-1200-', $img->getAttribute('srcset'));
		$this->assertSame('lazy', $img->getAttribute('loading'));
		$this->assertSame('100vw', $img->getAttribute('sizes'));
	}

	public function testManifestMissFallsBackToThumbImg(): void
	{
		$xpath = $this->renderProjects();

		$misses = $xpath->query('//ul[contains(@class, "projects")]//img[@class="project-list-image"][not(parent::picture)]');
		$this->assertGreaterThanOrEqual(1, $misses->length, '2_listed-miss is not in the manifest');
		$this->assertStringContainsString('/media/', $misses->item(0)->getAttribute('srcset'));
	}

	public function testTemplateNoLongerCallsTheThumbMethodDirectly(): void
	{
		$this->assertStringNotContainsString(
			'getResponsiveImage',
			file_get_contents(dirname(__DIR__, 3) . '/app/site/templates/projects.php')
		);
	}
}
