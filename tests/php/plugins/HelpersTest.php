<?php

use PHPUnit\Framework\Attributes\Group;

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Characterization tests for the studio-isphording/helpers plugin
 * (app/site/plugins/helpers/index.php): remove_br_tags() and create_tags().
 * Booting KirbyTestCase already loads every app/site plugin, so both
 * functions exist without any manual include or snippet render.
 */
final class HelpersTest extends KirbyTestCase
{
	public function testHelperFunctionsExistAfterKirbyBootsWithNoSnippetRendered(): void
	{
		$this->assertTrue(function_exists('remove_br_tags'));
		$this->assertTrue(function_exists('create_tags'));
	}

	public function testRemoveBrTagsStripsSelfClosingVariantsOnly(): void
	{
		// Today's regex /<br\W*?\/>/ matches <br/> and <br /> (a literal slash
		// before '>') but NOT a bare <br>. Pinned as current behaviour; the
		// bare-<br> gap is logged in plan/improvements.md.
		$this->assertSame('AB', remove_br_tags('A<br/>B'));
		$this->assertSame('AB', remove_br_tags('A<br />B'));
		$this->assertSame('A<br>B', remove_br_tags('A<br>B'));
		$this->assertSame(
			'Alpha<br>ProjectLineEnd',
			remove_br_tags('Alpha<br>Project<br/>Line<br />End')
		);
	}

	public function testCreateTagsReturnsListMarkupForPlainCommaListAndEchoesNothing(): void
	{
		$this->expectOutputString('');

		$html = create_tags('Editorial, Print');

		// str_replace strips spaces; the function returns rather than echoes.
		$this->assertSame('<li>Editorial</li><li>Print</li>', $html);
	}

	public function testCreateTagsReturnsEscapedMarkupForAmpersandTag(): void
	{
		// SEC-03: create_tags() returns <li> markup (article.php uses it as a
		// `<?= create_tags(...)` echo in a template) and renders an ampersand
		// tag intact and escaped, instead of DOMDocument truncating "R&D" at
		// the unescaped '&'.
		$returned = create_tags('R&D, Branding');

		$this->assertSame(
			'<li>R&amp;D</li><li>Branding</li>',
			$returned,
			'create_tags must return escaped <li> markup with the ampersand tag intact'
		);
	}

	public function testCreateTagsSkipsEmptyItems(): void
	{
		$this->assertSame('<li>a</li><li>b</li>', create_tags('a,,b'));
	}

	public function testCreateTagsTrimsWhitespace(): void
	{
		$this->assertSame(
			'<li>Editorial</li><li>Print</li>',
			create_tags(' Editorial , Print ')
		);
	}

	public function testLoadingHelpersPluginFileTwiceDoesNotFatal(): void
	{
		// The function_exists() guards stop "Cannot redeclare" fatals if the
		// file is required again; the plugin factory has its own separate
		// duplicate-name guard (Kirby\Exception\DuplicateException) rather
		// than a fatal, which is the only error a second require can still
		// produce here.
		try {
			require dirname(__DIR__, 3) . '/app/site/plugins/helpers/index.php';
		} catch (\Kirby\Exception\DuplicateException $e) {
			// Expected: Kirby::plugin() itself guards against re-registering
			// the same plugin name.
		}

		$this->assertTrue(function_exists('remove_br_tags'));
		$this->assertTrue(function_exists('create_tags'));
	}

	public function testArticleTagsFieldRendersOneListItemPerTag(): void
	{
		// Mirrors templates/article.php's tag-list echo of create_tags(
		// $page->tags() ) inside <ul class="tags">, against the fixture
		// page's real field data (footer.php needs pages this fixture site
		// doesn't have, so a full $page->render() is out of scope here).
		// Fixture Tags field is "R&D, Typography, Essay" -> three <li> tags,
		// with the ampersand escaped instead of truncating the value.
		$page  = $this->kirby->site()->find('writing/field-notes');
		$html  = '<ul class="tags">' . create_tags($page->tags()) . '</ul>';
		$xpath = $this->dom($html);

		$tags = $xpath->query("//ul[contains(@class,'tags')]/li");
		$this->assertSame(3, $tags->length, 'one <li> per comma-separated tag');
		$this->assertSame('R&D', $tags->item(0)->textContent);
	}
}
