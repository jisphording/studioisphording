<?php

require_once __DIR__ . '/KirbyTestCase.php';

/**
 * Titles carry <mark>/<br> markup (see titleHtml). In attribute and <title>
 * contexts that markup must not leak as literal text: the titleText field
 * method strips it to plain words. Visible headings keep titleHtml.
 * Fixture: tests/php/fixtures/content/plaintext.
 */
final class PlainTextTitlesTest extends KirbyTestCase
{
	private const PLAIN = 'Marked Words Here & "There"';

	private function assertPlain(string $html, string $where): void
	{
		$this->assertStringNotContainsString('&lt;mark', $html, "{$where}: no escaped <mark>");
		$this->assertStringNotContainsString('&lt;br', $html, "{$where}: no escaped <br>");
	}

	public function testTitleTextStripsMarkupCollapsesWhitespaceAndEscapesPerContext(): void
	{
		$field = new \Kirby\Content\Field(null, 'title', "A <mark>b</mark><br>c<br />\n  d <em>e</em>&\"'");

		$this->assertSame('A b c d e&amp;&quot;&#039;', (string)$field->titleText());
		$this->assertSame("A b c d e&\"'", html_entity_decode((string)$field->titleText('attr'), ENT_QUOTES));
		$this->assertSame("A b c d e&\"'", (string)$field->titleText('raw'));
	}

	public function testHeaderTitleIsPlainText(): void
	{
		$page = $this->kirby->site()->find('plaintext');
		$this->kirby->site()->visit($page);
		$xpath = $this->dom($page->render());

		$title = $xpath->query('//title')->item(0);
		$this->assertStringEndsWith('| Plain Words Page', $title->textContent);
		$this->assertPlain($page->render(), 'page');
	}

	public function testSectionHeadlineDataValueIsPlainText(): void
	{
		$page = $this->kirby->site()->find('plaintext');
		$xpath = $this->dom($this->snippetHtml('section-headline', ['page' => $page]));

		$this->assertSame('Plain Words Page', $xpath->query('//h1/@data-value')->item(0)->value);
	}

	public function testImageAltsAreOnePlainText(): void
	{
		$cases = [
			'showcase-grid' => ['parent' => 'plaintext'],
			'related-grid'  => ['parent' => 'plaintext'],
		];

		foreach ($cases as $name => $data) {
			$xpath = $this->dom($this->snippetHtml($name, $data));
			$img   = $xpath->query('//img')->item(0);
			$this->assertNotNull($img, "{$name} renders an image");
			$this->assertStringContainsString(self::PLAIN, $img->getAttribute('alt'), $name);
			$this->assertStringNotContainsString('<', $img->getAttribute('alt'), $name);
		}
	}

	public function testIntroImgAltIsPlainText(): void
	{
		$intro = $this->kirby->site()->find('plaintext');
		$xpath = $this->dom($this->snippetHtml('intro-img', ['page' => $intro]));
		$img   = $xpath->query('//img')->item(0);

		$this->assertNotNull($img);
		$this->assertSame('Project: Plain Words Page', $img->getAttribute('alt'));
	}

	public function testProjectsListAltIsPlainTextAndCaptionKeepsMark(): void
	{
		$xpath = $this->dom($this->kirby->site()->find('plaintext-list')->render());

		$img = $xpath->query('//ul[@class="projects"]//img')->item(0);
		$this->assertNotNull($img);
		$this->assertSame(self::PLAIN, $img->getAttribute('alt'));
		$this->assertSame(1, $xpath->query('//ul[@class="projects"]//figcaption/mark')->length);
	}
}
