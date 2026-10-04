<?php

use PHPUnit\Framework\TestCase;

/**
 * Static regression guard for output escaping (SEC-02): every `<?= … ?>` in
 * app/site/templates and app/site/snippets that echoes a content value must
 * end in an escaping or known-safe call, or carry a `// raw: <reason>`
 * comment inside the echo tag, e.g.
 *
 *   <?= $page->embed() // raw: author-controlled iframe markup ?>
 *
 * How an echo is judged (PHP tokenizer, so comments and strings are ignored):
 *   - the echo is split into top-level "chains": a $variable or a function
 *     call, followed by any number of ->method(...) calls;
 *   - a chain is safe when its last method is in SAFE_METHODS, or it is a
 *     call to a function in SAFE_FUNCTIONS with no method chained after it;
 *   - a chain used only as a condition or comparison (followed by ?, ==, !=,
 *     ===, !==, or preceded by a comparison) is not echoed and is skipped;
 *   - everything else — `<?= $page->title() ?>`, `<?= $tag ?>` — fails,
 *     listing file:line.
 */
final class OutputEscapingGuardTest extends TestCase
{
	/** Terminal methods whose result is escaped, markup-rendered or URL/slug-safe. */
	private const SAFE_METHODS = [
		'escape', 'esc', 'html', 'kirbytext', 'kirbytextinline', 'kt', 'kti',
		'titleHtml', 'titleText', 'url', 'mime', 'slug', 'getResponsiveImage',
	];

	/** Functions whose return value is already escaped or not content. */
	private const SAFE_FUNCTIONS = [
		'esc', 'attr', 'url', 'vite', 'js', 'css', 't', 'create_tags', 'remove_br_tags',
	];

	/** Functions transparent to escaping: their first argument is judged instead. */
	private const TRANSPARENT_FUNCTIONS = ['remove_br_tags'];

	/**
	 * Return "line: code" for every unsafe echo in $source.
	 */
	public static function violations(string $source): array
	{
		$tokens = token_get_all($source);
		$found  = [];
		$count  = count($tokens);

		for ($i = 0; $i < $count; $i++) {
			if (!is_array($tokens[$i]) || $tokens[$i][0] !== T_OPEN_TAG_WITH_ECHO) {
				continue;
			}

			$line = $tokens[$i][2];
			$body = [];
			$raw  = false;
			for ($i++; $i < $count; $i++) {
				$t = $tokens[$i];
				if (is_array($t) && $t[0] === T_CLOSE_TAG) {
					break;
				}
				if (is_array($t) && in_array($t[0], [T_COMMENT, T_DOC_COMMENT], true)) {
					$raw = $raw || (bool)preg_match('~^(//|#|/\*)\s*raw:\s*\S~', $t[1]);
					continue;
				}
				if (is_array($t) && $t[0] === T_WHITESPACE) {
					continue;
				}
				$body[] = $t;
			}

			if (!$raw && !self::expressionIsSafe($body)) {
				$code    = implode('', array_map(fn ($t) => is_array($t) ? $t[1] : $t, $body));
				$found[] = $line . ': <?= ' . $code . ' ?>';
			}
		}

		return $found;
	}

	/**
	 * Judge a token list (whitespace and comments already removed).
	 */
	private static function expressionIsSafe(array $tokens): bool
	{
		$n = count($tokens);
		$comparison = ['?', T_IS_EQUAL, T_IS_NOT_EQUAL, T_IS_IDENTICAL, T_IS_NOT_IDENTICAL];

		for ($i = 0; $i < $n; $i++) {
			$t    = $tokens[$i];
			$type = is_array($t) ? $t[0] : $t;

			$isVariable = $type === T_VARIABLE;
			$isCall     = $type === T_STRING && ($tokens[$i + 1] ?? null) === '(';
			if (!$isVariable && !$isCall) {
				continue;
			}

			$start    = $i;
			$function = $isCall ? $t[1] : null;
			$args     = [];
			if ($isCall) {
				[$args, $i] = self::parenthesised($tokens, $i + 1);
			}

			$lastMethod = null;
			while (is_array($tokens[$i + 1] ?? null) && in_array($tokens[$i + 1][0], [T_OBJECT_OPERATOR, T_NULLSAFE_OBJECT_OPERATOR], true)) {
				$lastMethod = $tokens[$i + 2][1] ?? null;
				$i += 2;
				if (($tokens[$i + 1] ?? null) === '(') {
					[, $i] = self::parenthesised($tokens, $i + 1);
				}
			}

			$next = $tokens[$i + 1] ?? null;
			$prev = $tokens[$start - 1] ?? null;
			if (in_array(is_array($next) ? $next[0] : $next, $comparison, true)
				|| in_array(is_array($prev) ? $prev[0] : $prev, $comparison, true) && $prev !== '?') {
				continue;
			}

			if ($lastMethod !== null) {
				if (!in_array($lastMethod, self::SAFE_METHODS, true)) {
					return false;
				}
				continue;
			}

			if ($function !== null && in_array($function, self::TRANSPARENT_FUNCTIONS, true)) {
				if (!self::expressionIsSafe($args)) {
					return false;
				}
				continue;
			}

			if ($function === null || !in_array($function, self::SAFE_FUNCTIONS, true)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Given $open at a '(' token, return [inner tokens, index of matching ')'].
	 */
	private static function parenthesised(array $tokens, int $open): array
	{
		$depth = 0;
		$inner = [];
		for ($i = $open; $i < count($tokens); $i++) {
			$t = $tokens[$i];
			if ($t === '(') {
				$depth++;
				if ($depth === 1) {
					continue;
				}
			} elseif ($t === ')') {
				$depth--;
				if ($depth === 0) {
					return [$inner, $i];
				}
			}
			$inner[] = $t;
		}

		return [$inner, $i];
	}

	public function testTemplatesAndSnippetsEscapeEveryEchoedField(): void
	{
		$root  = dirname(__DIR__, 2) . '/app/site';
		$found = [];

		foreach (['templates', 'snippets'] as $dir) {
			foreach (glob("{$root}/{$dir}/*.php") as $file) {
				foreach (self::violations(file_get_contents($file)) as $violation) {
					$found[] = "{$dir}/" . basename($file) . ':' . $violation;
				}
			}
		}

		$this->assertSame(
			[],
			$found,
			"Unescaped echoes — escape them (->escape(), esc(), ->titleHtml(), …) or add `// raw: <reason>` inside the tag:\n" . implode("\n", $found)
		);
	}

	public function testFlagsRawFieldAndVariableEchoes(): void
	{
		$this->assertSame(['1: <?= $page->title() ?>'], self::violations('<?= $page->title() ?>'));
		$this->assertSame(['1: <?= $tag ?>'], self::violations('<?= $tag ?>'));
		$this->assertSame(['1: <?= page(\'x\')->year() ?>'], self::violations("<?= page('x')->year() ?>"));
		$this->assertSame(['1: <?= remove_br_tags($page->text()) ?>'], self::violations('<?= remove_br_tags($page->text()) ?>'));
		$this->assertSame(['2: <?= $a->url()?$a->title():\'\' ?>'], self::violations("<p>\n<?= \$a->url() ? \$a->title() : '' ?>"));
	}

	public function testAcceptsEscapedSafeAndJustifiedEchoes(): void
	{
		$safe = implode("\n", [
			'<?= $page->title()->escape() ?>',
			'<?= $page->title()->esc() ?>',
			'<?= $page->title()->titleHtml() ?>',
			'<?= esc($tag) ?>',
			'<?= $page->text()->kirbytext() ?>',
			'<?= remove_br_tags($page->text()->kirbytext()) ?>',
			'<?= $site->getResponsiveImage($img, $page->title(), "x") ?>',
			'<?= attr([\'data-even\' => $page->children()->isEven()], \' \') ?>',
			'<?= $page->slug() == \'a\' ? \'World_01\' : \'World_02\' ?>',
			'<?= $poster ? \' poster="\' . $poster->url() . \'"\' : \'\' ?>',
			'<?= $page->embed() // raw: author-controlled iframe markup ?>',
		]);

		$this->assertSame([], self::violations($safe));
		$this->assertNotSame([], self::violations('<?= $page->embed() // raw: ?>'), 'a raw: comment needs a reason');
	}
}
