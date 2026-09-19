<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Tests for the related-grid snippet (app/site/snippets/related-grid.php),
 * which phase 5 extracted verbatim from the old pullRelatedPages site method.
 * The item/order/title/tag assertions are the SiteMethodsTest originals,
 * unchanged; only the invocation moved from captureOutput() of the site
 * method to snippetHtml('related-grid', ...).
 */
final class RelatedGridTest extends KirbyTestCase
{
	public function testRelatedGridRendersItemsWithOneListItemPerTag(): void
	{
		$html  = $this->snippetHtml('related-grid', ['parent' => 'projects', 'limit' => 2]);
		$xpath = $this->dom($html);

		$items = $xpath->query("//li[contains(@class,'related__showcase--item')]");
		$this->assertSame(2, $items->length, 'at most `limit` items');

		$links = $xpath->query("//li[contains(@class,'related__showcase--item')]//a/@href");
		$this->assertStringContainsString('projects/01-alpha', $links->item(0)->value);
		$this->assertStringContainsString('projects/02-beta', $links->item(1)->value);

		$titles = $xpath->query("//h1[contains(@class,'related__showcase--title')]");
		$this->assertSame('Alpha "Quotes" & Ampersand', $titles->item(0)->textContent);

		// Alpha's Tags field is "R&D, Branding, Website" -> three <li> tags.
		$firstItemTags = $xpath->query("(//li[contains(@class,'related__showcase--item')])[1]//div[contains(@class,'related__showcase--tags')]//li");
		$this->assertSame(3, $firstItemTags->length, 'one <li> per comma-separated tag');
	}

	public function testRelatedGridDefaultLimitRendersAllChildrenWhenFewerThanEight(): void
	{
		// No limit passed -> default of 8. The fixture has three projects, so
		// all three render (and the default must not fatal on an undefined
		// snippet variable).
		$html  = $this->snippetHtml('related-grid', ['parent' => 'projects']);
		$xpath = $this->dom($html);

		$this->assertSame(3, $xpath->query("//li[contains(@class,'related__showcase--item')]")->length);
	}

	public function testRelatedGridLimitLargerThanChildrenRendersAll(): void
	{
		$html  = $this->snippetHtml('related-grid', ['parent' => 'projects', 'limit' => 99]);
		$xpath = $this->dom($html);

		$this->assertSame(3, $xpath->query("//li[contains(@class,'related__showcase--item')]")->length);
	}

	public function testRelatedGridWithMissingParentRendersNothing(): void
	{
		// A parent id that does not resolve must render nothing, not fatal on
		// ->children() of null (the latent bug in the old pullRelatedPages).
		$thrown = null;
		$html   = '';
		try {
			$html = $this->snippetHtml('related-grid', ['parent' => 'does-not-exist', 'limit' => 8]);
		} catch (\Throwable $e) {
			$thrown = $e;
		}

		$this->assertNull($thrown, 'related-grid must not fatal on a missing parent');
		$this->assertSame('', trim(strip_tags($html)), 'renders nothing for a missing parent');
	}
}
