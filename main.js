import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/controls/OrbitControls.js';
import { SimplexNoise } from 'https://cdn.jsdelivr.net/npm/three@0.159.0/examples/jsm/math/SimplexNoise.js';

class TopographicalMap {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Setup camera position
        this.camera.position.z = 5;
        this.camera.position.y = 2;

        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Add noise generator
        this.noise = new SimplexNoise();
        
        // Create terrain
        this.createTerrain();

        // Add lights
        this.addLights();

        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Setup SVG export
        document.getElementById('downloadSVG').addEventListener('click', () => this.exportSVG());

        // Setup generate button
        document.getElementById('generateMap').addEventListener('click', () => this.generateNewMap());
    }

    createTerrain() {
        const geometry = new THREE.PlaneGeometry(10, 10, 100, 100);
        const material = new THREE.MeshPhongMaterial({
            color: 0x808080,
            wireframe: true,
        });

        this.seed = Math.random() * 1000;
        
        // Generate height map
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            vertices[i + 2] = this.generateHeight(x, y);
        }

        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.scene.add(this.terrain);
    }

    generateHeight(x, y) {
        // Create more interesting terrain with multiple octaves of noise
        const scale = 0.5;
        let height = 0;
        
        // Add several layers of noise at different frequencies
        height += this.noise.noise(x * scale + this.seed, y * scale + this.seed) * 1.0;
        height += this.noise.noise(x * scale * 2 + this.seed, y * scale * 2 + this.seed) * 0.5;
        height += this.noise.noise(x * scale * 4 + this.seed, y * scale * 4 + this.seed) * 0.25;
        
        return height;
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    exportSVG() {
        // Project 3D points to 2D
        const svgPoints = this.projectToSVG();
        
        // Create SVG content
        const svgContent = this.generateSVG(svgPoints);
        
        // Download SVG file
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'topographical-map.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    projectToSVG() {
        const points = [];
        const geometry = this.terrain.geometry;
        const vertices = geometry.attributes.position.array;
        const matrix = this.terrain.matrixWorld;
        
        for (let i = 0; i < vertices.length; i += 3) {
            const vector = new THREE.Vector3(
                vertices[i],
                vertices[i + 1],
                vertices[i + 2]
            );
            vector.applyMatrix4(matrix);
            vector.project(this.camera);
            
            points.push({
                x: (vector.x + 1) * window.innerWidth / 2,
                y: (-vector.y + 1) * window.innerHeight / 2,
                z: vector.z
            });
        }
        
        return points;
    }

    generateSVG(points) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        let paths = '';
        const geometry = this.terrain.geometry;
        const indices = geometry.index.array;
        
        for (let i = 0; i < indices.length; i += 3) {
            const a = points[indices[i]];
            const b = points[indices[i + 1]];
            const c = points[indices[i + 2]];
            
            if (this.isTriangleVisible(a, b, c)) {
                paths += `M${a.x},${a.y} L${b.x},${b.y} L${c.x},${c.y} Z `;
            }
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <path d="${paths}" stroke="black" fill="none" stroke-width="0.5"/>
            </svg>`;
    }

    isTriangleVisible(a, b, c) {
        return a.z < 1 && b.z < 1 && c.z < 1;
    }

    generateNewMap() {
        // Generate new seed for randomization
        this.seed = Math.random() * 1000;
        this.updateTerrain();
    }

    updateTerrain() {
        const vertices = this.terrain.geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            vertices[i + 2] = this.generateHeight(x, y);
        }
        this.terrain.geometry.attributes.position.needsUpdate = true;
    }
}

// Initialize the app
new TopographicalMap(); 