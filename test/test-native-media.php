<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();
$page = $kirby->page('projects/01-phenotype-agency');

if ($page) {
    foreach ($page->files() as $file) {
        if (strpos($file->filename(), 'phenotype-agency-00_keyvisual') !== false) {
            echo "=== TESTING NATIVE KIRBY MEDIA PROCESSING ===\n";
            echo "File: " . $file->filename() . "\n";
            echo "Media hash: " . $file->mediaHash() . "\n";
            
            // Create a new thumbnail request that doesn't exist yet
            $testThumb = $file->thumb([
                'width' => 400,
                'height' => 300,
                'crop' => true,
                'quality' => 80
            ]);
            
            if ($testThumb) {
                echo "Thumbnail URL: " . $testThumb->url() . "\n";
                echo "Expected path: " . $testThumb->root() . "\n";
                
                // Check if thumbnail exists before accessing
                echo "Exists before access: " . (file_exists($testThumb->root()) ? 'YES' : 'NO') . "\n";
                
                // Check if job file exists
                $jobFile = dirname($testThumb->root()) . '/.jobs/' . basename($testThumb->root()) . '.json';
                echo "Job file path: " . $jobFile . "\n";
                echo "Job file exists: " . (file_exists($jobFile) ? 'YES' : 'NO') . "\n";
                
                if (file_exists($jobFile)) {
                    $jobData = json_decode(file_get_contents($jobFile), true);
                    echo "Job data: " . json_encode($jobData, JSON_PRETTY_PRINT) . "\n";
                }
                
                // Now try to access the thumbnail to trigger generation
                try {
                    $content = $testThumb->read();
                    echo "Thumbnail generated successfully: " . strlen($content) . " bytes\n";
                    echo "Exists after access: " . (file_exists($testThumb->root()) ? 'YES' : 'NO') . "\n";
                    echo "Job file exists after: " . (file_exists($jobFile) ? 'YES' : 'NO') . "\n";
                } catch (Exception $e) {
                    echo "Error accessing thumbnail: " . $e->getMessage() . "\n";
                }
            } else {
                echo "Failed to create thumbnail object\n";
            }
            
            break;
        }
    }
} else {
    echo "Page not found\n";
}
?>
