<?php

require_once __DIR__ . '/KirbyTestCase.php';

/**
 * Output-escaping tests (SEC-02): every content field that templates and
 * snippets echo in text context must reach the DOM as literal text, never as
 * live markup. The hostile values live in tests/php/fixtures/content (home,
 * about and escaping/1_hostile) and combine a <script> element, a bare '&'
 * and a '"'.
 *
 * Title and titlelong are the exception the live-content audit found: project
 * titles carry <mark> highlights (and titlelong may carry <br>), so they go
 * through the titleHtml field method, which escapes everything and then
 * restores only <mark>…</mark> and <br>. Those allowed elements are asserted
 * explicitly below.
 */
final class EscapingTest extends KirbyTestCase
{
	private const HOSTILE = '<script>alert(1)</script> & "Q"';

	private function renderPage(string $id): DOMXPath
	{
		$page = $this->kirby->site()->find($id);
		$this->kirby->site()->visit($page);

		return $this->dom($page->render());
	}

	private function hostile(): \Kirby\Cms\Page
	{
		return $this->kirby->site()->find('escaping/hostile');
	}

	private function assertLiteral(DOMXPath $xpath, string $query, string $expected): void
	{
		$nodes = $xpath->query($query);
		$this->assertGreaterThan(0, $nodes->length, "no node for {$query}");

		foreach ($nodes as $node) {
			$this->assertSame(0, $xpath->query('.//script', $node)->length, "{$query} must not contain a <script> element");
			$this->assertSame($expected, $node->textContent, "{$query} shows the literal text");
		}
	}

	public function testHomeHeroEscapesToplineTitleAndSubline(): void
	{
		$xpath = $this->renderPage('home');

		$this->assertLiteral($xpath, "//div[@class='showreel__title']/h3", 'Top ' . self::HOSTILE);
		$this->assertLiteral($xpath, "//div[@class='showreel__title']/h1", 'Home ' . self::HOSTILE);
		$this->assertLiteral($xpath, "//div[@class='showreel__title']/h2", 'Sub ' . self::HOSTILE);
	}

	public function testProjectsListEscapesTitleAndYearButKeepsMark(): void
	{
		$xpath = $this->renderPage('escaping');

		$this->assertLiteral($xpath, '//ul[@class="projects"]//figcaption/small', '2024 ' . self::HOSTILE);

		$caption = "//ul[@class='projects']//figcaption";
		$this->assertSame(1, $xpath->query($caption . '/mark')->length, 'the <mark> highlight stays an element');
		$this->assertSame(0, $xpath->query($caption . '//script')->length);
		$this->assertStringStartsWith('Hostile Mark ' . self::HOSTILE, $xpath->query($caption)->item(0)->textContent);
	}

	public function testShowcaseGridTitleIsEscapedButKeepsMark(): void
	{
		$xpath = $this->dom($this->snippetHtml('showcase-grid', ['parent' => 'escaping']));

		$this->assertLiteral($xpath, "//h1[@class='showcase--title']", 'Hostile Mark ' . self::HOSTILE);
		$this->assertSame('Mark', $xpath->query("//h1[@class='showcase--title']/mark")->item(0)?->textContent);
	}

	public function testRelatedGridTitleAndTagsAreEscaped(): void
	{
		$xpath = $this->dom($this->snippetHtml('related-grid', ['parent' => 'escaping']));

		$this->assertLiteral($xpath, "//h1[@class='related__showcase--title']", 'Hostile Mark ' . self::HOSTILE);
		$this->assertSame('Mark', $xpath->query("//h1[@class='related__showcase--title']/mark")->item(0)?->textContent);

		$tags = $xpath->query("//div[@class='related__showcase--tags']//li");
		$this->assertSame(['<script>alert(1)</script>', ' R&D', ' "Quoted"'], array_map(fn ($li) => $li->textContent, iterator_to_array($tags)));
		$this->assertSame(0, $xpath->query("//div[@class='related__showcase--tags']//script")->length);
	}

	public function testTagListEscapesEachTag(): void
	{
		$html  = $this->snippetHtml('tag-list', ['tags' => $this->hostile()->tags()]);
		$xpath = $this->dom($html);

		$this->assertSame(0, $xpath->query('//script')->length);
		$this->assertSame(
			['<script>alert(1)</script>', ' R&D', ' "Quoted"'],
			array_map(fn ($li) => $li->textContent, iterator_to_array($xpath->query('//li')))
		);
		$this->assertStringContainsString('<li> R&amp;D</li>', $html, 'the ampersand is entity-escaped in the source');
	}

	/**
	 * titlelong keeps its <br> line breaks as elements (the only markup it
	 * is allowed) and escapes everything else, in all three intro snippets.
	 */
	public function testIntroSnippetsEscapeTitlelongButKeepBr(): void
	{
		foreach (['intro-img', 'intro-video', 'canvas'] as $snippet) {
			$html  = $this->snippetHtml($snippet, ['page' => $this->hostile(), 'site' => $this->kirby->site()]);
			$xpath = $this->dom($html);

			$this->assertLiteral($xpath, "//div[@class='showreel__title']/h1", 'HostileLong' . self::HOSTILE);
			$this->assertSame(2, $xpath->query("//div[@class='showreel__title']/h1/br")->length, "{$snippet}: <br> stays an element");
		}
	}

	public function testAboutEscapesMoodCaptionAndTitlelong(): void
	{
		$xpath = $this->renderPage('about');

		$this->assertLiteral($xpath, "//p[@class='bildunterschrift']", 'Mood ' . self::HOSTILE);
		$this->assertLiteral($xpath, "//div[@class='showreel__title']/h1", 'AboutLong ' . self::HOSTILE);
		$this->assertSame(1, $xpath->query("//div[@class='showreel__title']/h1/br")->length);
	}

	public function testTitleHtmlAllowsOnlyMarkAndBr(): void
	{
		$field = new \Kirby\Content\Field(null, 'title', 'A<mark>b</mark><br><br/><br /><em>x</em><mark class="y">z</mark>&"\'');

		$this->assertSame(
			'A<mark>b</mark><br><br/><br />&lt;em&gt;x&lt;/em&gt;&lt;mark class=&quot;y&quot;&gt;z</mark>&amp;&quot;&#039;',
			(string)$field->titleHtml()
		);
	}
}
