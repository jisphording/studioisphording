<?php

// Disabled custom media processing plugin to allow Kirby's native media processing to work
// The custom route was interfering with Kirby 4.8's built-in media handling system

Kirby::plugin('studio-isphording/media-processing', [
    'hooks' => [
        'file.create:after' => function ($file) {
            // Clear any existing jobs for this file to force regeneration
            $mediaRoot = kirby()->root('media');
            $jobsPath = $mediaRoot . '/pages/' . $file->parent()->diruri() . '/' . $file->mediaHash() . '/.jobs';
            if (is_dir($jobsPath)) {
                \Kirby\Filesystem\Dir::remove($jobsPath);
            }
        }
    ]
    // Removed custom routes to let Kirby handle media processing natively
]);
