import * as THREE from 'three';

export class PanControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = new THREE.Vector3(); // Camera will look at this point

        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    }

    enable() {
        this.domElement.addEventListener('mousedown', this.onMouseDown, false);
        this.domElement.addEventListener('mousemove', this.onMouseMove, false);
        this.domElement.addEventListener('mouseup', this.onMouseUp, false);
        this.domElement.addEventListener('mouseleave', this.onMouseUp, false); // Stop dragging if mouse leaves canvas
    }

    disable() {
        this.domElement.removeEventListener('mousedown', this.onMouseDown, false);
        this.domElement.removeEventListener('mousemove', this.onMouseMove, false);
        this.domElement.removeEventListener('mouseup', this.onMouseUp, false);
        this.domElement.removeEventListener('mouseleave', this.onMouseUp, false);
    }

    onMouseDown(event) {
        this.isDragging = true;
        this.previousMousePosition.x = event.clientX;
        this.previousMousePosition.y = event.clientY;
    }

    onMouseMove(event) {
        if (!this.isDragging) return;

        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;

        // Adjust sensitivity as needed
        const sensitivity = 0.2; // Increased sensitivity

        // Move the camera and its target together for panning
        this.camera.position.x -= deltaX * sensitivity;
        this.camera.position.y += deltaY * sensitivity; // Invert Y for intuitive vertical panning

        this.target.x -= deltaX * sensitivity;
        this.target.y += deltaY * sensitivity;

        this.previousMousePosition.x = event.clientX;
        this.previousMousePosition.y = event.clientY;
    }

    onMouseUp() {
        this.isDragging = false;
    }

    update() {
        this.camera.lookAt(this.target);
    }
}
