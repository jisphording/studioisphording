<?php

use Kirby\Cms\Html;

/**
 * Project Gallery Snippet
 * Handles both videos and images
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
		// Check which videos exist in the custom video directory (a real
		// webroot-relative folder, e.g. app/video/, outside the content tree)
		foreach($page->images()->filterBy('filename', '!*=', '_keyvisual')->filterBy('filename', '!*=', 'intro-img') as $image):
			$baseName = pathinfo($image->filename(), PATHINFO_FILENAME);
			$file_video_mp4 = $baseName . ".mp4";
			$file_video_webm = $baseName . ".webm";
			$filetocheck = kirby()->root('index') . '/' . $videoPath . $file_video_mp4;

			if (file_exists($filetocheck)):
				$displayedVideos[] = $baseName; ?>
				<li>
					<figure>
						<?php snippet('responsive-video', [
							// app/video/ lies outside the content tree, so no manifest
							// entry: the existing file URLs are the sources.
							'file'     => null,
							'fallback' => [
								['url' => url($videoPath . $file_video_mp4), 'type' => 'video/mp4'],
								['url' => url($videoPath . $file_video_webm), 'type' => 'video/webm'],
							],
							'class' => 'showcase__grid--image',
						]) ?>
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
					<?php snippet('responsive-video', [
						'file'     => $video,
						'fallback' => [['url' => $video->url(), 'type' => $video->mime()]],
						'class'    => 'showcase__grid--image',
					]) ?>
				</figure>
			</li>
		<?php endforeach;
	}

	// Then display images, filtering out keyvisual and intro images. Format
	// negotiation (AVIF/WebP/JPEG) is the <picture> element's job, so every
	// image is listed once, as stored.
	foreach($page->images()->filterBy('filename', '!*=', '_keyvisual')->filterBy('filename', '!*=', 'intro-img') as $selectedImage) {
		$baseName = pathinfo($selectedImage->filename(), PATHINFO_FILENAME);

		// Show image if no corresponding video was displayed
		if (!in_array($baseName, $displayedVideos)): ?>
			<li>
				<figure class="showcase__grid--image">
					<?php
					$responsiveImage = null;

					if ($useResponsiveImages) {
						try {
							$responsiveImage = snippet('responsive-image', [
								'file'  => $selectedImage,
								'alt'   => $page->title()->titleText('raw')->value(),
								'class' => 'showcase__grid--image--inside',
								'sizes' => null,
								'eager' => false,
								'site'  => $site,
							], true);
						} catch (Exception $e) {
							// Fall through to the fallback thumb below.
						}
					}

					if ($responsiveImage !== null) {
						echo $responsiveImage;
					} else {
						// Fallback: a basic thumb image, used when responsive images
						// are off or the responsive image threw.
						$thumb = $site->getThumbnail($selectedImage, 800, 640, 85);
						echo Html::img($thumb->url(), [
							'alt'   => $page->title()->titleText('raw')->value(),
							'class' => 'showcase__grid--image--inside',
						]);
					}
					?>
				</figure>
			</li>
		<?php endif;
	} ?>
</ul>
