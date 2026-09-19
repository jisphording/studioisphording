<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Tests for the tag-list snippet (app/site/snippets/tag-list.php), the tag
 * loop phase 5 lifted out of the related grid. It pins today's behaviour:
 * explode on ',' with no trimming. Escaping is covered by EscapingTest.
 */
final class TagListTest extends KirbyTestCase
{
	public function testOneListItemPerCommaSeparatedTagWithoutTrimming(): void
	{
		$html = $this->snippetHtml('tag-list', ['tags' => 'Editorial, Print,Web']);

		preg_match_all('/<li>(.*?)<\/li>/', $html, $m);
		$this->assertSame(['Editorial', ' Print', 'Web'], $m[1]);
	}

	public function testAcceptsAPageTagsField(): void
	{
		$field = $this->kirby->site()->find('projects/02-beta')->tags();
		$html  = $this->snippetHtml('tag-list', ['tags' => $field]);

		preg_match_all('/<li>(.*?)<\/li>/', $html, $m);
		$this->assertSame(['Editorial', ' Print'], $m[1]);
	}

	public function testEmptyFieldRendersNothing(): void
	{
		$this->assertSame('', $this->snippetHtml('tag-list', ['tags' => '']));
		$this->assertSame('', $this->snippetHtml('tag-list', ['tags' => $this->kirby->site()->find('projects')->tags()]));
	}
}
