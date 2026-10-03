<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * The media-manifest plugin: reads app/assets/media/manifest.json (the fixture
 * copy lives at tests/php/fixtures/assets/media/), caches it for the request
 * and resolves a content file to its entry.
 */
final class MediaManifestTest extends KirbyTestCase
{
	private function keyvisual(string $page = 'projects/01-alpha')
	{
		return $this->kirby->site()->find($page)->keyvisual();
	}

	public function testLookupResolvesAFileByItsContentRelativePath(): void
	{
		$entry = getMediaEntry($this->keyvisual());

		$this->assertNotNull($entry);
		$this->assertSame(1600, $entry['width']);
		$this->assertSame(1000, $entry['height']);
		$this->assertCount(6, $entry['variants']);
	}

	public function testLookupMissReturnsNull(): void
	{
		$this->assertNull(getMediaEntry($this->keyvisual('projects/02-beta')));
	}

	public function testVariantsGroupByFormatInManifestOrder(): void
	{
		$byFormat = getMediaVariantsByFormat(getMediaEntry($this->keyvisual()));

		$this->assertSame(['avif', 'webp', 'jpeg'], array_keys($byFormat));
		$this->assertSame([480, 1200], array_column($byFormat['avif'], 'width'));
	}

	public function testSrcsetUsesAbsoluteUrlsAndWidthDescriptors(): void
	{
		$byFormat = getMediaVariantsByFormat(getMediaEntry($this->keyvisual()));

		$this->assertSame(
			'https://example.test/assets/media/projects/01-alpha/alpha_keyvisual-480-aaaa.avif 480w, '
			. 'https://example.test/assets/media/projects/01-alpha/alpha_keyvisual-1200-bbbb.avif 1200w',
			mediaSrcset($byFormat['avif'])
		);
	}

	public function testManifestIsCachedForTheRequest(): void
	{
		$this->assertNotNull(getMediaEntry($this->keyvisual()));

		// Removing the file after the first read must not matter: the
		// decoded manifest is static-cached.
		unlink($this->tmp . '/assets/media/manifest.json');

		$this->assertNotNull(getMediaEntry($this->keyvisual()));
	}

	public function testMissingManifestYieldsEmptyResultWithoutError(): void
	{
		unlink($this->tmp . '/assets/media/manifest.json');
		// A fresh index root so the per-path cache has no entry for it.
		$this->tmp = sys_get_temp_dir() . '/studioisphording-tests-' . bin2hex(random_bytes(8));
		\Kirby\Filesystem\Dir::copy(__DIR__ . '/../fixtures', $this->tmp);
		unlink($this->tmp . '/assets/media/manifest.json');
		$this->app();

		$this->assertSame([], getMediaManifest());
		$this->assertNull(getMediaEntry($this->keyvisual()));
	}

	public function testInvalidManifestIsTreatedAsEmpty(): void
	{
		$this->tmp = sys_get_temp_dir() . '/studioisphording-tests-' . bin2hex(random_bytes(8));
		\Kirby\Filesystem\Dir::copy(__DIR__ . '/../fixtures', $this->tmp);
		file_put_contents($this->tmp . '/assets/media/manifest.json', '{not json');
		$this->app();

		$this->assertSame([], getMediaManifest());
	}
}
