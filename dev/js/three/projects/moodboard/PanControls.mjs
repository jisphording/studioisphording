import * as THREE from 'three';

export class PanControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = new THREE.Vector3(); // Camera will look at this point
        this.mouse = new THREE.Vector2(); // Normalized mouse coordinates (-1 to 1)
        this.targetPan = new THREE.Vector3(); // Target position for smooth panning

        this.panIntensity = 7.5; // Increased intensity for more noticeable pan
        this.damping = 0.1; // Increased damping for smoother movement
        this.baseZ = this.camera.position.z; // Store initial Z position to prevent Z-fighting

        this.onMouseMove = this.onMouseMove.bind(this);
        this.resetPan = this.resetPan.bind(this); // Bind resetPan to the instance
    }

    enable() {
        this.domElement.addEventListener('mousemove', this.onMouseMove, false);
        this.domElement.addEventListener('mouseleave', this.resetPan, false); // Reset pan when mouse leaves
    }

    disable() {
        this.domElement.removeEventListener('mousemove', this.onMouseMove, false);
        this.domElement.removeEventListener('mouseleave', this.resetPan, false);
    }

    onMouseMove(event) {
        // Normalize mouse coordinates to -1 to 1
        this.mouse.x = (event.clientX / this.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.domElement.clientHeight) * 2 + 1;

        // Calculate target pan based on mouse position
        // We want to pan the target, not the camera directly, to keep the camera looking at the center
        this.targetPan.x = -this.mouse.x * this.panIntensity;
        this.targetPan.y = -this.mouse.y * this.panIntensity;
    }

    resetPan() {
        // Reset target pan when mouse leaves the canvas
        this.targetPan.set(0, 0, 0);
    }

    update() {
        // Smoothly interpolate the target towards the mouse-driven targetPan
        this.target.x += (this.targetPan.x - this.target.x) * this.damping;
        this.target.y += (this.targetPan.y - this.target.y) * this.damping;

        // Keep camera's Z position constant or smoothly return to baseZ
        this.camera.position.z += (this.baseZ - this.camera.position.z) * this.damping;

        // Update camera position relative to the target
        this.camera.position.x = this.target.x;
        this.camera.position.y = this.target.y;

        this.camera.lookAt(this.target);
    }
}
