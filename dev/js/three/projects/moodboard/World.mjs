// Import external Libraries
import * as THREE from 'three'

// MODULES
import { Experience } from '../../modules/Experience.mjs'
import { PanControls } from './PanControls.mjs'
import { ImageZoom } from './ImageZoom.mjs'
import sources from './World_Sources.mjs'

// ---------- ---------- ---------- ---------- ---------- //
// W O R L D //
// ---------- ---------- ---------- ---------- ---------- //
//
// Building and managing the world that is used by the Experience and all it's assets.

export class World
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.camera = this.experience.camera
        this.canvas = this.experience.canvas

        this.moodboardImages = []
        this.panControls = null
        this.ImageZoom = null

        // Wait until resources have been loaded and are ready
        this.resources.on( 'resourcesReady', () =>
        {
            // WORLD CREATION SETUP
            /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
            // Gathering all the files needed to assemble the game world
            this.createMoodboard()
            
            // ENTITIES & ACTORS SETUP
            /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
            // None
            
            // ENVIRONMENT & LIGHT SETUP
            /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
            // The environment has to added last, because it receives additional
            // settings that have to be applied to the whole scene and all it's entities.
            // Alas, its important that the environment is loaded/updated last
            // this.environment = new Environment()

            // RENDERER & CAMERA SETUP
            /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
            this.sceneRenderSettings()

            // Initialize PanControls after moodboard is created and dimensions are known
            this.panControls = new PanControls(this.camera, this.canvas, this.moodboardWidth, this.moodboardHeight);
            this.panControls.enable();

            // Initialize ImageZoom
            this.ImageZoom = new ImageZoom(this.camera, this.scene, this.canvas, this.moodboardImages, this.panControls);

            console.log('World: All resources have been loaded.')
        })
    }

    createMoodboard()
    {
        const imageSources = sources.filter(source => source.type === 'texture' && source.name.startsWith('moodboardImage_'));
        const maxImageHeight = 6; // Max height for images to maintain visual consistency
        const padding = 1; // Padding between images
        const imagesPerRow = 5;

        let currentX = 0;
        let currentY = 0;
        let rowMaxHeight = 0;
        let currentRow = 0;

        // Calculate total width and height of the moodboard
        let totalWidth = 0;
        let totalHeight = 0;

        const rows = [];
        let currentRowImages = [];

        imageSources.forEach((source, index) => {
            const texture = this.resources.items[source.name];
            if (texture && source.width && source.height) { // Use source.width and source.height
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
                currentRowImages.push({ source, texture, imageWidth, imageHeight });
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

        rows.forEach(rowImages => {
            let rowMaxHeight = 0;
            rowImages.forEach(img => {
                if (img.imageHeight > rowMaxHeight) {
                    rowMaxHeight = img.imageHeight;
                }
            });

            currentX = startX;
            rowImages.forEach(img => {
                const texture = img.texture;
                texture.colorSpace = THREE.SRGBColorSpace;
                const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                const geometry = new THREE.PlaneGeometry(img.imageWidth, img.imageHeight);
                const mesh = new THREE.Mesh(geometry, material);

                mesh.position.x = currentX + img.imageWidth / 2;
                mesh.position.y = currentY - img.imageHeight / 2;
                mesh.position.z = 0;

                this.scene.add(mesh);
                this.moodboardImages.push(mesh);

                currentX += img.imageWidth + padding;
            });
            currentY -= (rowMaxHeight + padding);
        });

        this.moodboardWidth = totalWidth;
        this.moodboardHeight = totalHeight;
    }

    sceneRenderSettings()
    {
        // Renderer
        let rendererInstance = this.experience.renderer.instance

        rendererInstance.outputColorSpace = THREE.SRGBColorSpace; // Set renderer output color space
        rendererInstance.setClearColor( 0xdfe1e3, 1 )
    }

    // U P D A T E
    /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
    
    update()
    {
        // Update PanControls
        if (this.panControls) {
            this.panControls.update();
        }

        // Update ImageZoom
        if (this.ImageZoom) {
            this.ImageZoom.update();
        }
    }
}
