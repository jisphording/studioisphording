<?php
require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();
$projects = $kirby->page('projects');

if (!$projects) {
    echo "Projects page not found\n";
    exit(1);
}

echo "=== REGENERATING ALL PROJECT THUMBNAILS ===\n\n";

$totalGenerated = 0;
$totalErrors = 0;

foreach ($projects->children() as $project) {
    echo "Processing project: " . $project->title() . " (" . $project->slug() . ")\n";
    
    $files = $project->files();
    $projectGenerated = 0;
    
    if ($files->count() === 0) {
        echo "  No files found\n";
        continue;
    }
    
    foreach ($files as $file) {
        // Skip non-image files
        if (!$file->isResizable()) {
            continue;
        }
        
        echo "  Processing: " . $file->filename() . "\n";
        
        // Check for existing job files to determine what thumbnails are needed
        $mediaRoot = kirby()->root('media');
        $jobsPath = $mediaRoot . '/pages/' . $file->parent()->diruri() . '/' . $file->mediaHash() . '/.jobs';
        
        if (is_dir($jobsPath)) {
            $jobFiles = scandir($jobsPath);
            
            foreach ($jobFiles as $jobFile) {
                if (pathinfo($jobFile, PATHINFO_EXTENSION) === 'json') {
                    // Parse job file to get thumbnail parameters
                    $jobData = json_decode(file_get_contents($jobsPath . '/' . $jobFile), true);
                    
                    if ($jobData && isset($jobData['width'], $jobData['height'], $jobData['quality'])) {
                        $width = $jobData['width'];
                        $height = $jobData['height'];
                        $quality = $jobData['quality'];
                        $crop = $jobData['crop'] ?? 'center';
                        
                        try {
                            // Create thumbnail
                            $thumb = $file->thumb([
                                'width' => $width,
                                'height' => $height,
                                'crop' => ($crop === 'center' || $crop === true),
                                'quality' => $quality
                            ]);
                            
                            if ($thumb) {
                                // Force creation by reading the file
                                $content = $thumb->read();
                                
                                if (file_exists($thumb->root())) {
                                    $fileSize = filesize($thumb->root());
                                    echo "    ✓ Generated {$width}x{$height} (q{$quality}): {$fileSize} bytes\n";
                                    $projectGenerated++;
                                    $totalGenerated++;
                                } else {
                                    echo "    ✗ Failed to create {$width}x{$height} (q{$quality})\n";
                                    $totalErrors++;
                                }
                            } else {
                                echo "    ✗ No thumb object for {$width}x{$height} (q{$quality})\n";
                                $totalErrors++;
                            }
                        } catch (Exception $e) {
                            echo "    ✗ Error creating {$width}x{$height} (q{$quality}): " . $e->getMessage() . "\n";
                            $totalErrors++;
                        }
                    }
                }
            }
        } else {
            echo "    No jobs directory found\n";
        }
    }
    
    echo "  Generated {$projectGenerated} thumbnails for this project\n\n";
}

echo "=== SUMMARY ===\n";
echo "Total thumbnails generated: {$totalGenerated}\n";
echo "Total errors: {$totalErrors}\n";

if ($totalGenerated > 0) {
    echo "\n✓ Thumbnail regeneration completed successfully!\n";
} else {
    echo "\n⚠ No thumbnails were generated. Check if job files exist or if there are permission issues.\n";
}
?>
