<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Guards app/site/plugins against a stray or resurrected plugin (e.g. phase 2's
 * deleted starterkit gallery hook) by pinning the exact set of plugins Kirby
 * boots, and that no kirbytags:after hook mutates kirbytext() output.
 */
final class PluginInventoryTest extends KirbyTestCase
{
	public function testBootedPluginsAreExactlyTheExpectedSet(): void
	{
		$this->assertSame(
			[
				'studio-isphording/helpers',
				'studioisphording/media-manifest',
				'studio-isphording/media-processing',
				'studio-isphording/site-methods',
				'studioisphording/vite-manifest',
			],
			array_keys($this->kirby->plugins())
		);
	}

	public function testNoKirbytagsAfterHookIsRegistered(): void
	{
		$this->assertArrayNotHasKey('kirbytags:after', $this->kirby->extensions('hooks'));
	}

	public function testKirbytextOfAFixtureParagraphIsUnchangedByHooks(): void
	{
		$text = 'Plain paragraph with no kirbytags.';

		$this->assertSame(
			"<p>{$text}</p>",
			trim((string) $this->kirby->kirbytext($text))
		);
	}
}
