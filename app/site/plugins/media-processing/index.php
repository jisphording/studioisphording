<?php

// Clears a file's thumb job directory on file.create:after so thumbs regenerate.

Kirby::plugin('studio-isphording/media-processing', [
    'hooks' => [
        'file.create:after' => function ($file) {
            // Clear any existing jobs for this file to force regeneration.
            // mediaDir() resolves correctly for page, site and user parents
            // alike, unlike hand-building 'media/pages/' . diruri().
            $jobsPath = $file->mediaDir() . '/.jobs';
            if (is_dir($jobsPath)) {
                \Kirby\Filesystem\Dir::remove($jobsPath);
            }
        }
    ]
]);
