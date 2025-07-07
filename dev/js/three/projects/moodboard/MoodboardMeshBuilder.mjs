import * as THREE from 'three';

export function buildMoodboardMeshes(scene, layoutData, placeholderMaterial, checkerboardUnitSize, padding) {
    const moodboardImages = [];
    const moodboardImageMeshes = {};
    let currentY = layoutData.startY;

    layoutData.rows.forEach(rowImages => {
        let rowMaxHeight = 0;
        rowImages.forEach(img => {
            if (img.imageHeight > rowMaxHeight) {
                rowMaxHeight = img.imageHeight;
            }
        });

        let currentX = layoutData.startX;
        rowImages.forEach(img => {
            const geometry = new THREE.PlaneGeometry(img.imageWidth, img.imageHeight);
            const mesh = new THREE.Mesh(geometry, placeholderMaterial.clone());

            mesh.position.x = currentX + img.imageWidth / 2;
            mesh.position.y = currentY - img.imageHeight / 2;
            mesh.position.z = 0;
            mesh.name = img.source.name;

            mesh.material.map.repeat.set(img.imageWidth / checkerboardUnitSize, img.imageHeight / checkerboardUnitSize);
            mesh.material.map.needsUpdate = true;
            
            scene.add(mesh);
            moodboardImages.push(mesh);
            moodboardImageMeshes[img.source.name] = mesh;
            
            currentX += img.imageWidth + padding;
        });
        currentY -= (rowMaxHeight + padding);
    });

    return { moodboardImages, moodboardImageMeshes };
}
