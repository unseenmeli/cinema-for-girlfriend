# 🎬 Girlfriend Cinema - Watch Together

A multiplayer 3D cinema room where you and your girlfriend can hang out and watch videos together in a virtual space!

## Features

- 🎮 **First-person 3D environment** built with Three.js
- 👥 **Real-time multiplayer** using Socket.io
- 🛋️ **Interactive sofa** - sit down to watch videos
- 📺 **Synchronized video playback** - watch together in real-time
- 🎯 **Simple controls** - WASD to move, mouse to look around

## How to Run

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

4. Share the URL with your girlfriend so she can join!

## Controls

- **WASD** - Move around
- **Mouse** - Look around
- **Click** - Lock mouse pointer
- **E** - Sit on sofa / Stand up
- **ESC** - Unlock mouse pointer

## How to Use

1. Both of you open the game in your browsers
2. Walk around using WASD keys
3. Approach the sofa and press **E** to sit
4. Once sitting, video controls will appear at the bottom
5. Enter a video URL (direct .mp4 link) and click "Load Video"
6. Click "Play" to start watching together!

## Video URLs

For best results, use direct video URLs ending in `.mp4`.

Example sources:
- Direct MP4 files from file hosting services
- Sample videos: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`

## Tech Stack

- **Frontend**: Three.js, Vanilla JavaScript
- **Backend**: Node.js, Express, Socket.io
- **3D Graphics**: Three.js with PointerLockControls

## Tips

- The video will sync for both players when either person plays/pauses
- Both players can control the video
- Make sure you're both sitting on the sofa for the best experience!

Enjoy your virtual movie night! 🍿
