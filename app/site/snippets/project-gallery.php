<?php
/**
 * Project Gallery Snippet
 * Handles both videos and images with WebP prioritization and duplicate handling
 * 
 * @param bool $useResponsiveImages - Whether to use responsive images (default: true)
 * @param string $videoPath - Custom video path for three.js projects (default: uses Kirby videos)
 */

$useResponsiveImages = $useResponsiveImages ?? true;
$videoPath = $videoPath ?? null;
?>

<ul class="project__single--gallery">
	<?php
	// First, collect all videos that will be displayed
	$displayedVideos = [];
	
	if ($videoPath) {
		// Custom video handling for three.js projects
		// Check which videos exist in the custom video directory
		foreach($page->images()->filterBy('filename', '!*=', '_keyvisual')->filterBy('filename', '!*=', 'intro-img') as $image):
			$baseName = pathinfo($image->filename(), PATHINFO_FILENAME);
			$video_dir = $videoPath;
			$file_video_mp4 = $baseName . ".mp4";
			$file_video_webm = $baseName . ".webm";
			$filetocheck = $video_dir . $file_video_mp4;
			
			if (file_exists($filetocheck)): 
				$displayedVideos[] = $baseName; ?>
				<li>
					<figure>
						<video class="showcase__grid--image" playsinline autoplay muted loop>
							<source src="<?= $site->url('') . '/' . $video_dir . $file_video_mp4 ?>" type="video/mp4">
							<source src="<?= $site->url('') . '/' . $video_dir . $file_video_webm ?>" type="video/webm">
						</video>
					</figure>
				</li>
			<?php endif;
		endforeach;
	} else {
		// Standard Kirby video handling
		foreach($page->videos() as $video): 
			$videoBaseName = pathinfo($video->filename(), PATHINFO_FILENAME);
			$displayedVideos[] = $videoBaseName; ?>
			<li>
				<figure>
					<video class="showcase__grid--image" playsinline autoplay muted loop>
						<source src="<?= $video->url() ?>" type="<?= $video->mime() ?>">
					</video>
				</figure>
			</li>
		<?php endforeach;
	}

	// Then display images, filtering out keyvisual and intro images
	// Group images by base name to handle WebP/JPG duplicates
	$imageGroups = [];
	foreach($page->images()->filterBy('filename', '!*=', '_keyvisual')->filterBy('filename', '!*=', 'intro-img') as $image) {
		$baseName = pathinfo($image->filename(), PATHINFO_FILENAME);
		$extension = strtolower($image->extension());
		
		if (!isset($imageGroups[$baseName])) {
			$imageGroups[$baseName] = [];
		}
		$imageGroups[$baseName][$extension] = $image;
	}
	
	// Process each image group, prioritizing WebP over other formats
	foreach($imageGroups as $baseName => $images) {
		// Check if there's a corresponding video file with the same base name
		$videoAlreadyDisplayed = in_array($baseName, $displayedVideos);
		
		// Show image if no corresponding video was displayed
		if (!$videoAlreadyDisplayed) {
			// Prioritize WebP, then fallback to other formats
			$selectedImage = null;
			if (isset($images['webp'])) {
				$selectedImage = $images['webp'];
			} elseif (isset($images['jpg'])) {
				$selectedImage = $images['jpg'];
			} elseif (isset($images['jpeg'])) {
				$selectedImage = $images['jpeg'];
			} else {
				// Fallback to first available image
				$selectedImage = reset($images);
			}
			
			if ($selectedImage): ?>
				<li>
					<figure class="showcase__grid--image">
						<?php if ($useResponsiveImages): ?>
							<?php 
							try {
								echo $site->getResponsiveImage($selectedImage, $page->title(), 'showcase__grid--image--inside');
							} catch (Exception $e) {
								// Fallback: create a basic responsive image using thumb method
								$thumb = $site->getThumbnail($selectedImage, 800, 640, 85);
								echo '<img src="' . $thumb->url() . '" alt="' . $page->title() . '" class="showcase__grid--image--inside">';
							}
							?>
						<?php else: ?>
							<?php 
							// Fallback: create a basic responsive image using thumb method
							$thumb = $site->getThumbnail($selectedImage, 800, 640, 85);
							?>
							<img src="<?= $thumb->url() ?>" alt="<?= $page->title() ?>" class="showcase__grid--image--inside">
						<?php endif; ?>
					</figure>
				</li>
			<?php endif;
		}
	} ?>
</ul>
