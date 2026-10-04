# Manual diagnostics

These utilities previously lived in the root `test/` folder. The automated
test suites live in `tests/` and run through `npm test`, `npm run test:php`,
and `npm run test:deploy`.

Run PHP diagnostics from the repository root, for example:

```sh
php tools/diagnostics/check-site-methods.php
```

These are legacy, project-specific troubleshooting scripts, not automated
checks. They use the local Kirby installation and actual project content;
many create thumbnail jobs or generated files under `app/media/`. Project
slugs, filenames, media hashes, and API assumptions date from the migration
and may need updating before use. They are not part of deployment or test
discovery.

| Files | Purpose |
| --- | --- |
| `check-site-methods.php`, `test-site-methods-direct.php` | Inspect methods and plugin registration; the direct check also requests a thumbnail. |
| `test-gd.php` | Inspect GD support and try a project thumbnail. |
| `debug-thumbs.php`, `test-multiple-thumbs.php` | Inspect and generate thumbnails for the interior project. |
| `debug-screw-driver.php`, `generate-missing-thumbs.php` | Inspect responsive output and generate a specific screw-driver thumbnail. |
| `regenerate-all-thumbs.php` | Generate thumbnails from existing project thumbnail jobs. |
| `test-responsive-images.php` | Inspect responsive image HTML and thumbnail creation. |
| `test-media-routing.php`, `test-native-media.php`, `test-web-media.php` | Inspect native media routing, jobs, and generated files. |
| `test-moodboard.html` | Historical browser texture-loading demo; requires a module-serving development server and review of the current Experience API and canvas setup. |

The moodboard demo is retained as a troubleshooting reference; opening it
directly as a local file does not provide the Vite module environment.
