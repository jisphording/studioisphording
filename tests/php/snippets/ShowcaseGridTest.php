<?php

require_once dirname(__DIR__) . '/KirbyTestCase.php';

/**
 * Tests for the showcase-grid snippet (app/site/snippets/showcase-grid.php),
 * which phase 5 extracted verbatim from the old displayShowcase site method.
 * The item/order/title/image assertions are the SiteMethodsTest originals,
 * unchanged; only the invocation moved from captureOutput() of the site
 * method to snippetHtml('showcase-grid', ...).
 */
final class ShowcaseGridTest extends KirbyTestCase
{
	public function testShowcaseGridRendersLinkedItemsInPageOrder(): void
	{
		$html  = $this->snippetHtml('showcase-grid', ['parent' => 'projects', 'limit' => 2]);
		$xpath = $this->dom($html);

		$items = $xpath->query("//li[contains(@class,'showcase__grid--item')]");
		$this->assertSame(2, $items->length, 'at most `limit` items');

		$links = $xpath->query("//li[contains(@class,'showcase__grid--item')]//a/@href");
		$this->assertStringContainsString('projects/01-alpha', $links->item(0)->value, 'first item, in page order');
		$this->assertStringContainsString('projects/02-beta', $links->item(1)->value, 'second item, in page order');

		$titles = $xpath->query("//h1[contains(@class,'showcase--title')]");
		$this->assertSame(2, $titles->length, 'one title per item');
		$this->assertSame('Alpha "Quotes" & Ampersand', $titles->item(0)->textContent);

		$this->assertSame(
			2,
			$xpath->query("//figure[contains(@class,'showcase__grid--image')]//img")->length,
			'one keyvisual image per item'
		);
	}

	public function testShowcaseGridOnlyFirstImageIsEagerAndHighPriority(): void
	{
		// RES-01: the perf snapshot names the first grid image as the LCP
		// element on both /de and /de/projects, so only it should skip
		// native lazy-loading; the rest must stay lazy.
		$html  = $this->snippetHtml('showcase-grid', ['parent' => 'projects', 'limit' => 3]);
		$xpath = $this->dom($html);

		$images = $xpath->query("//figure[contains(@class,'showcase__grid--image')]//img");
		$this->assertSame(3, $images->length);

		$first = $images->item(0);
		$this->assertSame('eager', $first->getAttribute('loading'));
		$this->assertSame('high', $first->getAttribute('fetchpriority'));

		for ($i = 1; $i < $images->length; $i++) {
			$rest = $images->item($i);
			$this->assertSame('lazy', $rest->getAttribute('loading'), "image $i stays lazy");
			$this->assertFalse($rest->hasAttribute('fetchpriority'), "image $i carries no fetchpriority");
		}
	}

	public function testShowcaseGridDefaultLimitRendersAllChildrenWhenFewerThanEight(): void
	{
		// No limit passed -> default of 8. The fixture has three projects, so
		// all three render (and the default must not fatal on an undefined
		// snippet variable).
		$html  = $this->snippetHtml('showcase-grid', ['parent' => 'projects']);
		$xpath = $this->dom($html);

		$this->assertSame(3, $xpath->query("//li[contains(@class,'showcase__grid--item')]")->length);
	}

	public function testShowcaseGridLimitLargerThanChildrenRendersAll(): void
	{
		$html  = $this->snippetHtml('showcase-grid', ['parent' => 'projects', 'limit' => 99]);
		$xpath = $this->dom($html);

		$this->assertSame(3, $xpath->query("//li[contains(@class,'showcase__grid--item')]")->length);
	}

	public function testShowcaseGridWithMissingParentRendersNothing(): void
	{
		// A parent id that does not resolve must render nothing, not fatal on
		// ->children() of null (the latent bug in the old displayShowcase).
		$thrown = null;
		$html   = '';
		try {
			$html = $this->snippetHtml('showcase-grid', ['parent' => 'does-not-exist', 'limit' => 8]);
		} catch (\Throwable $e) {
			$thrown = $e;
		}

		$this->assertNull($thrown, 'showcase-grid must not fatal on a missing parent');
		$this->assertSame('', trim(strip_tags($html)), 'renders nothing for a missing parent');
	}
}
