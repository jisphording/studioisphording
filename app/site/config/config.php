<?php
// Production defaults. Dev-host overrides live in the per-host config
// files under this directory (loaded by Kirby's config.<host>.php
// resolution and excluded from deploy.sh) — never add debug/url/vite.server here.
return [
    'debug' => false,
    'markdown' => [
        'extra' => true
    ],
    'content' => [
        'extension' => 'md'
    ],
    'smartypants' => true,
    'languages' => true,
    'languages.detect' => true,
    'thumbs' => [
        'driver' => 'gd',
        'quality' => 90
    ],
    // Custom configuration for image processing
    'custom' => [
        'images' => [
            'use_crop' => false // Set to true for cropped images, false for resized images
        ]
    ],
    'cache' => [
        // Left off: 'languages.detect' => true redirects based on the
        // request's Accept-Language/cookie, and page caching would risk
        // serving one visitor's cached redirect/language to another.
        'pages' => [
            'active' => false
        ]
    ]
];
