<?php

use Kirby\Cms\Html;

/**
 * Project Gallery Snippet
 * Handles both videos and images
 *
 * @param bool $useResponsiveImages - Whether to use responsive images (default: true)
 */

$useResponsiveImages = $useResponsiveImages ?? true;
?>

<ul class="project__single--gallery">
	<?php
	// First, collect all videos that will be displayed
	$displayedVideos = [];
	
	// Videos render from the media manifest ladder like every other video.
	// Only masters (.mp4/.mov) are gallery items: a .webm beside one is a
	// legacy rendition, and the keyvisual video is not a gallery entry. The
	// still sharing a master's base name is its poster, so the image loop
	// skips it.
	foreach($page->videos()->filter(fn ($video) => in_array(strtolower($video->extension()), ['mp4', 'mov'], true) && !str_contains($video->filename(), '_keyvisual')) as $video):
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
