// Import external Libraries
import * as THREE from 'three'

// Import Modules
import { Experience } from "./../../modules/Experience.mjs"

// ---------- ---------- ---------- ---------- ---------- //
// R O T A T I N G   C U B E //
// ---------- ---------- ---------- ---------- ---------- //

export class RotatingCube
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        this.setCube()
    }

    setCube()
    {
        const geometry = new THREE.BoxGeometry(2, 2, 2)

        const materials = [
            new THREE.MeshBasicMaterial({ color: 0xff0000 }), // right
            new THREE.MeshBasicMaterial({ color: 0x00ff00 }), // left
            new THREE.MeshBasicMaterial({ color: 0x0000ff }), // top
            new THREE.MeshBasicMaterial({ color: 0xffff00 }), // bottom
            new THREE.MeshBasicMaterial({ color: 0x00ffff }), // front
            new THREE.MeshBasicMaterial({ color: 0xff00ff })  // back
        ]

        this.cube = new THREE.Mesh(geometry, materials)
        this.scene.add(this.cube)
    }

    update()
    {
        if (this.cube) {
            this.cube.rotation.x += 0.01
            this.cube.rotation.y += 0.01
        }
    }
}
