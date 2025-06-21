<?php
echo "Testing PHP GD Extension:\n";
echo "GD Extension loaded: " . (extension_loaded('gd') ? 'YES' : 'NO') . "\n";

if (extension_loaded('gd')) {
    $info = gd_info();
    echo "GD Version: " . $info['GD Version'] . "\n";
    echo "JPEG Support: " . ($info['JPEG Support'] ? 'YES' : 'NO') . "\n";
    echo "PNG Support: " . ($info['PNG Support'] ? 'YES' : 'NO') . "\n";
    echo "WebP Support: " . ($info['WebP Support'] ? 'YES' : 'NO') . "\n";
    
    // Test creating a simple image
    $image = imagecreatetruecolor(100, 100);
    if ($image) {
        echo "Image creation: SUCCESS\n";
        imagedestroy($image);
    } else {
        echo "Image creation: FAILED\n";
    }
} else {
    echo "GD extension is not loaded!\n";
}

echo "\nTesting Kirby setup:\n";
require_once 'app/kirby/bootstrap.php';
$kirby = new Kirby();
echo "Kirby loaded: " . (class_exists('Kirby') ? 'SUCCESS' : 'FAILED') . "\n";

// Check thumbs configuration
$thumbsConfig = $kirby->option('thumbs');
echo "Thumbs driver: " . ($thumbsConfig['driver'] ?? 'not set') . "\n";
echo "Thumbs quality: " . ($thumbsConfig['quality'] ?? 'not set') . "\n";

// Test if we can find the problematic file
$page = $kirby->page('projects/isphording-inneneinrichtung');
if ($page) {
    echo "Page found: YES\n";
    $files = $page->files();
    echo "Files count: " . $files->count() . "\n";
    
    foreach ($files as $file) {
        if (strpos($file->filename(), 'isphinnen_00_keyvisual') !== false) {
            echo "Target file found: " . $file->filename() . "\n";
            echo "File exists: " . (file_exists($file->root()) ? 'YES' : 'NO') . "\n";
            echo "File readable: " . (is_readable($file->root()) ? 'YES' : 'NO') . "\n";
            echo "Media hash: " . $file->mediaHash() . "\n";
            
            // Try to create a thumbnail
            try {
                $thumb = $file->crop(690, 590, 75);
                if ($thumb) {
                    echo "Thumbnail creation: SUCCESS\n";
                    echo "Thumbnail path: " . $thumb->root() . "\n";
                    echo "Thumbnail exists: " . (file_exists($thumb->root()) ? 'YES' : 'NO') . "\n";
                } else {
                    echo "Thumbnail creation: FAILED (returned null)\n";
                }
            } catch (Exception $e) {
                echo "Thumbnail creation: ERROR - " . $e->getMessage() . "\n";
            }
            break;
        }
    }
} else {
    echo "Page not found\n";
}
?>
