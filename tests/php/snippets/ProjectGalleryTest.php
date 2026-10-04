<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Characterization tests for app/site/snippets/project-gallery.php. The snippet
 * lists a project's non-keyvisual, non-intro images (and videos), preferring
 * WebP; with $useResponsiveImages off it falls back to a single thumb <img>.
 * The beta fixture carries one gallery image (beta-work-01.png) alongside its
 * keyvisual, which the snippet must exclude.
 */
final class ProjectGalleryTest extends KirbyTestCase
{
	private function render(array $data): DOMXPath
	{
		$page = $this->kirby->site()->find('projects/02-beta');
		$html = $this->snippetHtml('project-gallery', array_merge([
			'page' => $page,
			'site' => $this->kirby->site(),
		], $data));

		return $this->dom($html);
	}

	public function testResponsiveImagesOnRendersOneResponsiveImagePerGalleryImage(): void
	{
		$xpath = $this->render(['useResponsiveImages' => true]);

		// One gallery image (the keyvisual is filtered out) -> one <img> with
		// the responsive srcset contract.
		$imgs = $xpath->query('//img');
		$this->assertSame(1, $imgs->length);
		$this->assertNotSame('', $imgs->item(0)->getAttribute('srcset'), 'responsive image carries a srcset');
	}

	public function testResponsiveImagesOffRendersFallbackThumbImage(): void
	{
		$xpath = $this->render(['useResponsiveImages' => false]);

		$imgs = $xpath->query('//img');
		$this->assertSame(1, $imgs->length);
		$img = $imgs->item(0);

		$this->assertSame('', $img->getAttribute('srcset'), 'fallback image has no srcset');
		$this->assertStringContainsString('beta-work-01', $img->getAttribute('src'), 'fallback src is the thumb url');
		$this->assertStringContainsString('-800x640-', $img->getAttribute('src'), 'fallback uses the 800-wide thumb');
		$this->assertSame('Beta Project', $img->getAttribute('alt'), 'alt is the page title');
		$this->assertSame('showcase__grid--image--inside', $img->getAttribute('class'));
	}

	public function testKeyvisualIsExcludedFromTheGallery(): void
	{
		$xpath = $this->render(['useResponsiveImages' => false]);

		foreach ($xpath->query('//img') as $img) {
			$this->assertStringNotContainsString('_keyvisual', $img->getAttribute('src'));
		}
	}

	private function renderGamma(array $data): DOMXPath
	{
		$page = $this->kirby->site()->find('projects/03-gamma');
		$html = $this->snippetHtml('project-gallery', array_merge([
			'page' => $page,
			'site' => $this->kirby->site(),
		], $data));

		return $this->dom($html);
	}

	/**
	 * A `site` stand-in whose getResponsiveImage() always throws, so the
	 * snippet's catch branch runs regardless of the image data; getThumbnail()
	 * delegates to the real site so the fallback thumb still resolves.
	 */
	private function throwingResponsiveImageSite(): object
	{
		$realSite = $this->kirby->site();

		return new class ($realSite) {
			public function __construct(private $realSite) {}

			public function getResponsiveImage(...$args)
			{
				throw new Exception('forced for testing');
			}

			public function getThumbnail(...$args)
			{
				return $this->realSite->getThumbnail(...$args);
			}
		};
	}

	public function testResponsiveImageExceptionFallsBackToOneImgWithEscapedAlt(): void
	{
		// getResponsiveImage() throwing (e.g. an unreadable source image)
		// must still render exactly one fallback <img>, and the quote in
		// gamma's title must not break out of the alt attribute.
		$page = $this->kirby->site()->find('projects/03-gamma');
		$html = $this->snippetHtml('project-gallery', [
			'page' => $page,
			'site' => $this->throwingResponsiveImageSite(),
			'useResponsiveImages' => true,
		]);
		$xpath = $this->dom($html);

		$imgs = $xpath->query('//img');
		$this->assertSame(1, $imgs->length, 'exactly one fallback <img> when getResponsiveImage throws');

		$img = $imgs->item(0);
		$this->assertSame('', $img->getAttribute('srcset'), 'fallback image has no srcset');
		$this->assertStringContainsString('-800x640-', $img->getAttribute('src'), 'fallback uses the 800-wide thumb');
		$this->assertSame('Gamma "Broken" Project', $img->getAttribute('alt'), 'quoted title does not break the alt attribute');
		$this->assertSame('showcase__grid--image--inside', $img->getAttribute('class'));
	}

	public function testFallbackPathAlsoEscapesAQuotedTitle(): void
	{
		// Same fixture, but with $useResponsiveImages off, exercising the
		// non-responsive fallback path directly rather than via the catch.
		$xpath = $this->renderGamma(['useResponsiveImages' => false]);

		$imgs = $xpath->query('//img');
		$this->assertSame(1, $imgs->length);
		$this->assertSame('Gamma "Broken" Project', $imgs->item(0)->getAttribute('alt'));
	}

	public function testGalleryDoesNotGroupImagesByBaseName(): void
	{
		// <picture> negotiates formats, so a WebP/JPG pair is no longer
		// collapsed to one: a stored sibling renders as its own item.
		$page = $this->kirby->site()->find('projects/02-beta');
		copy($page->root() . '/beta-work-01.png', $page->root() . '/beta-work-01.webp');
		$this->app();

		$html = $this->snippetHtml('project-gallery', [
			'page' => $this->kirby->site()->find('projects/02-beta'),
			'site' => $this->kirby->site(),
		]);

		$this->assertSame(2, $this->dom($html)->query('//img')->length);
	}

	public function testGalleryVideosRenderFromTheManifestLadderAndSkipTheKeyvisualVideo(): void
	{
		// A project's videos come from the manifest ladder (AV1, VP9, H.264)
		// like every other video. The keyvisual video is not a gallery item,
		// legacy .webm siblings of a master are not videos of their own, and
		// the still that is the video's poster is not listed as an image.
		$page = $this->kirby->site()->find('projects/02-beta');
		foreach (['beta-demo.mp4', 'beta-demo.webm', 'beta_keyvisual.mp4'] as $name) {
			file_put_contents($page->root() . '/' . $name, 'x');
		}
		copy($page->root() . '/beta-work-01.png', $page->root() . '/beta-demo.png');
		$this->app();

		$html = $this->snippetHtml('project-gallery', [
			'page' => $this->kirby->site()->find('projects/02-beta'),
			'site' => $this->kirby->site(),
		]);
		$xpath = $this->dom($html);

		$this->assertSame(1, $xpath->query('//video[not(ancestor::noscript)]')->length, 'one gallery video, keyvisual skipped');
		$types = [];
		foreach ($xpath->query('//video[not(ancestor::noscript)]//source') as $source) {
			$types[] = $source->getAttribute('type');
			$this->assertStringContainsString('beta-demo', $source->getAttribute('data-src'));
			$this->assertStringNotContainsString('/video/', $source->getAttribute('data-src'));
		}
		$this->assertSame([
			'video/webm; codecs="av01.0.08M.08"',
			'video/webm; codecs="vp09.00.40.08"',
			'video/mp4; codecs="avc1.640028"',
		], $types);
		$this->assertSame(1, $xpath->query('//img')->length, 'the poster still is not listed beside its video');
		$this->assertStringNotContainsString('beta-demo', $xpath->query('//img')->item(0)->getAttribute('src'));
	}
}
