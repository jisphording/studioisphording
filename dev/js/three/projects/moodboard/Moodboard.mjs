// Import external Libraries
import * as THREE from 'three';

// MODULES
import sources from './World_Sources.mjs';
import { createCheckerboardTexture } from './Textures.mjs';
import { calculateMoodboardLayout } from './MoodboardLayoutCalculator.mjs';
import { buildMoodboardMeshes } from './MoodboardMeshBuilder.mjs';

// ---------- ---------- ---------- ---------- ---------- //
// M O O D B O A R D //
// ---------- ---------- ---------- ---------- ---------- //
//
// Manages the layout and visual representation of the moodboard images.

export class Moodboard {
    constructor(scene) {
        this.scene = scene;
        this.moodboardImages = [];
        this.moodboardImageMeshes = {}; // Store meshes by source name for easy access
        this.moodboardWidth = 0;
        this.moodboardHeight = 0;

        // Create the moodboard layout with placeholder textures immediately
        this.initializeMoodboardLayout();
    }

    initializeMoodboardLayout() {
        const imageSources = sources.filter(source => source.type === 'texture' && source.name.startsWith('moodboardImage_'));
        const maxImageHeight = 6; // Max height for images to maintain visual consistency
        const padding = 1; // Padding between images
        const imagesPerRow = 5;
        const checkerboardUnitSize = 0.5; // Desired world unit size for each checkerboard square

        const layoutData = calculateMoodboardLayout(imageSources, maxImageHeight, padding, imagesPerRow);

        const placeholderTexture = createCheckerboardTexture();
        const placeholderMaterial = new THREE.MeshBasicMaterial({ map: placeholderTexture, side: THREE.DoubleSide });

        const { moodboardImages, moodboardImageMeshes } = buildMoodboardMeshes(
            this.scene,
            layoutData,
            placeholderMaterial,
            checkerboardUnitSize,
            padding
        );

        this.moodboardImages = moodboardImages;
        this.moodboardImageMeshes = moodboardImageMeshes;
        this.moodboardWidth = layoutData.totalWidth;
        this.moodboardHeight = layoutData.totalHeight;
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
                mesh.material.needsUpdate = true;
                
                // Force mesh update
                mesh.needsUpdate = true;
                
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
