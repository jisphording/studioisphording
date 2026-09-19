<?php

require_once __DIR__ . '/KirbyTestCase.php';

/**
 * Static regression guard: every snippet('name') call in app/site must resolve
 * to a real snippet — either app/site/snippets/<name>.php or a snippet
 * registered by a plugin in the booted app. Catches dangling references left
 * behind by refactors (a renamed or deleted snippet) before they reach a page.
 *
 * References are found with PHP's tokenizer, not a raw regex, so commented-out
 * or inline-HTML "calls" inside an HTML comment are ignored — only real
 * snippet(...) calls count.
 */
final class SnippetReferencesTest extends KirbyTestCase
{
	/**
	 * Collect [file, name] for every literal snippet('name') call under $dir.
	 * Only a T_STRING 'snippet' immediately followed by '(' and a single-quoted
	 * or double-quoted literal counts; dynamic snippet($var) calls are skipped
	 * (they cannot be resolved statically).
	 */
	private function snippetCalls(string $dir): array
	{
		$calls = [];

		$files = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
		);

		foreach ($files as $file) {
			if ($file->getExtension() !== 'php') {
				continue;
			}

			$tokens = token_get_all(file_get_contents($file->getPathname()));
			$count  = count($tokens);

			for ($i = 0; $i < $count; $i++) {
				$token = $tokens[$i];

				if (is_array($token) === false || $token[0] !== T_STRING || $token[1] !== 'snippet') {
					continue;
				}

				// Next non-whitespace token must be '('
				$j = $i + 1;
				while ($j < $count && is_array($tokens[$j]) && $tokens[$j][0] === T_WHITESPACE) {
					$j++;
				}
				if ($j >= $count || $tokens[$j] !== '(') {
					continue;
				}

				// Then a string literal argument
				$k = $j + 1;
				while ($k < $count && is_array($tokens[$k]) && $tokens[$k][0] === T_WHITESPACE) {
					$k++;
				}
				if ($k < $count && is_array($tokens[$k]) && $tokens[$k][0] === T_CONSTANT_ENCAPSED_STRING) {
					$calls[] = [
						'file' => $file->getPathname(),
						'name' => trim($tokens[$k][1], '"\''),
					];
				}
			}
		}

		return $calls;
	}

	/** A snippet name resolves if a file backs it or a plugin registers it. */
	private function resolves(string $name): bool
	{
		$file = $this->kirby->root('snippets') . '/' . $name . '.php';
		if (is_file($file) === true) {
			return true;
		}

		return array_key_exists($name, $this->kirby->extensions('snippets'));
	}

	/** Report unresolved [file:name] references for a set of calls. */
	private function unresolved(array $calls): array
	{
		$missing = [];
		foreach ($calls as $call) {
			if ($this->resolves($call['name']) === false) {
				$missing[] = $call['name'] . ' (' . $call['file'] . ')';
			}
		}
		return $missing;
	}

	public function testEverySnippetReferenceInTemplatesAndSnippetsResolves(): void
	{
		$site  = dirname(__DIR__, 2) . '/app/site';
		$calls = array_merge(
			$this->snippetCalls($site . '/templates'),
			$this->snippetCalls($site . '/snippets')
		);

		$this->assertNotEmpty($calls, 'the scanner must find snippet() calls to guard');
		$this->assertSame(
			[],
			$this->unresolved($calls),
			'every snippet() call in templates/snippets must resolve'
		);
	}

	public function testEverySnippetReferenceInPluginsResolves(): void
	{
		$calls = $this->snippetCalls(dirname(__DIR__, 2) . '/app/site/plugins');

		$this->assertSame(
			[],
			$this->unresolved($calls),
			'no plugin may reference a snippet that does not exist'
		);
	}
}
