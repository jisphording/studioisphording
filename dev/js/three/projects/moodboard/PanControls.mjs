import * as THREE from 'three';

export class PanControls {
    constructor(camera, domElement, moodboardWidth, moodboardHeight) {
        this.camera = camera;
        this.domElement = domElement;
        this.moodboardWidth = moodboardWidth;
        this.moodboardHeight = moodboardHeight;
        this.target = new THREE.Vector3(); // Camera will look at this point
        this.mouse = new THREE.Vector2(); // Normalized mouse coordinates (-1 to 1)
        this.targetPan = new THREE.Vector3(); // Target position for smooth panning

        // Camera settings
        this.camera.setPosition(0, 0, 150);
        this.camera.setTarget(0, 0, 0);
        this.camera.controls.enabled = false;
        this.camera.update = () => {}; // Override the default camera update

        // Dynamically set panIntensity and zoom limits based on moodboard dimensions
        // These values might need fine-tuning based on desired feel
        const maxDimension = Math.max(this.moodboardWidth, this.moodboardHeight);
        this.panIntensity = maxDimension * 0.5; // Adjust based on the largest dimension
        this.damping = 0.1; // Increased damping for smoother movement
        this.baseZ = this.camera.instance.position.z; // Store initial Z position for zoom target

        this.zoomIntensity = 0.1; // How much the camera zooms per scroll tick
        this.minZoom = maxDimension * 1; // Closest zoom, should show most of the moodboard
        this.maxZoom = maxDimension * 3; // Furthest zoom
        this.baseZ = Math.max(this.minZoom, Math.min(this.maxZoom, this.baseZ)); // Ensure initial baseZ is within limits

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this); // Bind onMouseWheel to the instance
        this.resetPan = this.resetPan.bind(this); // Bind resetPan to the instance
    }

    enable() {
        this.domElement.addEventListener('mousemove', this.onMouseMove, false);
        this.domElement.addEventListener('mouseleave', this.resetPan, false); // Reset pan when mouse leaves
        this.domElement.addEventListener('wheel', this.onMouseWheel, { passive: false }); // Add wheel listener
    }

    disable() {
        this.domElement.removeEventListener('mousemove', this.onMouseMove, false);
        this.domElement.removeEventListener('mouseleave', this.resetPan, false);
        this.domElement.removeEventListener('wheel', this.onMouseWheel, false); // Remove wheel listener
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

    onMouseWheel(event) {
        event.preventDefault(); // Prevent page scrolling

        // Adjust baseZ based on scroll direction
        this.baseZ += event.deltaY * this.zoomIntensity;

        // Clamp baseZ within min/max zoom limits
        this.baseZ = Math.max(this.minZoom, Math.min(this.maxZoom, this.baseZ));
    }

    resetPan() {
        // Reset target pan when mouse leaves the canvas
        this.targetPan.set(0, 0, 0);
    }

    update() {
        // Smoothly interpolate the target towards the mouse-driven targetPan
        this.target.x += (this.targetPan.x - this.target.x) * this.damping;
        this.target.y += (this.targetPan.y - this.target.y) * this.damping;

        // Smoothly interpolate camera's Z position towards the new baseZ (zoom target)
        const newZ = this.camera.instance.position.z + (this.baseZ - this.camera.instance.position.z) * this.damping;
        this.camera.setPosition(this.target.x, this.target.y, newZ);
        this.camera.setTarget(this.target.x, this.target.y, 0);
    }
}
