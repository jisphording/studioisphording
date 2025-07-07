// Import external Libraries
import * as THREE from 'three'

// MODULES
import sources from './World_Sources.mjs'

// ---------- ---------- ---------- ---------- ---------- //
// M O O D B O A R D //
// ---------- ---------- ---------- ---------- ---------- //
//
// Manages the layout and visual representation of the moodboard images.

export class Moodboard
{
    constructor(scene)
    {
        this.scene = scene
        this.moodboardImages = []
        this.moodboardImageMeshes = {}; // Store meshes by source name for easy access
        this.moodboardWidth = 0;
        this.moodboardHeight = 0;

        // Create the moodboard layout with placeholder textures immediately
        this.initializeMoodboardLayout();
    }

    createCheckerboardTexture() {
        const size = 16; // Size of each checkerboard square in pixels for the texture
        const canvas = document.createElement('canvas');
        canvas.width = size * 2;
        canvas.height = size * 2;
        const context = canvas.getContext('2d');

        context.fillStyle = '#e0e0e0'; // Light grey 1
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = '#c0c0c0'; // Light grey 2
        context.fillRect(0, 0, size, size);
        context.fillRect(size, size, size, size);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true; // Ensure the texture updates after setting wrap properties
        return texture;
    }

    initializeMoodboardLayout()
    {
        const imageSources = sources.filter(source => source.type === 'texture' && source.name.startsWith('moodboardImage_'));
        const maxImageHeight = 6; // Max height for images to maintain visual consistency
        const padding = 1; // Padding between images
        const imagesPerRow = 5;
        const checkerboardUnitSize = 0.5; // Desired world unit size for each checkerboard square

        let currentX = 0;
        let currentY = 0;

        // Calculate total width and height of the moodboard
        let totalWidth = 0;
        let totalHeight = 0;

        const rows = [];
        let currentRowImages = [];

        imageSources.forEach((source, index) => {
            if (source.width && source.height) { // Use source.width and source.height
                const aspectRatio = source.width / source.height;
                let imageHeight = maxImageHeight;
                let imageWidth = imageHeight * aspectRatio;

                // If image is wider than tall, adjust width to fit maxImageHeight
                if (imageWidth > maxImageHeight * 2) { // Arbitrary limit to prevent excessively wide images
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
            rowWidth -= padding; // Remove last padding

            if (rowWidth > totalWidth) {
                totalWidth = rowWidth;
            }
            totalHeight += rowHeight + padding;
        });
        if (rows.length > 0) {
            totalHeight -= padding; // Remove last padding only if there are rows
        }

        // Center the moodboard
        const startX = -totalWidth / 2;
        const startY = totalHeight / 2;

        currentY = startY;

        const placeholderTexture = this.createCheckerboardTexture();
        const placeholderMaterial = new THREE.MeshBasicMaterial({ map: placeholderTexture, side: THREE.DoubleSide });

        rows.forEach(rowImages => {
            let rowMaxHeight = 0;
            rowImages.forEach(img => {
                if (img.imageHeight > rowMaxHeight) {
                    rowMaxHeight = img.imageHeight;
                }
            });

            currentX = startX;
            rowImages.forEach(img => {
                const geometry = new THREE.PlaneGeometry(img.imageWidth, img.imageHeight);
                const mesh = new THREE.Mesh(geometry, placeholderMaterial.clone()); // Clone material for each mesh

                mesh.position.x = currentX + img.imageWidth / 2;
                mesh.position.y = currentY - img.imageHeight / 2;
                mesh.position.z = 0;
                mesh.name = img.source.name; // Assign name for easy lookup

                // Set texture repeat based on mesh dimensions and desired checkerboard unit size
                mesh.material.map.repeat.set(img.imageWidth / checkerboardUnitSize, img.imageHeight / checkerboardUnitSize);
                mesh.material.map.needsUpdate = true;
                
                this.scene.add(mesh);
                this.moodboardImages.push(mesh); // Still push to this array for ImageZoom
                this.moodboardImageMeshes[img.source.name] = mesh; // Store by name
                
                currentX += img.imageWidth + padding;
            });
            currentY -= (rowMaxHeight + padding);
        });

        this.moodboardWidth = totalWidth;
        this.moodboardHeight = totalHeight;
    }

    updateMoodboardImage(imageName, texture) {
        const mesh = this.moodboardImageMeshes[imageName];
        if (mesh) {
            console.log(`Moodboard: Found mesh for ${imageName}. Updating material.`); // Debug log
            
            try {
                // Validate texture
                if (!texture || !texture.isTexture) {
                    console.error(`Moodboard: Invalid texture for ${imageName}`);
                    return false;
                }
                
                // Configure texture properly
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.flipY = true; // For web textures, typically true is needed
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.needsUpdate = true;
                
                // Create a new material with the loaded texture
                const newMaterial = new THREE.MeshBasicMaterial({ 
                    map: texture, 
                    side: THREE.DoubleSide 
                });
                
                // Dispose of the old material to prevent memory leaks
                if (mesh.material && mesh.material.map !== texture) {
                    mesh.material.dispose();
                }
                
                // Apply the new material
                mesh.material = newMaterial;
                
                console.log(`Moodboard: Successfully updated texture for ${imageName}`); // Debug log
                return true;
            } catch (err) {
                console.error(`Moodboard: Error updating material for ${imageName}:`, err);
                return false;
            }
        } else {
            console.warn(`Moodboard: Mesh not found for image: ${imageName}`); // Debug log
            return false;
        }
    }
}
