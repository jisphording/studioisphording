<?php 
return [
    'debug' => true,
    'markdown' => [
        'extra' => true
    ],
    'content' => [
        'extension' => 'md'
    ],
    'smartypants' => true,
    'languages' => true,
    'languages.detect' => true,
    'url' => false, // Let Kirby auto-detect the URL
    'media' => [
        'read' => true,
        'url' => 'media'
    ],
    'cache' => [
        'pages' => [
            'active' => false // Disable page cache during debugging
        ]
    ],
    'thumbs' => [
        'driver' => 'gd',
        'quality' => 90
    ],
    // Custom configuration for image processing
    'custom' => [
        'images' => [
            'use_crop' => false // Set to true for cropped images, false for resized images
        ]
    ]
];
