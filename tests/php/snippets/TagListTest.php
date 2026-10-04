<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Tests for the tag-list snippet (app/site/snippets/tag-list.php), the tag
 * loop phase 5 lifted out of the related grid. Since phase 9 it renders from
 * the shared tag_items() helper (trim, keep inner spaces, skip empties), the
 * same as create_tags(). Escaping is covered by EscapingTest.
 */
final class TagListTest extends KirbyTestCase
{
	public function testOneListItemPerCommaSeparatedTagTrimmed(): void
	{
		$html = $this->snippetHtml('tag-list', ['tags' => 'Editorial, Print,Web']);

		preg_match_all('/<li>(.*?)<\/li>/', $html, $m);
		$this->assertSame(['Editorial', 'Print', 'Web'], $m[1]);
	}

	public function testAcceptsAPageTagsField(): void
	{
		$field = $this->kirby->site()->find('projects/02-beta')->tags();
		$html  = $this->snippetHtml('tag-list', ['tags' => $field]);

		preg_match_all('/<li>(.*?)<\/li>/', $html, $m);
		$this->assertSame(['Editorial', 'Print'], $m[1]);
	}

	public function testRendersTheSameMarkupAsCreateTags(): void
	{
		// Phase 9: one tag rendering. Inner spaces survive, empties are dropped.
		$html = $this->snippetHtml('tag-list', ['tags' => 'R&D, Brand Design,']);

		$this->assertSame('<li>R&amp;D</li><li>Brand Design</li>', preg_replace('/\s+(?=<)|(?<=>)\s+/', '', $html));
		$this->assertSame('<li>R&amp;D</li><li>Brand Design</li>', create_tags('R&D, Brand Design,'));
	}

	public function testEmptyFieldRendersNothing(): void
	{
		$this->assertSame('', $this->snippetHtml('tag-list', ['tags' => '']));
		$this->assertSame('', $this->snippetHtml('tag-list', ['tags' => $this->kirby->site()->find('projects')->tags()]));
	}
}
