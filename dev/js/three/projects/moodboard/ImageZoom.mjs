import * as THREE from 'three';

export class ImageZoom {
    constructor(camera, scene, canvas, moodboardImages) {
        this.camera = camera;
        this.scene = scene;
        this.canvas = canvas;
        this.moodboardImages = moodboardImages;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.intersected = null;

        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));

        // Add a target scale for each image
        this.moodboardImages.forEach(image => {
            image.targetScale = new THREE.Vector3(1, 1, 1);
        });
    }

    onMouseMove(event) {
        // Calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    update() {
        this.raycaster.setFromCamera(this.mouse, this.camera.instance);

        const intersects = this.raycaster.intersectObjects(this.moodboardImages);

        if (intersects.length > 0) {
            this.intersected = intersects[0].object;
        } else {
            this.intersected = null;
        }

        this.moodboardImages.forEach(image => {
            if (image === this.intersected) {
                image.targetScale.set(1.2, 1.2, 1.2);
            } else {
                image.targetScale.set(1, 1, 1);
            }

            // Smoothly interpolate the scale
            image.scale.lerp(image.targetScale, 0.1);
        });
    }
}
