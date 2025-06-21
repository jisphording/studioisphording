<?php
/**
 * Media Cache Build Script for Kirby 4.8
 * 
 * This script pre-generates all media cache files for all projects
 * to ensure thumbnails are available without relying on automatic generation.
 */

// Increase memory limit for processing large images
ini_set('memory_limit', '512M');

require_once 'app/kirby/bootstrap.php';

$kirby = new Kirby();

echo "=== KIRBY MEDIA CACHE BUILD SCRIPT ===\n";
echo "Starting media cache generation for all projects...\n\n";

// CONFIGURATION: Read from Kirby config
$USE_CROP = $kirby->option('custom.images.use_crop', false);

echo "🔧 Configuration: " . ($USE_CROP ? "CROP mode (images will be cropped to exact dimensions)" : "RESIZE mode (images will be resized maintaining aspect ratio)") . "\n\n";

// Common thumbnail sizes used in the project
$thumbnailSizes = [
    ['width' => 150, 'height' => 150, 'quality' => 60],
    ['width' => 300, 'height' => 200, 'quality' => 75],
    ['width' => 400, 'height' => 300, 'quality' => 75],
    ['width' => 690, 'height' => 590, 'quality' => 75],  // Used in legacy site methods
    ['width' => 800, 'height' => 600, 'quality' => 90],  // Used in project and about templates
    ['width' => 1200, 'height' => 800, 'quality' => 90], // Used in intro-img snippet
    // NEW RESPONSIVE IMAGE SIZES - Used in updated site methods
    ['width' => 490, 'height' => 390, 'quality' => 60],  // Small: mobile and low-res displays
    ['width' => 800, 'height' => 640, 'quality' => 75],  // Medium: tablets and standard displays
    ['width' => 1200, 'height' => 960, 'quality' => 90], // Large: desktop and high-res displays
    ['width' => 1600, 'height' => 1280, 'quality' => 99], // Extra Large: high-DPI displays (2x)
    ['width' => 1920, 'height' => 1536, 'quality' => 99], // XXL: Full HD high-DPI displays
    ['width' => 2160, 'height' => 1728, 'quality' => 99], // UHD: Ultra high-resolution displays
    ['width' => 2560, 'height' => 2048, 'quality' => 99], // 2K: Large 4K displays
    ['width' => 3200, 'height' => 2560, 'quality' => 99], // 3K: Ultra large displays
    ['width' => 3840, 'height' => 3072, 'quality' => 99], // 4K: Maximum resolution displays
    ['width' => 4320, 'height' => 3456, 'quality' => 99], // 5K: Professional displays
    // Large image sizes for high-resolution displays
    ['width' => 1440, 'height' => 810, 'quality' => 90],   // 16:9 aspect ratio
    ['width' => 1680, 'height' => 945, 'quality' => 90],   // 16:9 aspect ratio
    ['width' => 1920, 'height' => 1080, 'quality' => 90],  // Full HD 16:9
    ['width' => 2160, 'height' => 1215, 'quality' => 90],  // 16:9 aspect ratio
    ['width' => 2560, 'height' => 1440, 'quality' => 90],  // QHD 16:9
];

$totalGenerated = 0;
$totalErrors = 0;
$totalSkipped = 0;

// Get all projects
$projects = $kirby->page('projects');
if (!$projects) {
    echo "❌ Projects page not found!\n";
    exit(1);
}

// Also process about page images
$aboutPage = $kirby->page('about');
if ($aboutPage) {
    echo "📁 Processing about page images...\n";
    
    $files = $aboutPage->files();
    $aboutGenerated = 0;
    $aboutErrors = 0;
    $aboutSkipped = 0;
    
    if ($files->count() > 0) {
        foreach ($files as $file) {
            // Only process image files
            if (!$file->isResizable()) {
                continue;
            }
            
            echo "   🖼️  Processing: " . $file->filename() . "\n";
            
            // Check if original file exists and is readable
            if (!file_exists($file->root()) || !is_readable($file->root())) {
                echo "      ❌ Original file not accessible\n";
                $aboutErrors++;
                continue;
            }
            
            // Get file info
            $fileSize = filesize($file->root());
            $imageInfo = getimagesize($file->root());
            
            if (!$imageInfo) {
                echo "      ❌ Not a valid image file\n";
                $aboutErrors++;
                continue;
            }
            
            echo "      📏 Original: {$imageInfo[0]}x{$imageInfo[1]} ({$fileSize} bytes)\n";
            
            // Generate thumbnails for each size
            foreach ($thumbnailSizes as $size) {
                $width = $size['width'];
                $height = $size['height'];
                $quality = $size['quality'];
                
                try {
                    // Create thumbnail using global crop setting
                    $thumb = $file->thumb([
                        'width' => $width,
                        'height' => $height,
                        'crop' => $USE_CROP,
                        'quality' => $quality
                    ]);
                    
                    if ($thumb) {
                        // Check if thumbnail already exists
                        if (file_exists($thumb->root())) {
                            echo "      ✅ {$width}x{$height} (q{$quality}): Already exists (" . filesize($thumb->root()) . " bytes)\n";
                            $aboutSkipped++;
                            continue;
                        }
                        
                        // Force creation by reading the file
                        $content = $thumb->read();
                        
                        if (file_exists($thumb->root())) {
                            $thumbSize = filesize($thumb->root());
                            echo "      ✅ {$width}x{$height} (q{$quality}): Generated ({$thumbSize} bytes)\n";
                            $aboutGenerated++;
                        } else {
                            echo "      ❌ {$width}x{$height} (q{$quality}): Failed to create file\n";
                            $aboutErrors++;
                        }
                    } else {
                        echo "      ❌ {$width}x{$height} (q{$quality}): Failed to create thumb object\n";
                        $aboutErrors++;
                    }
                } catch (Exception $e) {
                    echo "      ❌ {$width}x{$height} (q{$quality}): Error - " . $e->getMessage() . "\n";
                    $aboutErrors++;
                }
            }
            
            echo "\n";
        }
    } else {
        echo "   ⚠️  No files found on about page\n";
    }
    
    echo "   📊 About page summary: {$aboutGenerated} generated, {$aboutSkipped} skipped, {$aboutErrors} errors\n\n";
    
    $totalGenerated += $aboutGenerated;
    $totalSkipped += $aboutSkipped;
    $totalErrors += $aboutErrors;
}

foreach ($projects->children() as $project) {
    echo "📁 Processing project: " . $project->title() . " (" . $project->slug() . ")\n";
    
    $files = $project->files();
    $projectGenerated = 0;
    $projectErrors = 0;
    $projectSkipped = 0;
    
    if ($files->count() === 0) {
        echo "   ⚠️  No files found\n";
        continue;
    }
    
    foreach ($files as $file) {
        // Only process image files
        if (!$file->isResizable()) {
            continue;
        }
        
        echo "   🖼️  Processing: " . $file->filename() . "\n";
        
        // Check if original file exists and is readable
        if (!file_exists($file->root()) || !is_readable($file->root())) {
            echo "      ❌ Original file not accessible\n";
            $projectErrors++;
            continue;
        }
        
        // Get file info
        $fileSize = filesize($file->root());
        $imageInfo = getimagesize($file->root());
        
        if (!$imageInfo) {
            echo "      ❌ Not a valid image file\n";
            $projectErrors++;
            continue;
        }
        
        echo "      📏 Original: {$imageInfo[0]}x{$imageInfo[1]} ({$fileSize} bytes)\n";
        
        // Generate thumbnails for each size
        foreach ($thumbnailSizes as $size) {
            $width = $size['width'];
            $height = $size['height'];
            $quality = $size['quality'];
            
            try {
                // Create thumbnail using global crop setting
                $thumb = $file->thumb([
                    'width' => $width,
                    'height' => $height,
                    'crop' => $USE_CROP,
                    'quality' => $quality
                ]);
                
                if ($thumb) {
                    // Check if thumbnail already exists
                    if (file_exists($thumb->root())) {
                        echo "      ✅ {$width}x{$height} (q{$quality}): Already exists (" . filesize($thumb->root()) . " bytes)\n";
                        $projectSkipped++;
                        continue;
                    }
                    
                    // Force creation by reading the file
                    $content = $thumb->read();
                    
                    if (file_exists($thumb->root())) {
                        $thumbSize = filesize($thumb->root());
                        echo "      ✅ {$width}x{$height} (q{$quality}): Generated ({$thumbSize} bytes)\n";
                        $projectGenerated++;
                    } else {
                        echo "      ❌ {$width}x{$height} (q{$quality}): Failed to create file\n";
                        $projectErrors++;
                    }
                } else {
                    echo "      ❌ {$width}x{$height} (q{$quality}): Failed to create thumb object\n";
                    $projectErrors++;
                }
            } catch (Exception $e) {
                echo "      ❌ {$width}x{$height} (q{$quality}): Error - " . $e->getMessage() . "\n";
                $projectErrors++;
            }
        }
        
        echo "\n";
    }
    
    echo "   📊 Project summary: {$projectGenerated} generated, {$projectSkipped} skipped, {$projectErrors} errors\n\n";
    
    $totalGenerated += $projectGenerated;
    $totalSkipped += $projectSkipped;
    $totalErrors += $projectErrors;
}

// Also process any existing job files that might not have been generated
echo "🔍 Processing existing job files...\n";
$mediaRoot = $kirby->root('media');
$jobsGenerated = 0;

if (is_dir($mediaRoot . '/pages')) {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($mediaRoot . '/pages'),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    
    foreach ($iterator as $file) {
        if ($file->getExtension() === 'json' && strpos($file->getPath(), '/.jobs') !== false) {
            $jobFile = $file->getRealPath();
            $jobData = json_decode(file_get_contents($jobFile), true);
            
            if ($jobData && isset($jobData['filename'], $jobData['width'], $jobData['height'], $jobData['quality'])) {
                $expectedThumbPath = dirname(dirname($jobFile)) . '/' . pathinfo($jobFile, PATHINFO_FILENAME);
                
                if (!file_exists($expectedThumbPath)) {
                    echo "   🔧 Processing job: " . basename($jobFile) . "\n";
                    
                    // Find the page and file
                    $pathParts = explode('/', str_replace($mediaRoot . '/pages/', '', dirname(dirname($jobFile))));
                    $hash = array_pop($pathParts);
                    $pageUri = implode('/', $pathParts);
                    
                    $page = $kirby->page($pageUri);
                    if ($page && $page->file($jobData['filename'])) {
                        try {
                            $response = \Kirby\Cms\Media::link($page, $hash, pathinfo($jobFile, PATHINFO_FILENAME));
                            if ($response && file_exists($expectedThumbPath)) {
                                echo "      ✅ Generated from job: " . filesize($expectedThumbPath) . " bytes\n";
                                $jobsGenerated++;
                            }
                        } catch (Exception $e) {
                            echo "      ❌ Job processing failed: " . $e->getMessage() . "\n";
                        }
                    }
                }
            }
        }
    }
}

echo "\n=== BUILD SUMMARY ===\n";
echo "📈 Total thumbnails generated: {$totalGenerated}\n";
echo "⏭️  Total thumbnails skipped (already existed): {$totalSkipped}\n";
echo "🔧 Total generated from job files: {$jobsGenerated}\n";
echo "❌ Total errors: {$totalErrors}\n";
echo "🎯 Grand total created: " . ($totalGenerated + $jobsGenerated) . "\n\n";

if ($totalGenerated + $jobsGenerated > 0) {
    echo "✅ Media cache build completed successfully!\n";
    echo "🚀 All thumbnails are now pre-generated and ready to serve.\n";
} else {
    echo "⚠️  No new thumbnails were generated.\n";
    if ($totalSkipped > 0) {
        echo "ℹ️  All thumbnails already existed ({$totalSkipped} files).\n";
    }
}

if ($totalErrors > 0) {
    echo "\n⚠️  There were {$totalErrors} errors during processing.\n";
    echo "💡 Check file permissions and image validity for failed files.\n";
}

echo "\n🏁 Build script finished.\n";
?>
