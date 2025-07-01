// Import external Libraries
import * as THREE from 'three'

// MODULES
import { Experience } from '../../modules/Experience.mjs'
import { PanControls } from './PanControls.mjs'
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

            console.log('World: All resources have been loaded.')
        })
    }

    createMoodboard()
    {
        const imageSources = sources.filter(source => source.type === 'texture' && source.name.startsWith('moodboardImage_'));
        const aspectRatio = 16 / 9; // Assuming a common aspect ratio for images, adjust as needed
        const imageWidth = 6; // Image size
        const imageHeight = imageWidth / aspectRatio;
        const padding = 1; // Reduced padding
        const imagesPerRow = 5;

        let xOffset = 0;
        let yOffset = 0;

        imageSources.forEach((source, index) => {
            const texture = this.resources.items[source.name];
            if (texture) {
                texture.colorSpace = THREE.SRGBColorSpace; // Set texture color space
                const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                const geometry = new THREE.PlaneGeometry(imageWidth, imageHeight);
                const mesh = new THREE.Mesh(geometry, material);

                const row = Math.floor(index / imagesPerRow);
                const col = index % imagesPerRow;

                mesh.position.x = (col * (imageWidth + padding)) - ((imagesPerRow - 1) * (imageWidth + padding)) / 2;
                mesh.position.y = -(row * (imageHeight + padding)) + ((imageSources.length / imagesPerRow) * (imageHeight + padding)) / 2;
                mesh.position.z = 0; // Lay them flat on the XZ plane

                this.scene.add(mesh);
                this.moodboardImages.push(mesh);
            }
        });
    }

    sceneRenderSettings()
    {
        // Renderer
        let rendererInstance = this.experience.renderer.instance

        rendererInstance.outputColorSpace = THREE.SRGBColorSpace; // Set renderer output color space
        rendererInstance.setClearColor( 0xdfe1e3, 1 )

        // Camera
        this.camera.instance.position.set( 0, 0, 100 ) // Look down from above, increased distance
        this.camera.instance.lookAt(0, 0, 0) // Look at the center of the canvas
        this.camera.controls.enabled = false; // Disable default OrbitControls
        
        // Initialize PanControls
        this.panControls = new PanControls(this.camera.instance, this.canvas);
        this.panControls.enable();

        // Override the default camera update to prevent OrbitControls from interfering
        this.camera.update = () => {};
    }

    // U P D A T E
    /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
    
    update()
    {
        // Update PanControls
        if (this.panControls) {
            this.panControls.update();
        }
    }
}
