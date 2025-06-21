<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();
$page = $kirby->page('projects/isphording-inneneinrichtung');

if ($page) {
    foreach ($page->files() as $file) {
        if (strpos($file->filename(), 'isphinnen_00_keyvisual') !== false) {
            echo "=== DEBUGGING THUMBNAIL CREATION ===\n";
            echo "Original file: " . $file->root() . "\n";
            echo "File size: " . filesize($file->root()) . " bytes\n";
            echo "File mime: " . $file->mime() . "\n";
            
            // Check if original file is a valid image
            $imageInfo = getimagesize($file->root());
            if ($imageInfo) {
                echo "Image dimensions: " . $imageInfo[0] . "x" . $imageInfo[1] . "\n";
                echo "Image type: " . $imageInfo['mime'] . "\n";
            } else {
                echo "ERROR: Not a valid image file\n";
                break;
            }
            
            // Try to create thumbnail with error handling
            try {
                echo "\n=== CREATING THUMBNAIL ===\n";
                
                // Get the thumb object but don't create it yet
                $thumb = $file->thumb([
                    'width' => 690,
                    'height' => 590,
                    'crop' => true,
                    'quality' => 75
                ]);
                
                echo "Thumb object created: " . ($thumb ? 'YES' : 'NO') . "\n";
                
                if ($thumb) {
                    echo "Expected thumb path: " . $thumb->root() . "\n";
                    echo "Thumb URL: " . $thumb->url() . "\n";
                    
                    // Check if thumb exists before creation
                    echo "Thumb exists before creation: " . (file_exists($thumb->root()) ? 'YES' : 'NO') . "\n";
                    
                    // Force creation by accessing the file
                    $thumbContent = $thumb->read();
                    echo "Thumb content length: " . strlen($thumbContent) . " bytes\n";
                    
                    // Check if thumb exists after creation
                    echo "Thumb exists after creation: " . (file_exists($thumb->root()) ? 'YES' : 'NO') . "\n";
                    
                    if (file_exists($thumb->root())) {
                        echo "Thumb file size: " . filesize($thumb->root()) . " bytes\n";
                    }
                    
                    // Check directory permissions
                    $thumbDir = dirname($thumb->root());
                    echo "Thumb directory: " . $thumbDir . "\n";
                    echo "Thumb directory exists: " . (is_dir($thumbDir) ? 'YES' : 'NO') . "\n";
                    echo "Thumb directory writable: " . (is_writable($thumbDir) ? 'YES' : 'NO') . "\n";
                    
                    // List files in thumb directory
                    echo "\nFiles in thumb directory:\n";
                    $files = scandir($thumbDir);
                    foreach ($files as $f) {
                        if ($f !== '.' && $f !== '..') {
                            echo "  - " . $f . "\n";
                        }
                    }
                }
                
            } catch (Exception $e) {
                echo "EXCEPTION: " . $e->getMessage() . "\n";
                echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
            }
            
            break;
        }
    }
} else {
    echo "Page not found\n";
}
?>
