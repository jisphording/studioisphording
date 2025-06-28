<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();

echo "=== TESTING SITE METHODS DIRECTLY ===\n";

// Try to manually call the site methods
try {
    // Get a test image
    $page = $kirby->page('projects/02-screw-driver');
    if ($page) {
        $image = $page->images()->first();
        if ($image) {
            echo "Test image: " . $image->filename() . "\n";
            
            // Try to call getThumbnail directly
            echo "Calling getThumbnail directly...\n";
            $thumb = $kirby->site()->getThumbnail($image, 800, 640, 85);
            echo "Result: " . ($thumb ? 'SUCCESS' : 'FAILED') . "\n";
            
            if ($thumb) {
                echo "Thumbnail URL: " . $thumb->url() . "\n";
            }
            
        } else {
            echo "No images found\n";
        }
    } else {
        echo "Page not found\n";
    }
} catch (Error $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "This confirms the method doesn't exist\n";
} catch (Exception $e) {
    echo "EXCEPTION: " . $e->getMessage() . "\n";
}

// Check if we can manually include the plugin
echo "\n=== MANUALLY TESTING PLUGIN REGISTRATION ===\n";
try {
    // Re-include the plugin file to see if there are any errors
    include 'app/site/plugins/site-methods/index.php';
    echo "Plugin file included successfully\n";
    
    // Check again after manual include
    echo "getThumbnail exists after manual include: " . (method_exists($kirby->site(), 'getThumbnail') ? 'YES' : 'NO') . "\n";
    
} catch (Exception $e) {
    echo "Error including plugin: " . $e->getMessage() . "\n";
}
?>
