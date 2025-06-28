<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();
$page = $kirby->page('projects/isphording-inneneinrichtung');

if ($page) {
    echo "=== TESTING RESPONSIVE IMAGE GENERATION ===\n";
    echo "Page: " . $page->title() . "\n";
    echo "Page URL: " . $page->url() . "\n\n";
    
    // Find a test image
    $testImage = null;
    foreach ($page->images() as $image) {
        if (strpos($image->filename(), 'isphinnen_10_overview_00') !== false) {
            $testImage = $image;
            break;
        }
    }
    
    if ($testImage) {
        echo "Test image: " . $testImage->filename() . "\n";
        echo "Original URL: " . $testImage->url() . "\n\n";
        
        // Test the getResponsiveImage method
        echo "=== TESTING getResponsiveImage METHOD ===\n";
        $responsiveImageHTML = $kirby->site()->getResponsiveImage($testImage, 'Test Image', 'test-class');
        
        echo "Generated HTML:\n";
        echo $responsiveImageHTML . "\n\n";
        
        // Extract URLs from the HTML
        preg_match_all('/src="([^"]+)"/', $responsiveImageHTML, $srcMatches);
        preg_match_all('/srcset="([^"]+)"/', $responsiveImageHTML, $srcsetMatches);
        
        if (!empty($srcMatches[1])) {
            echo "Main src URL: " . $srcMatches[1][0] . "\n";
        }
        
        if (!empty($srcsetMatches[1])) {
            echo "Srcset URLs:\n";
            $srcsetUrls = explode(',', $srcsetMatches[1][0]);
            foreach ($srcsetUrls as $url) {
                $url = trim($url);
                echo "  - " . $url . "\n";
            }
        }
        
        // Test individual thumbnail creation
        echo "\n=== TESTING INDIVIDUAL THUMBNAIL CREATION ===\n";
        $thumb = $kirby->site()->getThumbnail($testImage, 800, 640, 75);
        if ($thumb) {
            echo "Thumbnail URL: " . $thumb->url() . "\n";
            echo "Thumbnail path: " . $thumb->root() . "\n";
            echo "Thumbnail exists: " . (file_exists($thumb->root()) ? 'YES' : 'NO') . "\n";
            
            if (!file_exists($thumb->root())) {
                // Force creation
                $content = $thumb->read();
                echo "Forced creation, now exists: " . (file_exists($thumb->root()) ? 'YES' : 'NO') . "\n";
            }
        }
        
    } else {
        echo "No test image found\n";
    }
} else {
    echo "Page not found\n";
}
?>
