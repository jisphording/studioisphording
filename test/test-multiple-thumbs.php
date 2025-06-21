<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();
$page = $kirby->page('projects/isphording-inneneinrichtung');

if ($page) {
    foreach ($page->files() as $file) {
        if (strpos($file->filename(), 'isphinnen_00_keyvisual') !== false) {
            echo "Testing multiple thumbnail sizes for: " . $file->filename() . "\n";
            
            // Test different thumbnail sizes
            $sizes = [
                ['width' => 490, 'height' => 390, 'quality' => 35],
                ['width' => 690, 'height' => 590, 'quality' => 75],
                ['width' => 300, 'height' => 200, 'quality' => 80],
                ['width' => 150, 'height' => 150, 'quality' => 60]
            ];
            
            foreach ($sizes as $size) {
                try {
                    $thumb = $file->thumb([
                        'width' => $size['width'],
                        'height' => $size['height'],
                        'crop' => true,
                        'quality' => $size['quality']
                    ]);
                    
                    if ($thumb) {
                        // Force creation by reading the file
                        $content = $thumb->read();
                        $exists = file_exists($thumb->root());
                        $fileSize = $exists ? filesize($thumb->root()) : 0;
                        
                        echo sprintf(
                            "  %dx%d (q%d): %s (%d bytes)\n",
                            $size['width'],
                            $size['height'],
                            $size['quality'],
                            $exists ? 'SUCCESS' : 'FAILED',
                            $fileSize
                        );
                    } else {
                        echo sprintf("  %dx%d (q%d): FAILED - No thumb object\n", $size['width'], $size['height'], $size['quality']);
                    }
                } catch (Exception $e) {
                    echo sprintf("  %dx%d (q%d): ERROR - %s\n", $size['width'], $size['height'], $size['quality'], $e->getMessage());
                }
            }
            break;
        }
    }
} else {
    echo "Page not found\n";
}
?>
