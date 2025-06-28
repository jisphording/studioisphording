<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();
$page = $kirby->page('projects/02-screw-driver');

if ($page) {
    echo "=== DEBUGGING SCREW DRIVER PROJECT ===\n";
    echo "Page: " . $page->title() . "\n";
    echo "Template: " . $page->template() . "\n\n";
    
    echo "=== CHECKING getResponsiveImage METHOD ===\n";
    echo "Site object exists: " . (is_object($kirby->site()) ? 'YES' : 'NO') . "\n";
    echo "getResponsiveImage method exists: " . (method_exists($kirby->site(), 'getResponsiveImage') ? 'YES' : 'NO') . "\n\n";
    
    echo "=== IMAGES IN PROJECT ===\n";
    foreach ($page->images()->filterBy('filename', '!*=', '_keyvisual')->filterBy('filename', '!*=', 'intro-img') as $image) {
        echo "Image: " . $image->filename() . "\n";
        echo "  Extension: " . $image->extension() . "\n";
        echo "  Original URL: " . $image->url() . "\n";
        
        // Test if this is the problematic image
        if (strpos($image->filename(), 'screwDriver_03') !== false) {
            echo "  *** THIS IS THE PROBLEMATIC IMAGE ***\n";
            
            // Test getResponsiveImage method
            try {
                $responsiveHTML = $kirby->site()->getResponsiveImage($image, 'Test', 'test-class');
                echo "  Responsive HTML generated: " . (strlen($responsiveHTML) > 0 ? 'YES' : 'NO') . "\n";
                echo "  HTML length: " . strlen($responsiveHTML) . " characters\n";
                
                // Extract the first src URL
                if (preg_match('/src="([^"]+)"/', $responsiveHTML, $matches)) {
                    echo "  First src URL: " . $matches[1] . "\n";
                }
            } catch (Exception $e) {
                echo "  ERROR in getResponsiveImage: " . $e->getMessage() . "\n";
            }
            
            // Test getThumbnail method
            try {
                $thumb = $kirby->site()->getThumbnail($image, 800, 640, 85);
                if ($thumb) {
                    echo "  Thumbnail URL: " . $thumb->url() . "\n";
                    echo "  Thumbnail exists: " . (file_exists($thumb->root()) ? 'YES' : 'NO') . "\n";
                } else {
                    echo "  Thumbnail creation failed\n";
                }
            } catch (Exception $e) {
                echo "  ERROR in getThumbnail: " . $e->getMessage() . "\n";
            }
        }
        
        echo "\n";
    }
} else {
    echo "Screw driver project not found\n";
}
?>
