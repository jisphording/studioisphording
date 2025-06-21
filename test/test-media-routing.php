<?php
// Simulate what happens when a media URL is requested
$_SERVER['REQUEST_URI'] = '/media/pages/projects/01-phenotype-agency/b9841300b0-1698155095/phenotype-agency-00_keyvisual-490x390-crop-q35.jpg';
$_SERVER['REQUEST_METHOD'] = 'GET';

require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();

echo "=== TESTING MEDIA URL ROUTING ===\n";
echo "Request URI: " . $_SERVER['REQUEST_URI'] . "\n";

// Check if this is a media request
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
echo "Parsed path: " . $path . "\n";

if (preg_match('!^/media/(.+)$!', $path, $matches)) {
    echo "Media path detected: " . $matches[1] . "\n";
    
    // Parse the media path
    $mediaPath = $matches[1];
    $parts = explode('/', $mediaPath);
    
    if (count($parts) >= 3) {
        $filename = array_pop($parts);
        $hash = array_pop($parts);
        $pageUri = implode('/', $parts);
        
        // Remove 'pages/' prefix if present
        if (str_starts_with($pageUri, 'pages/')) {
            $pageUri = substr($pageUri, 6);
        }
        
        echo "Page URI: " . $pageUri . "\n";
        echo "Hash: " . $hash . "\n";
        echo "Filename: " . $filename . "\n";
        
        // Try to find the page
        $page = $kirby->page($pageUri);
        if ($page) {
            echo "Page found: " . $page->title() . "\n";
            
            // Try to use Kirby's Media class
            try {
                $response = \Kirby\Cms\Media::link($page, $hash, $filename);
                if ($response) {
                    echo "Media::link successful: " . get_class($response) . "\n";
                    
                    // Check if file was created
                    $mediaRoot = $kirby->root('media');
                    $expectedPath = $mediaRoot . '/pages/' . $pageUri . '/' . $hash . '/' . $filename;
                    echo "Expected file path: " . $expectedPath . "\n";
                    echo "File exists: " . (file_exists($expectedPath) ? 'YES' : 'NO') . "\n";
                    
                    if (file_exists($expectedPath)) {
                        echo "File size: " . filesize($expectedPath) . " bytes\n";
                    }
                } else {
                    echo "Media::link returned false\n";
                }
            } catch (Exception $e) {
                echo "Error in Media::link: " . $e->getMessage() . "\n";
            }
        } else {
            echo "Page not found\n";
        }
    } else {
        echo "Invalid media path structure\n";
    }
} else {
    echo "Not a media request\n";
}
?>
