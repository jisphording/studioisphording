// S O U R C E S
/* ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- */
//
// Storage Array

const texFolder = '../../assets/three/textures/';
const modelsFolder = '../../assets/three/meshes/';

export default [
    {
        name: 'environmentMapTexture',
        type: 'cubeTexture',
        path:
        [
            texFolder + 'environmentMaps/0/px.jpg',
            texFolder + 'environmentMaps/0/nx.jpg',
            texFolder + 'environmentMaps/0/py.jpg',
            texFolder + 'environmentMaps/0/ny.jpg',
            texFolder + 'environmentMaps/0/pz.jpg',
            texFolder + 'environmentMaps/0/nz.jpg'
        ]
    },
    // Loading the Monitor
    {
        name: 'DisplayAppleXDR',
        type: 'gltfModel',
        path: modelsFolder + 'gltf/AppleDisplayXDRSingle.glb'
    },
]