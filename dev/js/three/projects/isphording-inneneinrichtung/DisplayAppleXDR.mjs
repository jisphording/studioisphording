// Import external Libraries
import * as THREE from 'three'

// Import Modules
import { Experience } from "./../../modules/Experience.mjs"

// ---------- ---------- ---------- ---------- ---------- //
// D I S P L A Y   A P P L E   X D R //
// ---------- ---------- ---------- ---------- ---------- //

export class DisplayAppleXDR
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        // Retrieve correct resource
        this.resource = this.resources.items.DisplayAppleXDR
    
        this.setModel()
    }

    setModel()
    {
        this.model = this.resource.scene

        // Center Pivot
        const bbox = new THREE.Box3().setFromObject( this.model )
        const offset = new THREE.Vector3()
        bbox.getCenter( offset ).negate()
        this.model.children[0].position.set( offset.x, offset.y, offset.z )

        // Custom Scene Transforms
        this.model.scale.set( 2, 2, 2)
        this.model.rotation.y = Math.PI // Rotate 180 degrees

        // Add to Scene
        this.scene.add( this.model )
    }
}
