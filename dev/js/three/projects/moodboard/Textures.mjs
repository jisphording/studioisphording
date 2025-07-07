import * as THREE from 'three';

export function createCheckerboardTexture() {
    const size = 16; // Size of each checkerboard square in pixels for the texture
    const canvas = document.createElement('canvas');
    canvas.width = size * 2;
    canvas.height = size * 2;
    const context = canvas.getContext('2d');

    context.fillStyle = '#e0e0e0'; // Light grey 1
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#c0c0c0'; // Light grey 2
    context.fillRect(0, 0, size, size);
    context.fillRect(size, size, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true; // Ensure the texture updates after setting wrap properties
    return texture;
}
