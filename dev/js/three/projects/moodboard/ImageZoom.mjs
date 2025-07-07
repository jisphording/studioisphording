import * as THREE from 'three';

export class ImageZoom {
    constructor(camera, scene, canvas, moodboardImages, panControls) {
        this.camera = camera;
        this.scene = scene;
        this.canvas = canvas;
        this.moodboardImages = moodboardImages;
        this.panControls = panControls;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.intersected = null;

        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('click', this.onClick.bind(this));

        // Add a target scale for each image
        this.moodboardImages.forEach(image => {
            image.targetScale = new THREE.Vector3(1, 1, 1);
        });
    }

    onClick() {
        if (this.intersected) {
            this.showLightbox(this.intersected);
        }
    }

    showLightbox(image) {
        this.panControls.disable();

        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';

        const img = document.createElement('img');
        img.className = 'lightbox-image';
        img.src = image.material.map.image.src;

        const close = document.createElement('div');
        close.className = 'lightbox-close';
        close.innerHTML = '&times;';

        overlay.appendChild(img);
        overlay.appendChild(close);
        document.body.appendChild(overlay);

        const closeLightbox = () => {
            document.body.removeChild(overlay);
            this.panControls.enable();
        };

        close.addEventListener('click', closeLightbox);
        overlay.addEventListener('click', closeLightbox);
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
