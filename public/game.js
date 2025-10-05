import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Game state
const socket = io();
let scene, camera, renderer, controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const MOVE_SPEED = 100.0;
const PLAYER_HEIGHT = 1.6;
const JUMP_VELOCITY = 8.0;
const GRAVITY = 20.0;

// Multiplayer
const otherPlayers = {};
let isSitting = false;
let sittingPosition = null;

// Video
let videoScreen, videoTexture, videoElement;
let videoPlane;

// Objects
let sofa, sofaInteractionZone;

// Animation
let clock;

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1410);
    scene.fog = new THREE.Fog(0x1a1410, 0, 30);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, PLAYER_HEIGHT, 3);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 3);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(0xffffff, 2, 50);
    mainLight.position.set(0, 5, 0);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const warmLight = new THREE.PointLight(0xffaa77, 1, 20);
    warmLight.position.set(-3, 2, -5);
    scene.add(warmLight);

    // Back corner lights for ambiance
    const backLeft = new THREE.PointLight(0x6666ff, 0.8, 15);
    backLeft.position.set(-8, 2, 8);
    scene.add(backLeft);

    const backRight = new THREE.PointLight(0xff6666, 0.8, 15);
    backRight.position.set(8, 2, 8);
    scene.add(backRight);

    // Floor - warm wood/carpet look
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xc9b89a,
        roughness: 0.9,
        metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    createWalls();

    // Sofa
    createSofa();

    // Video screen
    createVideoScreen();

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(20, 20);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5dc,
        roughness: 0.9
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);

    // Add ceiling decoration (white panel)
    const panelGeometry = new THREE.PlaneGeometry(8, 6);
    const panelMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.rotation.x = Math.PI / 2;
    panel.position.y = 3.95;
    scene.add(panel);

    // Add simple but beautiful decorations
    createSimpleDecor();

    // Controls
    controls = new PointerLockControls(camera, renderer.domElement);

    renderer.domElement.addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        console.log('Pointer locked');
    });

    controls.addEventListener('unlock', () => {
        console.log('Pointer unlocked');
    });

    // Keyboard controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Window resize
    window.addEventListener('resize', onWindowResize);

    // Setup multiplayer
    setupMultiplayer();

    // Setup video controls
    setupVideoControls();

    // Initialize clock
    clock = new THREE.Clock();
}

function createWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355,
        roughness: 0.9,
        metalness: 0.1
    });

    // Back wall (behind video screen)
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(20, 4, 0.2),
        wallMaterial
    );
    backWall.position.set(0, 2, -10);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Front wall
    const frontWall = new THREE.Mesh(
        new THREE.BoxGeometry(20, 4, 0.2),
        wallMaterial
    );
    frontWall.position.set(0, 2, 10);
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Left wall
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 4, 20),
        wallMaterial
    );
    leftWall.position.set(-10, 2, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 4, 20),
        wallMaterial
    );
    rightWall.position.set(10, 2, 0);
    rightWall.receiveShadow = true;
    scene.add(rightWall);
}

function createSofa() {
    sofa = new THREE.Group();

    // Sofa base
    const baseGeometry = new THREE.BoxGeometry(3, 0.4, 1.5);
    const sofaMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.7
    });
    const base = new THREE.Mesh(baseGeometry, sofaMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    sofa.add(base);

    // Sofa backrest
    const backGeometry = new THREE.BoxGeometry(3, 1, 0.3);
    const back = new THREE.Mesh(backGeometry, sofaMaterial);
    back.position.set(0, 1, -0.6);
    back.castShadow = true;
    sofa.add(back);

    // Armrests
    const armGeometry = new THREE.BoxGeometry(0.3, 0.8, 1.5);
    const leftArm = new THREE.Mesh(armGeometry, sofaMaterial);
    leftArm.position.set(-1.35, 0.6, 0);
    leftArm.castShadow = true;
    sofa.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, sofaMaterial);
    rightArm.position.set(1.35, 0.6, 0);
    rightArm.castShadow = true;
    sofa.add(rightArm);

    sofa.position.set(0, 0, 2);
    scene.add(sofa);

    // Create interaction zone
    const zoneGeometry = new THREE.BoxGeometry(3.5, 2, 2);
    const zoneMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0
    });
    sofaInteractionZone = new THREE.Mesh(zoneGeometry, zoneMaterial);
    sofaInteractionZone.position.copy(sofa.position);
    sofaInteractionZone.position.y = 1;
    scene.add(sofaInteractionZone);
}

function createVideoScreen() {
    // Video element - add to DOM
    videoElement = document.createElement('video');
    videoElement.setAttribute('crossorigin', 'anonymous');
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.style.display = 'none';
    document.body.appendChild(videoElement);

    // Screen placeholder (will add video texture when video loads)
    const screenGeometry = new THREE.PlaneGeometry(8, 4.5);
    const screenMaterial = new THREE.MeshBasicMaterial({
        color: 0x111111,
        side: THREE.DoubleSide  // Show on both sides
    });

    videoPlane = new THREE.Mesh(screenGeometry, screenMaterial);
    videoPlane.position.set(0, 2.5, 9.8);
    videoPlane.rotation.y = Math.PI;
    scene.add(videoPlane);

    // Screen frame
    const frameGeometry = new THREE.BoxGeometry(8.3, 4.8, 0.2);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 2.5, 9.7);
    scene.add(frame);
}

function createBedroomDecor() {
    // Create realistic hanging ivy vines with proper leaf shapes
    createDetailedVines();
    createDetailedVines(); // More vines
    createDetailedVines(); // Even more vines

    // Create beautiful string lights
    createFairyLights();
    createFairyLights(); // More lights on different walls

    // Wall decorations
    createWallArt();
    createWallArt(); // More art

    // Floor decorations
    createRugAndPillows();

    // Corner plants
    createCornerPlants();
    createCornerPlants();

    // Shelves with items
    createWallShelves();
}

function createDetailedVines() {
    // Create multiple ivy strands that drape naturally
    for (let i = 0; i < 8; i++) {
        const vine = new THREE.Group();

        // Main vine stem
        const stemCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.1, -0.5, 0.05),
            new THREE.Vector3(-0.05, -1, 0.1),
            new THREE.Vector3(0.1, -1.5, 0),
            new THREE.Vector3(0, -2, -0.05),
            new THREE.Vector3(0.15, -2.5, 0.1)
        ]);

        const stemGeometry = new THREE.TubeGeometry(stemCurve, 20, 0.01, 8, false);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d5c2a,
            roughness: 0.9
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        vine.add(stem);

        // Add heart-shaped leaves along the vine
        for (let j = 0; j < 15; j++) {
            const leafGroup = new THREE.Group();

            // Heart-shaped leaf using two circles
            const leafSize = 0.12 + Math.random() * 0.08;
            const leftLobe = new THREE.CircleGeometry(leafSize * 0.6, 8);
            const rightLobe = new THREE.CircleGeometry(leafSize * 0.6, 8);

            const leafMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.25 + Math.random() * 0.05, 0.6, 0.25),
                side: THREE.DoubleSide,
                roughness: 0.7,
                metalness: 0.1
            });

            const left = new THREE.Mesh(leftLobe, leafMaterial);
            left.position.x = -leafSize * 0.3;
            left.position.y = leafSize * 0.2;
            leafGroup.add(left);

            const right = new THREE.Mesh(rightLobe, leafMaterial);
            right.position.x = leafSize * 0.3;
            right.position.y = leafSize * 0.2;
            leafGroup.add(right);

            // Tip of the leaf
            const tip = new THREE.CircleGeometry(leafSize * 0.4, 6);
            const tipMesh = new THREE.Mesh(tip, leafMaterial);
            tipMesh.position.y = -leafSize * 0.4;
            leafGroup.add(tipMesh);

            // Position along stem
            const t = j / 15;
            const pos = stemCurve.getPoint(t);
            leafGroup.position.copy(pos);
            leafGroup.rotation.z = Math.random() * Math.PI * 2;
            leafGroup.rotation.x = (Math.random() - 0.5) * 0.5;

            vine.add(leafGroup);
        }

        // Position vines around the room
        const positions = [
            { x: -9.8, y: 3.9, z: -9 + i * 2.5, rotation: 0 },
            { x: 9.8, y: 3.9, z: -9 + i * 2.5, rotation: Math.PI },
            { x: -9 + i * 2.5, y: 3.9, z: 9.8, rotation: Math.PI / 2 },
            { x: -9 + i * 2.5, y: 3.9, z: -9.8, rotation: -Math.PI / 2 }
        ];

        const pos = positions[i % 4];
        vine.position.set(pos.x, pos.y, pos.z);
        vine.rotation.y = pos.rotation;
        scene.add(vine);
    }
}

function createFairyLights() {
    // Create draped string lights with realistic wire and bulbs
    const createLightStrand = (startPos, endPos, numBulbs) => {
        const strand = new THREE.Group();

        // Create wire using catenary curve (natural droop)
        const midPoint = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
        midPoint.y -= 0.3; // Droop amount

        const wireCurve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
        const wireGeometry = new THREE.TubeGeometry(wireCurve, 32, 0.005, 4, false);
        const wireMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.8
        });
        const wire = new THREE.Mesh(wireGeometry, wireMaterial);
        strand.add(wire);

        // Add bulbs along the wire
        for (let i = 0; i < numBulbs; i++) {
            const t = i / (numBulbs - 1);
            const bulbPos = wireCurve.getPoint(t);

            // Bulb glass
            const bulbGeometry = new THREE.SphereGeometry(0.06, 8, 8);
            const bulbColor = new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 0.3, 0.7);
            const bulbMaterial = new THREE.MeshStandardMaterial({
                color: bulbColor,
                emissive: bulbColor,
                emissiveIntensity: 1.5,
                transparent: true,
                opacity: 0.9
            });
            const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
            bulb.position.copy(bulbPos);
            bulb.position.y -= 0.05; // Hang down slightly
            strand.add(bulb);

            // Point light from every 3rd bulb
            if (i % 3 === 0) {
                const light = new THREE.PointLight(bulbColor, 0.6, 2.5);
                light.position.copy(bulb.position);
                strand.add(light);
            }
        }

        scene.add(strand);
    };

    // Left wall strands
    for (let i = 0; i < 3; i++) {
        createLightStrand(
            new THREE.Vector3(-9.8, 3.7, -8 + i * 6),
            new THREE.Vector3(-9.8, 3.7, -6 + i * 6),
            8
        );
    }

    // Right wall strands
    for (let i = 0; i < 3; i++) {
        createLightStrand(
            new THREE.Vector3(9.8, 3.7, -8 + i * 6),
            new THREE.Vector3(9.8, 3.7, -6 + i * 6),
            8
        );
    }

    // Back wall strands
    for (let i = 0; i < 3; i++) {
        createLightStrand(
            new THREE.Vector3(-8 + i * 6, 3.7, 9.8),
            new THREE.Vector3(-6 + i * 6, 3.7, 9.8),
            8
        );
    }
}

function createWallArt() {
    // Polaroid photos scattered on walls
    const polaroidPositions = [
        { x: -6, y: 2.8, z: -9.9, rot: -0.1 },
        { x: -5.2, y: 2.5, z: -9.9, rot: 0.15 },
        { x: -4.5, y: 3, z: -9.9, rot: -0.08 },
        { x: -3.5, y: 2.6, z: -9.9, rot: 0.2 },
        { x: 6, y: 2.7, z: -9.9, rot: 0.12 },
        { x: 5.3, y: 3.1, z: -9.9, rot: -0.15 },
        { x: 4.6, y: 2.4, z: -9.9, rot: 0.05 }
    ];

    polaroidPositions.forEach(pos => {
        const polaroid = new THREE.Group();

        // White frame
        const frameGeometry = new THREE.PlaneGeometry(0.35, 0.42);
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0xf5f5f5,
            roughness: 0.6
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        polaroid.add(frame);

        // Photo area (slightly inset)
        const photoGeometry = new THREE.PlaneGeometry(0.3, 0.3);
        const photoColors = [0x8b9dc3, 0xddb892, 0xb4a7d6, 0xa8dadc, 0xe9c46a];
        const photoMaterial = new THREE.MeshStandardMaterial({
            color: photoColors[Math.floor(Math.random() * photoColors.length)],
            roughness: 0.8
        });
        const photo = new THREE.Mesh(photoGeometry, photoMaterial);
        photo.position.z = 0.001;
        photo.position.y = 0.03;
        polaroid.add(photo);

        polaroid.position.set(pos.x, pos.y, pos.z);
        polaroid.rotation.z = pos.rot;
        scene.add(polaroid);
    });

    // Vinyl records on walls
    const vinylPositions = [
        { x: -9.9, y: 2.5, z: -2, rotY: Math.PI / 2 },
        { x: -9.9, y: 2.5, z: 1, rotY: Math.PI / 2 },
        { x: 9.9, y: 2.5, z: -3, rotY: -Math.PI / 2 },
        { x: 9.9, y: 2.5, z: 2, rotY: -Math.PI / 2 }
    ];

    vinylPositions.forEach(pos => {
        const vinyl = new THREE.Group();

        // Outer disc
        const discGeometry = new THREE.CircleGeometry(0.35, 32);
        const discMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            roughness: 0.4,
            metalness: 0.3
        });
        const disc = new THREE.Mesh(discGeometry, discMaterial);
        vinyl.add(disc);

        // Label
        const labelGeometry = new THREE.CircleGeometry(0.12, 32);
        const labelColors = [0x8b0000, 0x00008b, 0x8b8b00, 0x8b008b];
        const labelMaterial = new THREE.MeshStandardMaterial({
            color: labelColors[Math.floor(Math.random() * labelColors.length)],
            roughness: 0.7
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.z = 0.001;
        vinyl.add(label);

        vinyl.position.set(pos.x, pos.y, pos.z);
        vinyl.rotation.y = pos.rotY;
        scene.add(vinyl);
    });

    // Tapestry/poster on one wall
    const tapestryGeometry = new THREE.PlaneGeometry(3, 2);
    const tapestryMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a5568,
        roughness: 0.9
    });
    const tapestry = new THREE.Mesh(tapestryGeometry, tapestryMaterial);
    tapestry.position.set(0, 2.5, -9.85);
    scene.add(tapestry);
}

function createRugAndPillows() {
    // Circular rug in front of sofa
    const rugGeometry = new THREE.CircleGeometry(2, 32);
    const rugMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4a574,
        roughness: 1,
        metalness: 0
    });
    const rug = new THREE.Mesh(rugGeometry, rugMaterial);
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.01;
    rug.position.z = 0.5;
    scene.add(rug);

    // Throw pillows on sofa
    const pillowPositions = [
        { x: -0.8, y: 0.7, z: 2, color: 0xe9c46a },
        { x: 0.8, y: 0.7, z: 2, color: 0xf4a261 },
        { x: 0, y: 0.7, z: 2.2, color: 0xe76f51 }
    ];

    pillowPositions.forEach(pos => {
        const pillowGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const pillowMaterial = new THREE.MeshStandardMaterial({
            color: pos.color,
            roughness: 0.8
        });
        const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial);
        pillow.position.set(pos.x, pos.y, pos.z);
        pillow.rotation.z = (Math.random() - 0.5) * 0.3;
        pillow.castShadow = true;
        scene.add(pillow);
    });
}

function createCornerPlants() {
    // Potted plants in corners
    const plantPositions = [
        { x: -9.2, z: -9.2 },
        { x: 9.2, z: -9.2 },
        { x: -9.2, z: 9.2 },
        { x: 9.2, z: 9.2 }
    ];

    plantPositions.forEach(pos => {
        const plant = new THREE.Group();

        // Pot
        const potGeometry = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 16);
        const potMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8
        });
        const pot = new THREE.Mesh(potGeometry, potMaterial);
        pot.position.y = 0.25;
        pot.castShadow = true;
        plant.add(pot);

        // Leaves (multiple branches)
        for (let i = 0; i < 5; i++) {
            const leafStem = new THREE.Group();

            for (let j = 0; j < 8; j++) {
                const leafGeometry = new THREE.ConeGeometry(0.15, 0.4, 4);
                const leafMaterial = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.7, 0.3),
                    roughness: 0.7
                });
                const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                leaf.position.y = 0.6 + j * 0.15;
                leaf.position.x = Math.sin(j) * 0.1;
                leaf.position.z = Math.cos(j) * 0.1;
                leaf.rotation.x = Math.PI / 2;
                leaf.rotation.z = (j / 8) * Math.PI * 2;
                leafStem.add(leaf);
            }

            leafStem.rotation.y = (i / 5) * Math.PI * 2;
            plant.add(leafStem);
        }

        plant.position.set(pos.x, 0, pos.z);
        scene.add(plant);
    });
}

function createWallShelves() {
    // Floating shelves on side walls
    const shelfPositions = [
        { x: -9.8, y: 2.8, z: 0, rotY: Math.PI / 2 },
        { x: 9.8, y: 2.8, z: -1, rotY: -Math.PI / 2 }
    ];

    shelfPositions.forEach(pos => {
        const shelf = new THREE.Group();

        // Shelf board
        const boardGeometry = new THREE.BoxGeometry(1.5, 0.05, 0.25);
        const boardMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B7355,
            roughness: 0.7
        });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        shelf.add(board);

        // Items on shelf
        // Books
        for (let i = 0; i < 3; i++) {
            const bookGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.08);
            const bookColors = [0x8b0000, 0x00008b, 0x006400, 0x8b8b00];
            const bookMaterial = new THREE.MeshStandardMaterial({
                color: bookColors[i % bookColors.length],
                roughness: 0.8
            });
            const book = new THREE.Mesh(bookGeometry, bookMaterial);
            book.position.x = -0.5 + i * 0.2;
            book.position.y = 0.15;
            book.rotation.z = (Math.random() - 0.5) * 0.2;
            shelf.add(book);
        }

        // Small plant
        const smallPotGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.12, 12);
        const smallPotMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4a574,
            roughness: 0.8
        });
        const smallPot = new THREE.Mesh(smallPotGeometry, smallPotMaterial);
        smallPot.position.x = 0.5;
        smallPot.position.y = 0.08;
        shelf.add(smallPot);

        const smallLeafGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        const smallLeafMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.7
        });
        const smallLeaf = new THREE.Mesh(smallLeafGeometry, smallLeafMaterial);
        smallLeaf.position.copy(smallPot.position);
        smallLeaf.position.y += 0.15;
        smallLeaf.scale.y = 1.3;
        shelf.add(smallLeaf);

        shelf.position.set(pos.x, pos.y, pos.z);
        shelf.rotation.y = pos.rotY;
        scene.add(shelf);
    });
}

function createPlayerMesh(playerId) {
    const group = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1;
    head.castShadow = true;
    group.add(head);

    return group;
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'KeyE': handleInteraction(); break;
        case 'Space':
            if (canJump === true) velocity.y += JUMP_VELOCITY;
            canJump = false;
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function handleInteraction() {
    // Check if near sofa
    const distance = camera.position.distanceTo(sofaInteractionZone.position);

    if (distance < 2.5) {
        isSitting = !isSitting;

        if (isSitting) {
            sittingPosition = sofa.position.clone();
            sittingPosition.y = 0.7;
            document.getElementById('video-controls').classList.add('visible');
        } else {
            sittingPosition = null;
            document.getElementById('video-controls').classList.remove('visible');
        }

        socket.emit('playerSit', isSitting);
    }
}

function updatePlayerMovement(delta) {
    if (isSitting && sittingPosition) {
        // Lock position when sitting
        camera.position.copy(sittingPosition);
        camera.position.y = PLAYER_HEIGHT;
        return;
    }

    if (!controls.isLocked) return;

    // Apply gravity
    velocity.y -= GRAVITY * delta;

    // Friction for horizontal movement
    velocity.x -= velocity.x * 20.0 * delta;
    velocity.z -= velocity.z * 20.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * MOVE_SPEED * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * MOVE_SPEED * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Apply vertical movement (jumping/gravity)
    camera.position.y += velocity.y * delta;

    // Check if on ground
    if (camera.position.y <= PLAYER_HEIGHT) {
        camera.position.y = PLAYER_HEIGHT;
        velocity.y = 0;
        canJump = true;
    }

    // Boundaries
    camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
    camera.position.z = Math.max(-9, Math.min(9, camera.position.z));

    // Check if near sofa for interaction prompt
    const distance = camera.position.distanceTo(sofaInteractionZone.position);
    const prompt = document.getElementById('interaction-prompt');

    if (distance < 2.5 && !isSitting) {
        prompt.style.display = 'block';
    } else {
        prompt.style.display = 'none';
    }

    // Send position to server
    socket.emit('playerMove', {
        position: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        },
        rotation: {
            x: camera.rotation.x,
            y: camera.rotation.y
        }
    });
}

function setupMultiplayer() {
    socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (id !== socket.id) {
                addOtherPlayer(id, players[id]);
            }
        });
        updatePlayerCount();
    });

    socket.on('playerJoined', (player) => {
        addOtherPlayer(player.id, player);
        updatePlayerCount();
    });

    socket.on('playerMoved', (data) => {
        if (otherPlayers[data.id]) {
            otherPlayers[data.id].position.set(
                data.position.x,
                data.position.y,
                data.position.z
            );
            otherPlayers[data.id].rotation.y = data.rotation.y;
        }
    });

    socket.on('playerLeft', (id) => {
        if (otherPlayers[id]) {
            scene.remove(otherPlayers[id]);
            delete otherPlayers[id];
            updatePlayerCount();
        }
    });

    socket.on('videoSync', (data) => {
        handleVideoSync(data);
    });
}

function addOtherPlayer(id, playerData) {
    const playerMesh = createPlayerMesh(id);
    playerMesh.position.set(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
    );
    scene.add(playerMesh);
    otherPlayers[id] = playerMesh;
}

function updatePlayerCount() {
    const count = Object.keys(otherPlayers).length + 1;
    document.getElementById('player-count').textContent = `Players: ${count}`;
}

function setupVideoControls() {
    const loadButton = document.getElementById('load-video');
    const playPauseButton = document.getElementById('play-pause');
    const urlInput = document.getElementById('video-url-input');

    loadButton.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
            loadVideo(url);
            socket.emit('videoControl', { action: 'load', url: url });
        }
    });

    playPauseButton.addEventListener('click', () => {
        if (videoElement.paused) {
            videoElement.play();
            playPauseButton.textContent = 'Pause';
            socket.emit('videoControl', {
                action: 'play',
                currentTime: videoElement.currentTime
            });
        } else {
            videoElement.pause();
            playPauseButton.textContent = 'Play';
            socket.emit('videoControl', {
                action: 'pause',
                currentTime: videoElement.currentTime
            });
        }
    });
}

function loadVideo(url) {
    // Handle YouTube URLs
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        alert('For YouTube videos, please use a direct video URL (.mp4) or convert the YouTube link to an embed URL. You can also use services that provide direct video URLs.');
        return;
    }

    videoElement.src = url;
    videoElement.load();

    videoElement.addEventListener('loadeddata', () => {
        console.log('Video loaded, creating texture');
        console.log('Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);

        // Create texture when video is ready
        videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;

        // Apply texture to screen
        videoPlane.material.map = videoTexture;
        videoPlane.material.needsUpdate = true;
        console.log('Texture applied to material:', videoPlane.material.map);

        videoElement.play().then(() => {
            console.log('Video playing successfully');
            videoElement.muted = false;
            document.getElementById('play-pause').textContent = 'Pause';
        }).catch(err => {
            console.error('Error playing video:', err);
        });
    }, { once: true });
}

function handleVideoSync(data) {
    switch(data.action) {
        case 'load':
            loadVideo(data.url);
            document.getElementById('video-url-input').value = data.url;
            break;
        case 'play':
            videoElement.currentTime = data.currentTime;
            videoElement.play();
            document.getElementById('play-pause').textContent = 'Pause';
            break;
        case 'pause':
            videoElement.currentTime = data.currentTime;
            videoElement.pause();
            document.getElementById('play-pause').textContent = 'Play';
            break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    updatePlayerMovement(delta);

    // Update video texture
    if (videoTexture && videoElement && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        videoTexture.needsUpdate = true;
    }

    renderer.render(scene, camera);
}
