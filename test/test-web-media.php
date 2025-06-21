<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();

// Simulate a web request for a thumbnail
$page = $kirby->page('projects/01-phenotype-agency');
if ($page) {
    foreach ($page->files() as $file) {
        if (strpos($file->filename(), 'phenotype-agency-00_keyvisual') !== false) {
            echo "=== TESTING WEB MEDIA REQUEST ===\n";
            
            // Create a thumbnail that should be processed via web request
            $thumb = $file->thumb([
                'width' => 350,
                'height' => 250,
                'crop' => true,
                'quality' => 70
            ]);
            
            if ($thumb) {
                $mediaUrl = $thumb->url();
                $mediaPath = $thumb->root();
                $jobFile = dirname($mediaPath) . '/.jobs/' . basename($mediaPath) . '.json';
                
                echo "Media URL: " . $mediaUrl . "\n";
                echo "Media Path: " . $mediaPath . "\n";
                echo "Job File: " . $jobFile . "\n";
                
                echo "File exists before: " . (file_exists($mediaPath) ? 'YES' : 'NO') . "\n";
                echo "Job exists before: " . (file_exists($jobFile) ? 'YES' : 'NO') . "\n";
                
                // Try to simulate what happens when the media URL is requested
                $hash = $file->mediaHash();
                $filename = basename($mediaPath);
                $path = 'projects/01-phenotype-agency/' . $hash;
                
                echo "\nSimulating media request...\n";
                echo "Path: " . $path . "\n";
                echo "Filename: " . $filename . "\n";
                
                // Use Kirby's Media class directly
                try {
                    $response = \Kirby\Cms\Media::link($page, $hash, $filename);
                    
                    if ($response) {
                        echo "Media::link returned response: " . get_class($response) . "\n";
                        echo "File exists after: " . (file_exists($mediaPath) ? 'YES' : 'NO') . "\n";
                        echo "Job exists after: " . (file_exists($jobFile) ? 'YES' : 'NO') . "\n";
                        
                        if (file_exists($mediaPath)) {
                            echo "File size: " . filesize($mediaPath) . " bytes\n";
                        }
                    } else {
                        echo "Media::link returned false\n";
                    }
                } catch (Exception $e) {
                    echo "Error: " . $e->getMessage() . "\n";
                }
            }
            break;
        }
    }
}
?>
