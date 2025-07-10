import * as THREE from 'three';

/**
 * TextureConfigurator Module
 * 
 * Handles the configuration of Three.js textures for optimal display
 * in the moodboard application.
 */
export class TextureConfigurator {
    /**
     * Configures a texture with the appropriate settings for moodboard display
     * @param {THREE.Texture} texture - The texture to configure
     * @returns {THREE.Texture} The configured texture
     */
    static configure(texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = true;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        
        return texture;
    }

    /**
     * Creates a texture loader instance
     * @returns {THREE.TextureLoader} A new texture loader
     */
    static createLoader() {
        return new THREE.TextureLoader();
    }
}
