export function calculateMoodboardLayout(imageSources, maxImageHeight, padding, imagesPerRow) {
    let totalWidth = 0;
    let totalHeight = 0;

    const rows = [];
    let currentRowImages = [];

    imageSources.forEach((source, index) => {
        if (source.width && source.height) {
            const aspectRatio = source.width / source.height;
            let imageHeight = maxImageHeight;
            let imageWidth = imageHeight * aspectRatio;

            if (imageWidth > maxImageHeight * 2) {
                imageWidth = maxImageHeight * 2;
                imageHeight = imageWidth / aspectRatio;
            }

            if (currentRowImages.length === imagesPerRow) {
                rows.push(currentRowImages);
                currentRowImages = [];
            }
            currentRowImages.push({ source, imageWidth, imageHeight });
        }
    });
    if (currentRowImages.length > 0) {
        rows.push(currentRowImages);
    }

    rows.forEach((rowImages, rowIndex) => {
        let rowWidth = 0;
        let rowHeight = 0;
        rowImages.forEach(img => {
            rowWidth += img.imageWidth + padding;
            if (img.imageHeight > rowHeight) {
                rowHeight = img.imageHeight;
            }
        });
        rowWidth -= padding;

        if (rowWidth > totalWidth) {
            totalWidth = rowWidth;
        }
        totalHeight += rowHeight + padding;
    });
    if (rows.length > 0) {
        totalHeight -= padding;
    }

    const startX = -totalWidth / 2;
    const startY = totalHeight / 2;

    return {
        rows,
        totalWidth,
        totalHeight,
        startX,
        startY
    };
}
