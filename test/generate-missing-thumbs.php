<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();
$page = $kirby->page('projects/02-screw-driver');

if ($page) {
    echo "Generating missing thumbnails for screw-driver project...\n";
    
    foreach ($page->images() as $image) {
        if (strpos($image->filename(), 'screwDriver_03') !== false) {
            echo "Processing: " . $image->filename() . "\n";
            
            try {
                $thumb = $kirby->site()->getThumbnail($image, 800, 640, 85);
                if ($thumb) {
                    // Force creation by reading the content
                    $content = $thumb->read();
                    echo "  Thumbnail URL: " . $thumb->url() . "\n";
                    echo "  File exists: " . (file_exists($thumb->root()) ? 'YES' : 'NO') . "\n";
                    
                    if (file_exists($thumb->root())) {
                        echo "  File size: " . filesize($thumb->root()) . " bytes\n";
                    }
                } else {
                    echo "  Failed to create thumbnail\n";
                }
            } catch (Exception $e) {
                echo "  Error: " . $e->getMessage() . "\n";
            }
            
            echo "\n";
        }
    }
} else {
    echo "Project not found\n";
}
?>
