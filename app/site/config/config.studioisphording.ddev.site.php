<?php
// DDEV host (https://studioisphording.ddev.site) — same dev overrides as
// localhost, except Vite is served over TLS (`npm run dev:https`) so Safari
// does not block its scripts as mixed content. Excluded from deploy.sh —
// never reaches production.
return array_merge(require __DIR__ . '/config.localhost.php', [
    'vite.server' => 'https://localhost:9001',
]);
