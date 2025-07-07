// Import external Libraries
import * as THREE from 'three'

// MODULES
import { Experience } from '../../modules/Experience.mjs'
import { PanControls } from './PanControls.mjs'
import { ImageZoom } from './ImageZoom.mjs'
import { Moodboard } from './Moodboard.mjs'
import { ProgressiveLoader } from './ProgressiveLoader.mjs'
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

        this.panControls = null
        this.ImageZoom = null
        this.moodboard = null
        this.progressiveLoader = null

        // WORLD CREATION SETUP
        /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
        this.moodboard = new Moodboard(this.scene);
        
        // RENDERER & CAMERA SETUP
        /* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
        this.sceneRenderSettings();

        // Initialize PanControls immediately so user can interact
        this.panControls = new PanControls(this.camera, this.canvas, this.moodboard.moodboardWidth, this.moodboard.moodboardHeight);
        this.panControls.enable();

        // Initialize ImageZoom
        this.ImageZoom = new ImageZoom(this.camera, this.scene, this.canvas, this.moodboard.moodboardImages, this.panControls);
        
        // Start progressive loading
        this.progressiveLoader = new ProgressiveLoader(this.resources, this.moodboard, this.experience);
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
