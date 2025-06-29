<?php 
return [
    'markdown' => [
        'extra' => true
    ],
    'content' => [
        'extension' => 'md'
    ],
    'smartypants' => true,
    'languages' => true,
    'languages.detect' => true,
    'media' => [
        'read' => true,
        'url' => 'media'
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
    ],
    // Development configuration
    'debug' => true,
    'url' => 'http://localhost:8000', // Explicitly set Kirby's base URL to the PHP server
    'vite.server' => 'http://localhost:9001', // Vite dev server URL
    'cache' => [
        'pages' => [
            'active' => false // Disable page cache during debugging
        ]
    ]
];
