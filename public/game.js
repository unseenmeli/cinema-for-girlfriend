import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// Game state
const socket = io();
let scene, camera, renderer, cssRenderer, controls;
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

    // WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    document.body.appendChild(renderer.domElement);

    // CSS3D Renderer for HTML video
    cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(cssRenderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const spotlight1 = new THREE.SpotLight(0xffffff, 2, 20, Math.PI / 6, 0.5, 1);
    spotlight1.position.set(-5, 3.8, -5);
    spotlight1.target.position.set(0, 2.5, -9.8);
    spotlight1.castShadow = true;
    scene.add(spotlight1);
    scene.add(spotlight1.target);

    const spotlight2 = new THREE.SpotLight(0xffffff, 2, 20, Math.PI / 6, 0.5, 1);
    spotlight2.position.set(5, 3.8, -5);
    spotlight2.target.position.set(0, 2.5, -9.8);
    spotlight2.castShadow = true;
    scene.add(spotlight2);
    scene.add(spotlight2.target);

    const spotlight3 = new THREE.SpotLight(0xffffff, 1.5, 20, Math.PI / 6, 0.5, 1);
    spotlight3.position.set(0, 3.8, -5);
    spotlight3.target.position.set(0, 2.5, -9.8);
    spotlight3.castShadow = true;
    scene.add(spotlight3);
    scene.add(spotlight3.target);

    const sofaLight = new THREE.PointLight(0xffffff, 1.2, 8);
    sofaLight.position.set(0, 2.5, -1.5);
    scene.add(sofaLight);

    const floorTextureLoader = new THREE.TextureLoader();
    const floorTexture = floorTextureLoader.load('wood-floor.jpg');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(2, 2);

    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        color: 0x888888,
        roughness: 0.8,
        metalness: 0.1
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

    const ceilingTextureLoader = new THREE.TextureLoader();
    const ceilingTexture = ceilingTextureLoader.load('wood-floor.jpg');
    ceilingTexture.wrapS = THREE.RepeatWrapping;
    ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(2, 2);

    const ceilingGeometry = new THREE.PlaneGeometry(20, 20);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        map: ceilingTexture,
        color: 0x888888,
        roughness: 0.8,
        metalness: 0.1
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);

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

    // Setup romantic text messages
    setupRomanticMessages();
}

function setupRomanticMessages() {
    const messages = [
        "Marimi, you're my favorite person 💖",
        "Shmari makes every day better ✨",
        "With you, everything feels right 🌙",
        "Mariam, you're the best thing that happened to me 💕",
        "Late nights with Shmari >>> everything else 🌟",
        "Marimi's laugh is my favorite sound 🎵",
        "You + Me = Perfect 💫",
        "Shmari, I choose you every time 💗",
        "My world got better when Marimi walked in 🌸",
        "No one gets me like Shmari does 🌹",
        "Mariam, you make the ordinary magical ✨",
        "Every moment with Marimi is a vibe 💖",
        "Shmari's energy >>> 🔥",
        "You're my safe place, Marimi 🏡",
        "Mariam, you're literally unmatched 👑",
        "Obsessed with everything about Shmari 💕",
        "You're not like anyone else, Marimi 🌺",
        "Shmari = Home 💫"
    ];

    const container = document.getElementById('romantic-messages-container');

    function createFallingText() {
        const text = document.createElement('div');
        text.className = 'falling-text';
        text.textContent = messages[Math.floor(Math.random() * messages.length)];

        // Random horizontal position (avoid center 40%)
        let leftPosition;
        if (Math.random() < 0.5) {
            // Left side (0-25%)
            leftPosition = Math.random() * 25;
        } else {
            // Right side (75-100%)
            leftPosition = 75 + Math.random() * 25;
        }
        text.style.left = leftPosition + '%';

        // Random rotation
        const rotation = (Math.random() * 60) - 30; // -30 to 30 degrees
        text.style.transform = `rotate(${rotation}deg)`;

        // Random duration (8-15 seconds)
        const duration = 8 + Math.random() * 7;
        text.style.animationDuration = duration + 's';

        container.appendChild(text);

        // Remove after animation completes
        setTimeout(() => {
            text.remove();
        }, duration * 1000);
    }

    // Create a new falling text every 1.5 seconds
    setInterval(createFallingText, 1500);

    // Start with a few messages
    createFallingText();
    setTimeout(createFallingText, 500);
    setTimeout(createFallingText, 1000);
}

function createWalls() {
    const textureLoader = new THREE.TextureLoader();
    const brickTexture = textureLoader.load('brick-wall.jpg');
    brickTexture.wrapS = THREE.RepeatWrapping;
    brickTexture.wrapT = THREE.RepeatWrapping;
    brickTexture.repeat.set(3, 1);

    const wallMaterial = new THREE.MeshStandardMaterial({
        map: brickTexture,
        roughness: 0.8,
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

    const furTextureLoader = new THREE.TextureLoader();
    const furTexture = furTextureLoader.load('fur-texture.jpg');
    furTexture.wrapS = THREE.RepeatWrapping;
    furTexture.wrapT = THREE.RepeatWrapping;

    const sofaMaterial = new THREE.MeshStandardMaterial({
        map: furTexture,
        color: 0x3d2817,
        roughness: 0.9
    });

    const baseGeometry = new THREE.BoxGeometry(3, 0.4, 1.5);
    const base = new THREE.Mesh(baseGeometry, sofaMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    sofa.add(base);

    const backGeometry = new THREE.BoxGeometry(3, 1, 0.3);
    const back = new THREE.Mesh(backGeometry, sofaMaterial);
    back.position.set(0, 1, -0.6);
    back.castShadow = true;
    sofa.add(back);

    const armGeometry = new THREE.BoxGeometry(0.3, 0.8, 1.5);
    const leftArm = new THREE.Mesh(armGeometry, sofaMaterial);
    leftArm.position.set(-1.35, 0.6, 0);
    leftArm.castShadow = true;
    sofa.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, sofaMaterial);
    rightArm.position.set(1.35, 0.6, 0);
    rightArm.castShadow = true;
    sofa.add(rightArm);

    sofa.position.set(0, 0, -2);
    sofa.rotation.y = Math.PI;
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
    // Create HTML video element
    videoElement = document.createElement('video');
    videoElement.src = 'Comp 1_6.mp4';
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.preload = 'auto';
    videoElement.style.width = '1920px';
    videoElement.style.height = '1080px';
    videoElement.style.backgroundColor = '#000000';

    console.log('Video element created:', videoElement);

    // Create CSS3D object from video element
    const videoObject = new CSS3DObject(videoElement);
    videoObject.position.set(0, 2.5, -9.5);
    videoObject.scale.set(0.00417, 0.00417, 1); // Scale to match 8x4.5 world units
    scene.add(videoObject);

    console.log('CSS3D video object added to scene');

    // Screen frame (WebGL mesh for the frame)
    const frameGeometry = new THREE.BoxGeometry(8.3, 4.8, 0.2);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 2.5, -9.6);
    scene.add(frame);

    // Debug video loading
    videoElement.addEventListener('loadedmetadata', () => {
        console.log('Video metadata loaded:', videoElement.videoWidth, 'x', videoElement.videoHeight);
    });

    videoElement.addEventListener('canplay', () => {
        console.log('Video can play');
    });

    videoElement.load();
}

function createSimpleDecor() {
    for (let i = 0; i < 12; i++) {
        const vineGeometry = new THREE.PlaneGeometry(0.3, 2);
        const vineMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5016,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const vine = new THREE.Mesh(vineGeometry, vineMaterial);

        const wallChoice = Math.floor(i / 3);
        if (wallChoice === 0) {
            vine.position.set(-9.85, 3, -6 + (i % 3) * 4);
            vine.rotation.y = Math.PI / 2;
        } else if (wallChoice === 1) {
            vine.position.set(9.85, 3, -6 + (i % 3) * 4);
            vine.rotation.y = -Math.PI / 2;
        } else if (wallChoice === 2) {
            vine.position.set(-6 + (i % 3) * 4, 3, 9.85);
        } else {
            vine.position.set(-6 + (i % 3) * 4, 3, -9.85);
        }

        scene.add(vine);
    }

    const rugTextureLoader = new THREE.TextureLoader();
    const rugTexture = rugTextureLoader.load('fur-texture.jpg');
    rugTexture.wrapS = THREE.RepeatWrapping;
    rugTexture.wrapT = THREE.RepeatWrapping;
    rugTexture.repeat.set(1, 1);

    const rug = new THREE.Mesh(
        new THREE.CircleGeometry(2.5, 32),
        new THREE.MeshStandardMaterial({
            map: rugTexture,
            color: 0xd4a574,
            roughness: 1
        })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.01;
    rug.position.z = 1;
    scene.add(rug);
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
        // Toggle sitting state
        isSitting = !isSitting;

        if (isSitting) {
            sittingPosition = sofa.position.clone();
            sittingPosition.y = 0.7;

            // Start countdown
            startCountdown();
        } else {
            sittingPosition = null;
            // Stop video when standing up
            videoElement.pause();
            videoElement.currentTime = 0;
        }

        socket.emit('playerSit', isSitting);
    }
}

function startCountdown() {
    const countdownDisplay = document.getElementById('countdown-display');
    let count = 3;

    countdownDisplay.style.display = 'block';
    countdownDisplay.textContent = count;

    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownDisplay.textContent = count;
        } else if (count === 0) {
            countdownDisplay.textContent = 'NOW!';
            // Start video
            videoElement.muted = false;
            videoElement.currentTime = 0;
            videoElement.play().then(() => {
                console.log('Video playing, paused:', videoElement.paused, 'currentTime:', videoElement.currentTime);
                console.log('Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
            }).catch(err => {
                console.error('Error playing video:', err);
            });
            socket.emit('videoControl', {
                action: 'play',
                currentTime: 0
            });
        } else {
            countdownDisplay.style.display = 'none';
            clearInterval(countdownInterval);
        }
    }, 1000);
}

function updatePlayerMovement(delta) {
    if (isSitting && sittingPosition) {
        // Lock position when sitting
        camera.position.copy(sittingPosition);
        camera.position.y = PLAYER_HEIGHT;
        velocity.set(0, 0, 0); // Reset velocity when sitting
        return;
    }

    if (!controls.isLocked && !isSitting) return;

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

    const sofaMinX = sofa.position.x - 1.7;
    const sofaMaxX = sofa.position.x + 1.7;
    const sofaMinZ = sofa.position.z - 0.9;
    const sofaMaxZ = sofa.position.z + 0.9;

    const oldX = camera.position.x;
    const oldZ = camera.position.z;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    if (camera.position.x > sofaMinX && camera.position.x < sofaMaxX &&
        camera.position.z > sofaMinZ && camera.position.z < sofaMaxZ) {
        camera.position.x = oldX;
        camera.position.z = oldZ;
    }

    camera.position.y += velocity.y * delta;

    if (camera.position.y <= PLAYER_HEIGHT) {
        camera.position.y = PLAYER_HEIGHT;
        velocity.y = 0;
        canJump = true;
    }

    camera.position.x = Math.max(-9, Math.min(9, camera.position.x));
    camera.position.z = Math.max(-9, Math.min(9, camera.position.z));

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
    // No manual controls needed - video auto-starts with countdown
}


function handleVideoSync(data) {
    switch(data.action) {
        case 'play':
            videoElement.currentTime = data.currentTime;
            videoElement.muted = false;
            videoElement.play();
            break;
        case 'pause':
            videoElement.currentTime = data.currentTime;
            videoElement.pause();
            break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    updatePlayerMovement(delta);

    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
}
