
const TileId = {
          Empty: 0,
          Wall: 1,
          Pellet: 2,
          PowerPellet: 3,
          PacSpawn: 4,
          GhostSpawn: 5,
          GhostDoor: 6,
          FruitSpawn: 7,
          PortalA: 8,
          PortalB: 9,
          Cherry: 10,
          Black: 11,
          ExtraLife: 12,
        };

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0, shrink-to-fit=no">
    <title>Pacman Board Designer & Game</title>
    <!-- Development Build - For production, use proper build tools -->
    <!-- Tailwind CSS for styling - Use PostCSS plugin for production -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- React and ReactDOM via CDN - Use npm install for production -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <!-- Babel for JSX transformation - Precompile for production -->
    <script src="https://unpkg.com/@babel/standalone@7.23.4/babel.min.js"></script>
    
    <!-- Firebase SDK -->
    <script type="module">
      import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
      import { getDatabase, ref, onValue, set, push, remove, get, serverTimestamp, onDisconnect, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
      import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
      
      // Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyChQ9ix8t-lObBH1P2_6sFFVUi23M3xfOE",
        authDomain: "pakman-73eb3.firebaseapp.com",
        databaseURL: "https://pakman-73eb3-default-rtdb.firebaseio.com",
        projectId: "pakman-73eb3",
        storageBucket: "pakman-73eb3.firebasestorage.app",
        messagingSenderId: "566068115657",
        appId: "1:566068115657:web:6b7a6fa71c035229f7b518"
      };

const createIntroMazes = () => {
            const introMazes = [];
            
            // Maze 1: The Spiral Maze (19x22)
            const maze1 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) maze1[y][x] = TileId.Wall;
              }
            }
            // Extended spiral pattern walls (adjusted for 19x22)
            for (let x = 2; x <= 17; x++) maze1[2][x] = TileId.Wall; // Top
            for (let y = 3; y <= 19; y++) maze1[y][17] = TileId.Wall; // Right
            for (let x = 4; x <= 16; x++) maze1[19][x] = TileId.Wall; // Bottom
            for (let y = 4; y <= 18; y++) maze1[y][4] = TileId.Wall; // Left
            for (let x = 5; x <= 15; x++) maze1[4][x] = TileId.Wall; // Inner top
            for (let y = 5; y <= 17; y++) maze1[y][15] = TileId.Wall; // Inner right
            for (let x = 6; x <= 14; x++) maze1[17][x] = TileId.Wall; // Inner bottom
            for (let y = 6; y <= 11; y++) maze1[y][6] = TileId.Wall; // Inner left
            // Center chamber walls
            for (let x = 11; x <= 13; x++) {
              maze1[8][x] = TileId.Wall;
              maze1[10][x] = TileId.Wall;
            }
            maze1[9][11] = TileId.Wall;
            maze1[9][13] = TileId.Wall;
            
            // Spawn points
            maze1[1][1] = TileId.PacSpawn;
            maze1[9][12] = TileId.GhostSpawn; // Center
            maze1[3][16] = TileId.GhostSpawn; // Outer spiral
            
            // Portals for teleportation
            maze1[8][1] = TileId.PortalA;
            maze1[8][18] = TileId.PortalB;
            
            // Power pellets at strategic points
            maze1[20][16] = TileId.PowerPellet;
            maze1[5][5] = TileId.PowerPellet;
            
            // Cherries in the spiral path
            maze1[3][10] = TileId.Cherry;
            maze1[11][15] = TileId.Cherry;
            maze1[7][8] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 1,
              name: "The Spiral Maze",
              width: 19,
              height: 22,
              tiles: maze1.flat(),
              wallColor: 'bg-blue-500',
              createdAt: new Date().toISOString()
            });
            
            // Maze 2: The Cross Fortress (19x22)
            const maze2 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) maze2[y][x] = TileId.Wall;
              }
            }
            // Large cross pattern (adjusted for 19x22)
            for (let y = 8; y <= 14; y++) {
              for (let x = 2; x <= 6; x++) maze2[y][x] = TileId.Wall; // Left arm
              for (let x = 12; x <= 16; x++) maze2[y][x] = TileId.Wall; // Right arm
            }
            for (let x = 7; x <= 11; x++) {
              for (let y = 2; y <= 6; y++) maze2[y][x] = TileId.Wall; // Top arm
              for (let y = 16; y <= 20; y++) maze2[y][x] = TileId.Wall; // Bottom arm
            }
            // Center fortress walls
            for (let x = 8; x <= 10; x++) {
              maze2[9][x] = TileId.Wall;
              maze2[13][x] = TileId.Wall;
            }
            for (let y = 10; y <= 12; y++) {
              maze2[y][7] = TileId.Wall;
              maze2[y][11] = TileId.Wall;
            }
            // Corner chambers
            for (let x = 2; x <= 4; x++) {
              maze2[2][x] = TileId.Wall;
              maze2[20][x] = TileId.Wall;
            }
            for (let x = 14; x <= 16; x++) {
              maze2[2][x] = TileId.Wall;
              maze2[20][x] = TileId.Wall;
            }
            
            // Spawn points in strategic locations
            maze2[1][9] = TileId.PacSpawn; // Top center
            maze2[8][9] = TileId.GhostSpawn; // Center fortress
            maze2[3][3] = TileId.GhostSpawn; // Corner chamber
            maze2[19][15] = TileId.GhostSpawn; // Opposite corner
            maze2[8][1] = TileId.GhostSpawn; // Side
            
            // Portals in cross arms
            maze2[8][3] = TileId.PortalA;
            maze2[8][15] = TileId.PortalB;
            
            // Power pellets at cross ends
            maze2[1][1] = TileId.PowerPellet;
            maze2[20][17] = TileId.PowerPellet;
            maze2[1][17] = TileId.PowerPellet;
            maze2[20][1] = TileId.PowerPellet;
            
            // Cherries in cross intersections
            maze2[7][9] = TileId.Cherry;
            maze2[15][9] = TileId.Cherry;
            maze2[11][5] = TileId.Cherry;
            maze2[11][13] = TileId.Cherry;
            maze2[3][9] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 2,
              name: "The Cross Fortress",
              width: 19,
              height: 22,
              tiles: maze2.flat(),
              wallColor: 'bg-green-500',
              createdAt: new Date().toISOString()
            });
            
            // Maze 3: Diamond Chambers (19x22)
            const maze3 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) maze3[y][x] = TileId.Wall;
              }
            }
            // Diamond pattern walls
            // Top diamond
            maze3[3][9] = TileId.Wall;
            for (let i = 0; i < 3; i++) {
              maze3[4 + i][8 - i] = TileId.Wall;
              maze3[4 + i][10 + i] = TileId.Wall;
            }
            for (let x = 6; x <= 12; x++) maze3[6][x] = TileId.Wall;
            
            // Bottom diamond
            maze3[13][9] = TileId.Wall;
            for (let i = 0; i < 3; i++) {
              maze3[12 - i][8 - i] = TileId.Wall;
              maze3[12 - i][10 + i] = TileId.Wall;
            }
            for (let x = 6; x <= 12; x++) maze3[10][x] = TileId.Wall;
            
            // Side chambers
            for (let y = 4; y <= 6; y++) {
              maze3[y][3] = TileId.Wall;
              maze3[y][15] = TileId.Wall;
            }
            for (let y = 10; y <= 12; y++) {
              maze3[y][3] = TileId.Wall;
              maze3[y][15] = TileId.Wall;
            }
            for (let x = 2; x <= 4; x++) {
              maze3[3][x] = TileId.Wall;
              maze3[7][x] = TileId.Wall;
              maze3[9][x] = TileId.Wall;
              maze3[13][x] = TileId.Wall;
            }
            for (let x = 14; x <= 16; x++) {
              maze3[3][x] = TileId.Wall;
              maze3[7][x] = TileId.Wall;
              maze3[9][x] = TileId.Wall;
              maze3[13][x] = TileId.Wall;
            }
            
            // Center connecting passages
            maze3[8][7] = TileId.Wall;
            maze3[8][11] = TileId.Wall;
            
            // Spawn points in chambers
            maze3[1][9] = TileId.PacSpawn; // Top center
            maze3[8][9] = TileId.GhostSpawn; // Center
            maze3[5][2] = TileId.GhostSpawn; // Left chamber
            maze3[11][16] = TileId.GhostSpawn; // Right chamber
            maze3[15][9] = TileId.GhostSpawn; // Bottom
            
            // Portals connecting chambers
            maze3[5][1] = TileId.PortalA;
            maze3[11][17] = TileId.PortalB;
            
            // Power pellets in diamond centers
            maze3[4][9] = TileId.PowerPellet;
            maze3[12][9] = TileId.PowerPellet;
            maze3[8][5] = TileId.PowerPellet;
            
            // Cherries scattered in chambers
            maze3[2][2] = TileId.Cherry;
            maze3[2][16] = TileId.Cherry;
            maze3[14][2] = TileId.Cherry;
            maze3[14][16] = TileId.Cherry;
            maze3[8][3] = TileId.Cherry;
            maze3[8][15] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 3,
              name: "Diamond Chambers",
              width: 19,
              height: 22,
              tiles: maze3.flat(),
              wallColor: 'bg-purple-500',
              createdAt: new Date().toISOString()
            });
            
            // Maze 4: The Four Rooms (19x22)
            const maze4 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) maze4[y][x] = TileId.Wall;
              }
            }
            // Main cross dividing the maze into 4 rooms
            for (let x = 7; x <= 11; x++) {
              maze4[7][x] = TileId.Wall;
              maze4[9][x] = TileId.Wall;
            }
            for (let y = 2; y <= 14; y++) {
              if (y !== 8) { // Leave center gap
                maze4[y][8] = TileId.Wall;
                maze4[y][10] = TileId.Wall;
              }
            }
            
            // Room 1 (Top-Left) - Spiral chamber
            for (let x = 2; x <= 5; x++) maze4[3][x] = TileId.Wall;
            for (let y = 4; y <= 6; y++) maze4[y][5] = TileId.Wall;
            for (let x = 3; x <= 4; x++) maze4[6][x] = TileId.Wall;
            maze4[5][3] = TileId.Wall;
            
            // Room 2 (Top-Right) - Corner maze
            for (let x = 13; x <= 16; x++) {
              maze4[2][x] = TileId.Wall;
              maze4[4][x] = TileId.Wall;
              maze4[6][x] = TileId.Wall;
            }
            for (let y = 3; y <= 5; y++) {
              maze4[y][13] = TileId.Wall;
              maze4[y][15] = TileId.Wall;
            }
            
            // Room 3 (Bottom-Left) - Diamond pattern
            maze4[12][4] = TileId.Wall;
            maze4[11][3] = TileId.Wall;
            maze4[11][5] = TileId.Wall;
            maze4[13][3] = TileId.Wall;
            maze4[13][5] = TileId.Wall;
            maze4[14][4] = TileId.Wall;
            
            // Room 4 (Bottom-Right) - Fortress
            for (let x = 12; x <= 16; x++) {
              maze4[11][x] = TileId.Wall;
              maze4[13][x] = TileId.Wall;
            }
            for (let y = 12; y <= 12; y++) {
              maze4[y][12] = TileId.Wall;
              maze4[y][16] = TileId.Wall;
            }
            maze4[12][14] = TileId.Wall;
            
            // Spawn points in each room
            maze4[1][1] = TileId.PacSpawn; // Room 1
            maze4[8][9] = TileId.GhostSpawn; // Center
            maze4[4][4] = TileId.GhostSpawn; // Room 1
            maze4[3][14] = TileId.GhostSpawn; // Room 2
            maze4[12][3] = TileId.GhostSpawn; // Room 3
            maze4[12][15] = TileId.GhostSpawn; // Room 4
            maze4[15][17] = TileId.GhostSpawn; // Corner
            
            // Portals connecting opposite rooms
            maze4[2][6] = TileId.PortalA; // Room 1
            maze4[14][12] = TileId.PortalB; // Room 4
            
            // Power pellets in room centers
            maze4[4][2] = TileId.PowerPellet; // Room 1
            maze4[4][16] = TileId.PowerPellet; // Room 2
            maze4[12][2] = TileId.PowerPellet; // Room 3
            maze4[12][16] = TileId.PowerPellet; // Room 4
            
            // Cherries in strategic positions
            maze4[6][6] = TileId.Cherry; // Room 1 exit
            maze4[6][12] = TileId.Cherry; // Room 2 exit
            maze4[10][6] = TileId.Cherry; // Room 3 exit
            maze4[10][12] = TileId.Cherry; // Room 4 exit
            maze4[1][9] = TileId.Cherry; // Top center
            maze4[15][9] = TileId.Cherry; // Bottom center
            maze4[8][1] = TileId.Cherry; // Left center
            maze4[8][17] = TileId.Cherry; // Right center
            
            introMazes.push({
              id: Date.now() + 4,
              name: "The Four Rooms",
              width: 19,
              height: 22,
              tiles: maze4.flat(),
              wallColor: 'bg-red-500',
              createdAt: new Date().toISOString()
            });
            
            // Maze 5: The Labyrinth (19x22)
            const maze5 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) maze5[y][x] = TileId.Wall;
              }
            }
            // Complex labyrinth pattern
            // Main pathways
            for (let x = 2; x <= 16; x += 2) {
              for (let y = 2; y <= 14; y += 2) {
                maze5[y][x] = TileId.Wall;
              }
            }
            // Connecting walls to create maze paths
            maze5[2][3] = TileId.Wall; maze5[2][5] = TileId.Wall; maze5[2][9] = TileId.Wall;
            maze5[2][11] = TileId.Wall; maze5[2][13] = TileId.Wall; maze5[2][15] = TileId.Wall;
            
            maze5[4][1] = TileId.Wall; maze5[4][3] = TileId.Wall; maze5[4][7] = TileId.Wall;
            maze5[4][9] = TileId.Wall; maze5[4][13] = TileId.Wall; maze5[4][17] = TileId.Wall;
            
            maze5[6][5] = TileId.Wall; maze5[6][7] = TileId.Wall; maze5[6][11] = TileId.Wall;
            maze5[6][13] = TileId.Wall; maze5[6][15] = TileId.Wall;
            
            maze5[8][1] = TileId.Wall; maze5[8][3] = TileId.Wall; maze5[8][5] = TileId.Wall;
            maze5[8][13] = TileId.Wall; maze5[8][15] = TileId.Wall; maze5[8][17] = TileId.Wall;
            
            maze5[10][3] = TileId.Wall; maze5[10][7] = TileId.Wall; maze5[10][9] = TileId.Wall;
            maze5[10][11] = TileId.Wall; maze5[10][15] = TileId.Wall;
            
            maze5[12][1] = TileId.Wall; maze5[12][5] = TileId.Wall; maze5[12][7] = TileId.Wall;
            maze5[12][9] = TileId.Wall; maze5[12][13] = TileId.Wall; maze5[12][17] = TileId.Wall;
            
            maze5[14][3] = TileId.Wall; maze5[14][5] = TileId.Wall; maze5[14][7] = TileId.Wall;
            maze5[14][11] = TileId.Wall; maze5[14][13] = TileId.Wall; maze5[14][15] = TileId.Wall;
            
            // Additional maze complexity
            maze5[3][2] = TileId.Wall; maze5[3][6] = TileId.Wall; maze5[3][8] = TileId.Wall;
            maze5[3][12] = TileId.Wall; maze5[3][14] = TileId.Wall; maze5[3][16] = TileId.Wall;
            
            maze5[5][4] = TileId.Wall; maze5[5][8] = TileId.Wall; maze5[5][10] = TileId.Wall;
            maze5[5][12] = TileId.Wall; maze5[5][16] = TileId.Wall;
            
            maze5[7][2] = TileId.Wall; maze5[7][6] = TileId.Wall; maze5[7][10] = TileId.Wall;
            maze5[7][12] = TileId.Wall; maze5[7][14] = TileId.Wall;
            
            maze5[9][4] = TileId.Wall; maze5[9][6] = TileId.Wall; maze5[9][8] = TileId.Wall;
            maze5[9][12] = TileId.Wall; maze5[9][14] = TileId.Wall; maze5[9][16] = TileId.Wall;
            
            maze5[11][2] = TileId.Wall; maze5[11][4] = TileId.Wall; maze5[11][6] = TileId.Wall;
            maze5[11][10] = TileId.Wall; maze5[11][12] = TileId.Wall; maze5[11][16] = TileId.Wall;
            
            maze5[13][4] = TileId.Wall; maze5[13][6] = TileId.Wall; maze5[13][8] = TileId.Wall;
            maze5[13][10] = TileId.Wall; maze5[13][12] = TileId.Wall; maze5[13][14] = TileId.Wall;
            
            // Central chamber with ghost door
            for (let x = 8; x <= 10; x++) {
              maze5[7][x] = TileId.Wall;
              maze5[9][x] = TileId.Wall;
            }
            maze5[8][7] = TileId.Wall;
            maze5[8][11] = TileId.Wall;
            maze5[8][9] = TileId.GhostDoor; // Ghost door to center
            
            // Spawn points scattered throughout labyrinth
            maze5[1][1] = TileId.PacSpawn; // Start corner
            maze5[8][8] = TileId.GhostSpawn; // Center chamber
            maze5[1][9] = TileId.GhostSpawn; // Top
            maze5[15][1] = TileId.GhostSpawn; // Bottom left
            maze5[15][17] = TileId.GhostSpawn; // Bottom right
            maze5[7][1] = TileId.GhostSpawn; // Left side
            maze5[9][17] = TileId.GhostSpawn; // Right side
            
            // Portals in opposite corners of labyrinth
            maze5[1][17] = TileId.PortalA; // Top right
            maze5[15][1] = TileId.PortalB; // Bottom left (will teleport to top right)
            
            // Power pellets in dead ends
            maze5[1][3] = TileId.PowerPellet;
            maze5[3][17] = TileId.PowerPellet;
            maze5[13][1] = TileId.PowerPellet;
            maze5[15][15] = TileId.PowerPellet;
            maze5[7][9] = TileId.PowerPellet; // Center
            
            // Cherries scattered throughout maze
            maze5[1][7] = TileId.Cherry;
            maze5[3][3] = TileId.Cherry;
            maze5[5][17] = TileId.Cherry;
            maze5[7][5] = TileId.Cherry;
            maze5[9][1] = TileId.Cherry;
            maze5[11][17] = TileId.Cherry;
            maze5[13][9] = TileId.Cherry;
            maze5[15][5] = TileId.Cherry;
            maze5[5][9] = TileId.Cherry;
            maze5[11][9] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 5,
              name: "The Labyrinth",
              width: 19,
              height: 22,
              tiles: maze5.flat(),
              wallColor: 'bg-yellow-500',
              createdAt: new Date().toISOString()
            });
            
            // Advanced Level 1: The Gauntlet (19x22)
            const advLevel1 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel1[y][x] = TileId.Wall;
              }
            }
            // Linear gauntlet with obstacles
            for (let x = 2; x <= 16; x += 2) {
              advLevel1[6][x] = TileId.Wall;
              advLevel1[15][x] = TileId.Wall;
            }
            for (let x = 3; x <= 15; x += 2) {
              advLevel1[9][x] = TileId.Wall;
              advLevel1[12][x] = TileId.Wall;
            }
            // Multiple ghost spawns for gauntlet challenge
            advLevel1[1][1] = TileId.PacSpawn;
            advLevel1[3][9] = TileId.GhostSpawn;
            advLevel1[7][5] = TileId.GhostSpawn;
            advLevel1[7][13] = TileId.GhostSpawn;
            advLevel1[14][9] = TileId.GhostSpawn;
            advLevel1[18][9] = TileId.GhostSpawn;
            // Strategic power pellets
            advLevel1[1][17] = TileId.PowerPellet;
            advLevel1[20][1] = TileId.PowerPellet;
            advLevel1[10][9] = TileId.PowerPellet;
            // Cherries for bonus points (extra cherries due to 5 ghosts)
            advLevel1[4][4] = TileId.Cherry;
            advLevel1[4][14] = TileId.Cherry;
            advLevel1[17][4] = TileId.Cherry;
            advLevel1[17][14] = TileId.Cherry;
            advLevel1[8][2] = TileId.Cherry; // Additional cherries for ghost balance
            advLevel1[8][16] = TileId.Cherry;
            advLevel1[13][7] = TileId.Cherry;
            // Extra life powerup
            advLevel1[11][9] = TileId.ExtraLife;
            
            introMazes.push({
              id: Date.now() + 6,
              name: "The Gauntlet",
              width: 19,
              height: 22,
              tiles: advLevel1.flat(),
              wallColor: 'bg-purple-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 2: The Pinwheel (19x22)
            const advLevel2 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel2[y][x] = TileId.Wall;
              }
            }
            // Pinwheel pattern from center
            const pinwheelCenterX = 9, pinwheelCenterY = 11;
            // Four arms extending from center
            for (let i = 1; i <= 6; i++) {
              advLevel2[pinwheelCenterY - i][pinwheelCenterX] = TileId.Wall; // North arm
              advLevel2[pinwheelCenterY + i][pinwheelCenterX] = TileId.Wall; // South arm
              advLevel2[pinwheelCenterY][pinwheelCenterX - i] = TileId.Wall; // West arm
              advLevel2[pinwheelCenterY][pinwheelCenterX + i] = TileId.Wall; // East arm
            }
            // Diagonal arms
            for (let i = 1; i <= 4; i++) {
              advLevel2[pinwheelCenterY - i][pinwheelCenterX - i] = TileId.Wall; // NW
              advLevel2[pinwheelCenterY - i][pinwheelCenterX + i] = TileId.Wall; // NE
              advLevel2[pinwheelCenterY + i][pinwheelCenterX - i] = TileId.Wall; // SW
              advLevel2[pinwheelCenterY + i][pinwheelCenterX + i] = TileId.Wall; // SE
            }
            // Ghost spawns at arm ends
            advLevel2[1][1] = TileId.PacSpawn;
            advLevel2[5][9] = TileId.GhostSpawn; // North
            advLevel2[17][9] = TileId.GhostSpawn; // South
            advLevel2[11][3] = TileId.GhostSpawn; // West
            advLevel2[11][15] = TileId.GhostSpawn; // East
            advLevel2[7][5] = TileId.GhostSpawn; // NW
            advLevel2[7][13] = TileId.GhostSpawn; // NE
            // Portals for tactical movement
            advLevel2[2][2] = TileId.PortalA;
            advLevel2[19][16] = TileId.PortalB;
            // Power pellets at corners
            advLevel2[2][16] = TileId.PowerPellet;
            advLevel2[19][2] = TileId.PowerPellet;
            advLevel2[pinwheelCenterY][pinwheelCenterX] = TileId.PowerPellet; // Center
            // Extra life powerup
            advLevel2[15][5] = TileId.ExtraLife;
            
            introMazes.push({
              id: Date.now() + 7,
              name: "The Pinwheel",
              width: 19,
              height: 22,
              tiles: advLevel2.flat(),
              wallColor: 'bg-indigo-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 3: The Serpent's Path (19x22)
            const advLevel3 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel3[y][x] = TileId.Wall;
              }
            }
            // Serpentine path walls
            for (let x = 2; x <= 8; x++) advLevel3[3][x] = TileId.Wall;
            for (let y = 4; y <= 8; y++) advLevel3[y][8] = TileId.Wall;
            for (let x = 9; x <= 16; x++) advLevel3[8][x] = TileId.Wall;
            for (let y = 9; y <= 13; y++) advLevel3[y][16] = TileId.Wall;
            for (let x = 10; x <= 15; x++) advLevel3[13][x] = TileId.Wall;
            for (let y = 14; y <= 18; y++) advLevel3[y][10] = TileId.Wall;
            for (let x = 2; x <= 9; x++) advLevel3[18][x] = TileId.Wall;
            // Additional serpent body segments
            for (let x = 4; x <= 6; x++) advLevel3[6][x] = TileId.Wall;
            for (let x = 12; x <= 14; x++) advLevel3[11][x] = TileId.Wall;
            for (let x = 6; x <= 8; x++) advLevel3[15][x] = TileId.Wall;
            // Ghost spawns along serpent body
            advLevel3[1][1] = TileId.PacSpawn;
            advLevel3[5][5] = TileId.GhostSpawn;
            advLevel3[9][12] = TileId.GhostSpawn;
            advLevel3[12][14] = TileId.GhostSpawn;
            advLevel3[16][8] = TileId.GhostSpawn;
            advLevel3[19][6] = TileId.GhostSpawn;
            advLevel3[7][15] = TileId.GhostSpawn;
            // Portal puzzle elements
            advLevel3[2][9] = TileId.PortalA;
            advLevel3[19][15] = TileId.PortalB;
            // Power pellets at key turns
            advLevel3[4][2] = TileId.PowerPellet;
            advLevel3[9][17] = TileId.PowerPellet;
            advLevel3[14][9] = TileId.PowerPellet;
            // Cherries along path
            advLevel3[6][4] = TileId.Cherry;
            advLevel3[10][14] = TileId.Cherry;
            advLevel3[16][12] = TileId.Cherry;
            // Extra life powerup
            advLevel3[13][11] = TileId.ExtraLife;
            
            introMazes.push({
              id: Date.now() + 8,
              name: "The Serpent's Path",
              width: 19,
              height: 22,
              tiles: advLevel3.flat(),
              wallColor: 'bg-green-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 4: The Arena (19x22)
            const advLevel4 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel4[y][x] = TileId.Wall;
              }
            }
            // Arena structure - minimal walls for open combat
            // Central pillar
            for (let x = 8; x <= 10; x++) {
              for (let y = 10; y <= 12; y++) {
                advLevel4[y][x] = TileId.Wall;
              }
            }
            // Corner obstacles
            advLevel4[3][3] = TileId.Wall; advLevel4[3][4] = TileId.Wall;
            advLevel4[4][3] = TileId.Wall; advLevel4[4][4] = TileId.Wall;
            advLevel4[3][14] = TileId.Wall; advLevel4[3][15] = TileId.Wall;
            advLevel4[4][14] = TileId.Wall; advLevel4[4][15] = TileId.Wall;
            advLevel4[17][3] = TileId.Wall; advLevel4[17][4] = TileId.Wall;
            advLevel4[18][3] = TileId.Wall; advLevel4[18][4] = TileId.Wall;
            advLevel4[17][14] = TileId.Wall; advLevel4[17][15] = TileId.Wall;
            advLevel4[18][14] = TileId.Wall; advLevel4[18][15] = TileId.Wall;
            // Maximum ghost spawns for arena combat
            advLevel4[1][1] = TileId.PacSpawn;
            advLevel4[2][9] = TileId.GhostSpawn;
            advLevel4[9][2] = TileId.GhostSpawn;
            advLevel4[9][16] = TileId.GhostSpawn;
            advLevel4[16][9] = TileId.GhostSpawn;
            advLevel4[6][6] = TileId.GhostSpawn;
            advLevel4[6][12] = TileId.GhostSpawn;
            advLevel4[15][6] = TileId.GhostSpawn;
            advLevel4[15][12] = TileId.GhostSpawn;
            // Power pellets at corners for survival
            advLevel4[2][2] = TileId.PowerPellet;
            advLevel4[2][16] = TileId.PowerPellet;
            advLevel4[19][2] = TileId.PowerPellet;
            advLevel4[19][16] = TileId.PowerPellet;
            // Cherries scattered for bonus points (extra cherries due to 8 ghosts)
            advLevel4[7][9] = TileId.Cherry;
            advLevel4[14][9] = TileId.Cherry;
            advLevel4[9][7] = TileId.Cherry;
            advLevel4[9][11] = TileId.Cherry;
            advLevel4[5][5] = TileId.Cherry; // Additional cherries for ghost balance
            advLevel4[5][13] = TileId.Cherry;
            advLevel4[16][5] = TileId.Cherry;
            advLevel4[16][13] = TileId.Cherry;
            advLevel4[8][8] = TileId.Cherry;
            advLevel4[13][8] = TileId.Cherry;
            // Extra life powerup
            advLevel4[11][9] = TileId.ExtraLife;
            
            introMazes.push({
              id: Date.now() + 9,
              name: "The Arena",
              width: 19,
              height: 22,
              tiles: advLevel4.flat(),
              wallColor: 'bg-red-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 5: The Ziggurat (19x22)
            const advLevel5 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel5[y][x] = TileId.Wall;
              }
            }
            // Pyramid/ziggurat structure
            // Level 1 (bottom)
            for (let x = 2; x <= 16; x++) advLevel5[19][x] = TileId.Wall;
            for (let x = 2; x <= 16; x++) advLevel5[18][x] = TileId.Wall;
            // Level 2
            for (let x = 4; x <= 14; x++) advLevel5[16][x] = TileId.Wall;
            for (let x = 4; x <= 14; x++) advLevel5[15][x] = TileId.Wall;
            // Level 3
            for (let x = 6; x <= 12; x++) advLevel5[13][x] = TileId.Wall;
            for (let x = 6; x <= 12; x++) advLevel5[12][x] = TileId.Wall;
            // Level 4 (top)
            for (let x = 8; x <= 10; x++) advLevel5[10][x] = TileId.Wall;
            for (let x = 8; x <= 10; x++) advLevel5[9][x] = TileId.Wall;
            // Stairs/passages
            advLevel5[17][9] = TileId.Empty; // Bottom entrance
            advLevel5[14][9] = TileId.Empty; // Level 2 entrance
            advLevel5[11][9] = TileId.Empty; // Level 3 entrance
            // Ghost spawns at each level
            advLevel5[1][1] = TileId.PacSpawn;
            advLevel5[20][3] = TileId.GhostSpawn; // Bottom level
            advLevel5[20][15] = TileId.GhostSpawn;
            advLevel5[17][6] = TileId.GhostSpawn; // Level 2
            advLevel5[17][12] = TileId.GhostSpawn;
            advLevel5[14][7] = TileId.GhostSpawn; // Level 3
            advLevel5[14][11] = TileId.GhostSpawn;
            advLevel5[8][9] = TileId.GhostSpawn; // Top level
            // Power pellets at level transitions
            advLevel5[20][9] = TileId.PowerPellet;
            advLevel5[17][9] = TileId.PowerPellet;
            advLevel5[14][9] = TileId.PowerPellet;
            advLevel5[11][9] = TileId.PowerPellet;
            // Portals for escape routes
            advLevel5[2][2] = TileId.PortalA;
            advLevel5[2][16] = TileId.PortalB;
            
            introMazes.push({
              id: Date.now() + 10,
              name: "The Ziggurat",
              width: 19,
              height: 22,
              tiles: advLevel5.flat(),
              wallColor: 'bg-yellow-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 6: The Nexus (19x22)
            const advLevel6 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel6[y][x] = TileId.Wall;
              }
            }
            // Central nexus hub
            for (let x = 7; x <= 11; x++) {
              for (let y = 9; y <= 13; y++) {
                advLevel6[y][x] = TileId.Wall;
              }
            }
            // Nexus entrances
            advLevel6[9][9] = TileId.Empty; // Left
            advLevel6[11][9] = TileId.Empty;
            advLevel6[9][11] = TileId.Empty; // Right
            advLevel6[11][11] = TileId.Empty;
            advLevel6[10][7] = TileId.Empty; // Top
            advLevel6[10][13] = TileId.Empty; // Bottom
            // Connecting corridors
            for (let x = 2; x <= 6; x++) advLevel6[10][x] = TileId.Wall; // Left corridor
            for (let x = 12; x <= 16; x++) advLevel6[10][x] = TileId.Wall; // Right corridor
            for (let y = 2; y <= 8; y++) advLevel6[y][9] = TileId.Wall; // Top corridor
            for (let y = 14; y <= 19; y++) advLevel6[y][9] = TileId.Wall; // Bottom corridor
            // Multiple portal system
            advLevel6[1][1] = TileId.PacSpawn;
            advLevel6[3][3] = TileId.PortalA;
            advLevel6[18][15] = TileId.PortalB;
            // Ghost coordination points
            advLevel6[5][5] = TileId.GhostSpawn;
            advLevel6[5][13] = TileId.GhostSpawn;
            advLevel6[16][5] = TileId.GhostSpawn;
            advLevel6[16][13] = TileId.GhostSpawn;
            advLevel6[10][3] = TileId.GhostSpawn;
            advLevel6[10][15] = TileId.GhostSpawn;
            advLevel6[3][9] = TileId.GhostSpawn;
            advLevel6[17][9] = TileId.GhostSpawn;
            // Strategic power pellets
            advLevel6[2][9] = TileId.PowerPellet;
            advLevel6[18][9] = TileId.PowerPellet;
            advLevel6[9][2] = TileId.PowerPellet;
            advLevel6[9][16] = TileId.PowerPellet;
            // Extra cherries for 8 ghost balance
            advLevel6[4][4] = TileId.Cherry;
            advLevel6[4][14] = TileId.Cherry;
            advLevel6[17][4] = TileId.Cherry;
            advLevel6[17][14] = TileId.Cherry;
            advLevel6[7][7] = TileId.Cherry;
            advLevel6[7][11] = TileId.Cherry;
            advLevel6[14][7] = TileId.Cherry;
            advLevel6[14][11] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 11,
              name: "The Nexus",
              width: 19,
              height: 22,
              tiles: advLevel6.flat(),
              wallColor: 'bg-cyan-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 7: The Vortex (19x22)
            const advLevel7 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel7[y][x] = TileId.Wall;
              }
            }
            // Spiral vortex pattern
            const vortexCenterX = 9, vortexCenterY = 11;
            // Outer spiral
            for (let x = 3; x <= 15; x++) advLevel7[3][x] = TileId.Wall;
            for (let y = 4; y <= 18; y++) advLevel7[y][15] = TileId.Wall;
            for (let x = 4; x <= 14; x++) advLevel7[18][x] = TileId.Wall;
            for (let y = 5; y <= 17; y++) advLevel7[y][4] = TileId.Wall;
            // Middle spiral
            for (let x = 6; x <= 12; x++) advLevel7[6][x] = TileId.Wall;
            for (let y = 7; y <= 15; y++) advLevel7[y][12] = TileId.Wall;
            for (let x = 7; x <= 11; x++) advLevel7[15][x] = TileId.Wall;
            for (let y = 8; y <= 14; y++) advLevel7[y][7] = TileId.Wall;
            // Inner spiral
            for (let x = 9; x <= 10; x++) advLevel7[9][x] = TileId.Wall;
            advLevel7[10][10] = TileId.Wall;
            advLevel7[11][10] = TileId.Wall;
            advLevel7[12][10] = TileId.Wall;
            advLevel7[12][9] = TileId.Wall;
            // Ghost swarm spawns
            advLevel7[1][1] = TileId.PacSpawn;
            advLevel7[2][8] = TileId.GhostSpawn;
            advLevel7[5][13] = TileId.GhostSpawn;
            advLevel7[8][16] = TileId.GhostSpawn;
            advLevel7[13][14] = TileId.GhostSpawn;
            advLevel7[16][11] = TileId.GhostSpawn;
            advLevel7[17][6] = TileId.GhostSpawn;
            advLevel7[14][3] = TileId.GhostSpawn;
            advLevel7[9][5] = TileId.GhostSpawn;
            // Vortex center power
            advLevel7[11][9] = TileId.PowerPellet;
            // Escape portals
            advLevel7[2][2] = TileId.PortalA;
            advLevel7[19][16] = TileId.PortalB;
            // Power pellets at spiral turns
            advLevel7[4][14] = TileId.PowerPellet;
            advLevel7[17][5] = TileId.PowerPellet;
            // Extra cherries for 8 ghost balance
            advLevel7[3][6] = TileId.Cherry;
            advLevel7[6][11] = TileId.Cherry;
            advLevel7[10][14] = TileId.Cherry;
            advLevel7[15][12] = TileId.Cherry;
            advLevel7[18][8] = TileId.Cherry;
            advLevel7[16][4] = TileId.Cherry;
            advLevel7[12][2] = TileId.Cherry;
            advLevel7[8][3] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 12,
              name: "The Vortex",
              width: 19,
              height: 22,
              tiles: advLevel7.flat(),
              wallColor: 'bg-pink-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 8: The Fortress (19x22)
            const advLevel8 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel8[y][x] = TileId.Wall;
              }
            }
            // Fortress outer walls
            for (let x = 3; x <= 15; x++) {
              advLevel8[4][x] = TileId.Wall;
              advLevel8[17][x] = TileId.Wall;
            }
            for (let y = 5; y <= 16; y++) {
              advLevel8[y][3] = TileId.Wall;
              advLevel8[y][15] = TileId.Wall;
            }
            // Fortress gates
            advLevel8[4][9] = TileId.Empty; // North gate
            advLevel8[17][9] = TileId.Empty; // South gate
            advLevel8[10][3] = TileId.Empty; // West gate
            advLevel8[10][15] = TileId.Empty; // East gate
            // Inner fortress structure
            for (let x = 6; x <= 12; x++) {
              advLevel8[8][x] = TileId.Wall;
              advLevel8[13][x] = TileId.Wall;
            }
            for (let y = 9; y <= 12; y++) {
              advLevel8[y][6] = TileId.Wall;
              advLevel8[y][12] = TileId.Wall;
            }
            // Inner courtyard
            advLevel8[10][9] = TileId.Empty;
            // Defensive ghost positions
            advLevel8[1][1] = TileId.PacSpawn;
            advLevel8[2][9] = TileId.GhostSpawn; // Outer perimeter
            advLevel8[19][9] = TileId.GhostSpawn;
            advLevel8[10][2] = TileId.GhostSpawn;
            advLevel8[10][16] = TileId.GhostSpawn;
            advLevel8[6][6] = TileId.GhostSpawn; // Fortress corners
            advLevel8[6][12] = TileId.GhostSpawn;
            advLevel8[14][6] = TileId.GhostSpawn;
            advLevel8[14][12] = TileId.GhostSpawn;
            advLevel8[10][9] = TileId.GhostSpawn; // Central keep
            // Strategic power pellets at gates
            advLevel8[3][9] = TileId.PowerPellet;
            advLevel8[18][9] = TileId.PowerPellet;
            advLevel8[10][2] = TileId.PowerPellet;
            advLevel8[10][16] = TileId.PowerPellet;
            // Fortress treasures (extra cherries due to 9 ghosts)
            advLevel8[7][9] = TileId.Cherry;
            advLevel8[14][9] = TileId.Cherry;
            advLevel8[10][7] = TileId.Cherry;
            advLevel8[10][11] = TileId.Cherry;
            advLevel8[5][5] = TileId.Cherry; // Additional fortress treasures
            advLevel8[5][13] = TileId.Cherry;
            advLevel8[16][5] = TileId.Cherry;
            advLevel8[16][13] = TileId.Cherry;
            advLevel8[8][6] = TileId.Cherry;
            advLevel8[8][12] = TileId.Cherry;
            advLevel8[13][6] = TileId.Cherry;
            advLevel8[13][12] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 13,
              name: "The Fortress",
              width: 19,
              height: 22,
              tiles: advLevel8.flat(),
              wallColor: 'bg-gray-700',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 9: The Labyrinth Master (19x22)
            const advLevel9 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel9[y][x] = TileId.Wall;
              }
            }
            // Complex labyrinth with maximum ghost density
            // Main maze structure
            for (let x = 2; x <= 16; x += 2) {
              for (let y = 2; y <= 19; y += 2) {
                advLevel9[y][x] = TileId.Wall;
              }
            }
            // Connecting maze walls
            advLevel9[2][3] = TileId.Wall; advLevel9[2][7] = TileId.Wall; advLevel9[2][11] = TileId.Wall; advLevel9[2][15] = TileId.Wall;
            advLevel9[4][5] = TileId.Wall; advLevel9[4][9] = TileId.Wall; advLevel9[4][13] = TileId.Wall;
            advLevel9[6][3] = TileId.Wall; advLevel9[6][7] = TileId.Wall; advLevel9[6][11] = TileId.Wall; advLevel9[6][15] = TileId.Wall;
            advLevel9[8][5] = TileId.Wall; advLevel9[8][9] = TileId.Wall; advLevel9[8][13] = TileId.Wall;
            advLevel9[10][3] = TileId.Wall; advLevel9[10][7] = TileId.Wall; advLevel9[10][11] = TileId.Wall; advLevel9[10][15] = TileId.Wall;
            advLevel9[12][5] = TileId.Wall; advLevel9[12][9] = TileId.Wall; advLevel9[12][13] = TileId.Wall;
            advLevel9[14][3] = TileId.Wall; advLevel9[14][7] = TileId.Wall; advLevel9[14][11] = TileId.Wall; advLevel9[14][15] = TileId.Wall;
            advLevel9[16][5] = TileId.Wall; advLevel9[16][9] = TileId.Wall; advLevel9[16][13] = TileId.Wall;
            advLevel9[18][3] = TileId.Wall; advLevel9[18][7] = TileId.Wall; advLevel9[18][11] = TileId.Wall; advLevel9[18][15] = TileId.Wall;
            // Maximum ghost spawns throughout maze
            advLevel9[1][1] = TileId.PacSpawn;
            advLevel9[3][4] = TileId.GhostSpawn;
            advLevel9[3][8] = TileId.GhostSpawn;
            advLevel9[3][12] = TileId.GhostSpawn;
            advLevel9[3][16] = TileId.GhostSpawn;
            advLevel9[7][6] = TileId.GhostSpawn;
            advLevel9[7][10] = TileId.GhostSpawn;
            advLevel9[7][14] = TileId.GhostSpawn;
            advLevel9[11][4] = TileId.GhostSpawn;
            advLevel9[11][8] = TileId.GhostSpawn;
            advLevel9[11][12] = TileId.GhostSpawn;
            advLevel9[11][16] = TileId.GhostSpawn;
            advLevel9[15][6] = TileId.GhostSpawn;
            advLevel9[15][10] = TileId.GhostSpawn;
            advLevel9[15][14] = TileId.GhostSpawn;
            advLevel9[19][8] = TileId.GhostSpawn;
            // Power pellets at maze corners
            advLevel9[1][17] = TileId.PowerPellet;
            advLevel9[20][1] = TileId.PowerPellet;
            advLevel9[20][17] = TileId.PowerPellet;
            advLevel9[9][9] = TileId.PowerPellet; // Center
            // Portal escape system
            advLevel9[5][1] = TileId.PortalA;
            advLevel9[17][17] = TileId.PortalB;
            // Maximum cherries for 15 ghost balance
            advLevel9[3][2] = TileId.Cherry;
            advLevel9[3][6] = TileId.Cherry;
            advLevel9[3][10] = TileId.Cherry;
            advLevel9[3][14] = TileId.Cherry;
            advLevel9[7][4] = TileId.Cherry;
            advLevel9[7][8] = TileId.Cherry;
            advLevel9[7][12] = TileId.Cherry;
            advLevel9[7][16] = TileId.Cherry;
            advLevel9[11][2] = TileId.Cherry;
            advLevel9[11][6] = TileId.Cherry;
            advLevel9[11][10] = TileId.Cherry;
            advLevel9[11][14] = TileId.Cherry;
            advLevel9[15][4] = TileId.Cherry;
            advLevel9[15][8] = TileId.Cherry;
            advLevel9[15][12] = TileId.Cherry;
            advLevel9[19][6] = TileId.Cherry;
            advLevel9[19][10] = TileId.Cherry;
            advLevel9[19][14] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 14,
              name: "The Labyrinth Master",
              width: 19,
              height: 22,
              tiles: advLevel9.flat(),
              wallColor: 'bg-orange-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 10: The Ultimate Challenge (19x22)
            const advLevel10 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel10[y][x] = TileId.Wall;
              }
            }
            // Ultimate challenge - combination of all patterns
            // Central fortress
            for (let x = 7; x <= 11; x++) {
              for (let y = 9; y <= 13; y++) {
                advLevel10[y][x] = TileId.Wall;
              }
            }
            // Fortress gates
            advLevel10[9][9] = TileId.Empty;
            advLevel10[13][9] = TileId.Empty;
            advLevel10[11][7] = TileId.Empty;
            advLevel10[11][11] = TileId.Empty;
            // Outer defensive rings
            for (let x = 4; x <= 14; x++) {
              if (x !== 9) {
                advLevel10[6][x] = TileId.Wall;
                advLevel10[16][x] = TileId.Wall;
              }
            }
            for (let y = 7; y <= 15; y++) {
              if (y !== 11) {
                advLevel10[y][4] = TileId.Wall;
                advLevel10[y][14] = TileId.Wall;
              }
            }
            // Corner maze sections
            advLevel10[2][2] = TileId.Wall; advLevel10[2][3] = TileId.Wall; advLevel10[3][2] = TileId.Wall;
            advLevel10[2][15] = TileId.Wall; advLevel10[2][16] = TileId.Wall; advLevel10[3][16] = TileId.Wall;
            advLevel10[18][2] = TileId.Wall; advLevel10[18][3] = TileId.Wall; advLevel10[19][2] = TileId.Wall;
            advLevel10[18][15] = TileId.Wall; advLevel10[18][16] = TileId.Wall; advLevel10[19][16] = TileId.Wall;
            // Maximum difficulty ghost army
            advLevel10[1][1] = TileId.PacSpawn;
            advLevel10[11][9] = TileId.GhostSpawn; // Central commander
            advLevel10[5][5] = TileId.GhostSpawn; // Corner guards
            advLevel10[5][13] = TileId.GhostSpawn;
            advLevel10[17][5] = TileId.GhostSpawn;
            advLevel10[17][13] = TileId.GhostSpawn;
            advLevel10[3][9] = TileId.GhostSpawn; // Perimeter patrol
            advLevel10[19][9] = TileId.GhostSpawn;
            advLevel10[11][3] = TileId.GhostSpawn;
            advLevel10[11][15] = TileId.GhostSpawn;
            advLevel10[7][7] = TileId.GhostSpawn; // Inner circle
            advLevel10[7][11] = TileId.GhostSpawn;
            advLevel10[15][7] = TileId.GhostSpawn;
            advLevel10[15][11] = TileId.GhostSpawn;
            advLevel10[9][5] = TileId.GhostSpawn; // Elite guards
            advLevel10[9][13] = TileId.GhostSpawn;
            advLevel10[13][5] = TileId.GhostSpawn;
            advLevel10[13][13] = TileId.GhostSpawn;
            // Ultimate power pellet system
            advLevel10[1][17] = TileId.PowerPellet; // Corners
            advLevel10[20][1] = TileId.PowerPellet;
            advLevel10[20][17] = TileId.PowerPellet;
            advLevel10[6][9] = TileId.PowerPellet; // Gates
            advLevel10[16][9] = TileId.PowerPellet;
            advLevel10[11][6] = TileId.PowerPellet;
            advLevel10[11][16] = TileId.PowerPellet;
            // Multi-portal escape network
            advLevel10[4][1] = TileId.PortalA;
            advLevel10[18][17] = TileId.PortalB;
            // Victory treasures (maximum cherries for 16 ghosts)
            advLevel10[8][8] = TileId.Cherry;
            advLevel10[8][10] = TileId.Cherry;
            advLevel10[14][8] = TileId.Cherry;
            advLevel10[14][10] = TileId.Cherry;
            advLevel10[11][1] = TileId.Cherry; // Final prize
            advLevel10[2][4] = TileId.Cherry; // Ultimate challenge rewards
            advLevel10[2][6] = TileId.Cherry;
            advLevel10[2][12] = TileId.Cherry;
            advLevel10[2][14] = TileId.Cherry;
            advLevel10[4][2] = TileId.Cherry;
            advLevel10[4][16] = TileId.Cherry;
            advLevel10[6][4] = TileId.Cherry;
            advLevel10[6][14] = TileId.Cherry;
            advLevel10[16][4] = TileId.Cherry;
            advLevel10[16][14] = TileId.Cherry;
            advLevel10[18][2] = TileId.Cherry;
            advLevel10[18][6] = TileId.Cherry;
            advLevel10[18][12] = TileId.Cherry;
            advLevel10[18][16] = TileId.Cherry;
            advLevel10[5][9] = TileId.Cherry;
            advLevel10[17][9] = TileId.Cherry;
            advLevel10[11][5] = TileId.Cherry;
            advLevel10[11][13] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 15,
              name: "The Ultimate Challenge",
              width: 19,
              height: 22,
              tiles: advLevel10.flat(),
              wallColor: 'bg-black',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 11: The Clockwork (19x22)
            const advLevel11 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel11[y][x] = TileId.Wall;
              }
            }
            // Clockwork gear pattern - multiple interlocking circles
            const clockworkCenterX = 9, clockworkCenterY = 11;
            // Main central gear
            for (let angle = 0; angle < 360; angle += 45) {
              const rad = (angle * Math.PI) / 180;
              const x = Math.round(clockworkCenterX + 4 * Math.cos(rad));
              const y = Math.round(clockworkCenterY + 3 * Math.sin(rad));
              if (x > 0 && x < 18 && y > 0 && y < 21) advLevel11[y][x] = TileId.Wall;
            }
            // Smaller gears around the main one
            const gearCenters = [{x: 5, y: 6}, {x: 13, y: 6}, {x: 5, y: 16}, {x: 13, y: 16}];
            gearCenters.forEach(center => {
              for (let angle = 0; angle < 360; angle += 60) {
                const rad = (angle * Math.PI) / 180;
                const x = Math.round(center.x + 2 * Math.cos(rad));
                const y = Math.round(center.y + 2 * Math.sin(rad));
                if (x > 0 && x < 18 && y > 0 && y < 21) advLevel11[y][x] = TileId.Wall;
              }
            });
            // Mechanical connecting rods
            for (let x = 7; x <= 11; x++) advLevel11[3][x] = TileId.Wall;
            for (let x = 7; x <= 11; x++) advLevel11[19][x] = TileId.Wall;
            for (let y = 9; y <= 13; y++) advLevel11[y][3] = TileId.Wall;
            for (let y = 9; y <= 13; y++) advLevel11[y][15] = TileId.Wall;
            // Ghost spawns at gear centers
            advLevel11[1][1] = TileId.PacSpawn;
            advLevel11[clockworkCenterY][clockworkCenterX] = TileId.GhostSpawn; // Central gear
            gearCenters.forEach(center => {
              advLevel11[center.y][center.x] = TileId.GhostSpawn;
            });
            advLevel11[11][7] = TileId.GhostSpawn; // Additional mechanical ghosts
            advLevel11[11][11] = TileId.GhostSpawn;
            // Power pellets at gear intersections
            advLevel11[3][9] = TileId.PowerPellet;
            advLevel11[19][9] = TileId.PowerPellet;
            advLevel11[11][3] = TileId.PowerPellet;
            advLevel11[11][15] = TileId.PowerPellet;
            // Portals for gear teleportation
            advLevel11[2][2] = TileId.PortalA;
            advLevel11[19][16] = TileId.PortalB;
            
            introMazes.push({
              id: Date.now() + 16,
              name: "The Clockwork",
              width: 19,
              height: 22,
              tiles: advLevel11.flat(),
              wallColor: 'bg-amber-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 12: The Hive (19x22)
            const advLevel12 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel12[y][x] = TileId.Wall;
              }
            }
            // Hexagonal honeycomb pattern
            const hexCenters = [
              {x: 6, y: 5}, {x: 12, y: 5}, {x: 9, y: 8},
              {x: 6, y: 11}, {x: 12, y: 11}, {x: 9, y: 14},
              {x: 6, y: 17}, {x: 12, y: 17}
            ];
            hexCenters.forEach(center => {
              // Create hexagonal cells
              for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                  const x = center.x + dx;
                  const y = center.y + dy;
                  if (Math.abs(dx) + Math.abs(dy) === 2 && x > 0 && x < 18 && y > 0 && y < 21) {
                    advLevel12[y][x] = TileId.Wall;
                  }
                }
              }
            });
            // Connecting passages between hexagons
            advLevel12[5][9] = TileId.Empty; // Connect top hexagons
            advLevel12[8][7] = TileId.Empty; advLevel12[8][11] = TileId.Empty; // Connect middle
            advLevel12[11][9] = TileId.Empty; // Connect center hexagons
            advLevel12[14][7] = TileId.Empty; advLevel12[14][11] = TileId.Empty; // Connect lower
            advLevel12[17][9] = TileId.Empty; // Connect bottom hexagons
            // Ghost spawns in hexagon centers (worker bees)
            advLevel12[1][1] = TileId.PacSpawn;
            hexCenters.forEach(center => {
              advLevel12[center.y][center.x] = TileId.GhostSpawn;
            });
            // Queen bee in center
            advLevel12[11][9] = TileId.GhostSpawn;
            // Honey power pellets
            advLevel12[5][6] = TileId.PowerPellet;
            advLevel12[5][12] = TileId.PowerPellet;
            advLevel12[17][6] = TileId.PowerPellet;
            advLevel12[17][12] = TileId.PowerPellet;
            // Royal jelly cherries (extra for 9 ghosts)
            advLevel12[8][9] = TileId.Cherry;
            advLevel12[14][9] = TileId.Cherry;
            advLevel12[4][6] = TileId.Cherry; // Additional honey rewards (avoiding power pellet positions)
            advLevel12[4][12] = TileId.Cherry;
            advLevel12[11][6] = TileId.Cherry;
            advLevel12[11][12] = TileId.Cherry;
            advLevel12[18][9] = TileId.Cherry;
            advLevel12[6][7] = TileId.Cherry;
            advLevel12[12][7] = TileId.Cherry;
            advLevel12[9][10] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 17,
              name: "The Hive",
              width: 19,
              height: 22,
              tiles: advLevel12.flat(),
              wallColor: 'bg-yellow-500',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 13: The Circuit (19x22)
            const advLevel13 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel13[y][x] = TileId.Wall;
              }
            }
            // Electronic circuit board pattern
            // Main circuit traces (horizontal)
            for (let x = 2; x <= 16; x++) {
              if (x % 3 !== 0) {
                advLevel13[4][x] = TileId.Wall;
                advLevel13[8][x] = TileId.Wall;
                advLevel13[12][x] = TileId.Wall;
                advLevel13[16][x] = TileId.Wall;
              }
            }
            // Vertical circuit traces
            for (let y = 2; y <= 19; y++) {
              if (y % 3 !== 0) {
                advLevel13[y][5] = TileId.Wall;
                advLevel13[y][9] = TileId.Wall;
                advLevel13[y][13] = TileId.Wall;
              }
            }
            // Circuit components (chips)
            const chipPositions = [
              {x: 3, y: 6}, {x: 7, y: 6}, {x: 11, y: 6}, {x: 15, y: 6},
              {x: 3, y: 10}, {x: 7, y: 10}, {x: 11, y: 10}, {x: 15, y: 10},
              {x: 3, y: 14}, {x: 7, y: 14}, {x: 11, y: 14}, {x: 15, y: 14}
            ];
            chipPositions.forEach(chip => {
              advLevel13[chip.y][chip.x] = TileId.Wall;
              advLevel13[chip.y][chip.x + 1] = TileId.Wall;
            });
            // Electronic ghost spawns (processors)
            advLevel13[1][1] = TileId.PacSpawn;
            advLevel13[6][3] = TileId.GhostSpawn; // CPU ghosts
            advLevel13[6][7] = TileId.GhostSpawn;
            advLevel13[6][11] = TileId.GhostSpawn;
            advLevel13[6][15] = TileId.GhostSpawn;
            advLevel13[10][5] = TileId.GhostSpawn; // Memory ghosts
            advLevel13[10][9] = TileId.GhostSpawn;
            advLevel13[10][13] = TileId.GhostSpawn;
            advLevel13[14][7] = TileId.GhostSpawn; // I/O ghosts
            advLevel13[14][11] = TileId.GhostSpawn;
            // Power supply pellets
            advLevel13[2][2] = TileId.PowerPellet;
            advLevel13[2][16] = TileId.PowerPellet;
            advLevel13[19][2] = TileId.PowerPellet;
            advLevel13[19][16] = TileId.PowerPellet;
            // Data portals
            advLevel13[4][1] = TileId.PortalA;
            advLevel13[16][17] = TileId.PortalB;
            
            introMazes.push({
              id: Date.now() + 18,
              name: "The Circuit",
              width: 19,
              height: 22,
              tiles: advLevel13.flat(),
              wallColor: 'bg-green-500',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 14: The Tornado (19x22)
            const advLevel14 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel14[y][x] = TileId.Wall;
              }
            }
            // Tornado spiral pattern
            const tornadoCenterX = 9, tornadoCenterY = 11;
            for (let radius = 1; radius <= 7; radius++) {
              for (let angle = 0; angle < 360; angle += 15) {
                const rad = (angle + radius * 30) * Math.PI / 180; // Spiral effect
                const x = Math.round(tornadoCenterX + radius * Math.cos(rad));
                const y = Math.round(tornadoCenterY + (radius * 0.8) * Math.sin(rad));
                if (x > 0 && x < 18 && y > 0 && y < 21) {
                  advLevel14[y][x] = TileId.Wall;
                }
              }
            }
            // Eye of the storm (safe zone)
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                const x = tornadoCenterX + dx;
                const y = tornadoCenterY + dy;
                if (x > 0 && x < 18 && y > 0 && y < 21) {
                  advLevel14[y][x] = TileId.Empty;
                }
              }
            }
            // Wind current ghosts (following spiral)
            advLevel14[1][1] = TileId.PacSpawn;
            advLevel14[tornadoCenterY][tornadoCenterX] = TileId.GhostSpawn; // Eye ghost
            advLevel14[8][6] = TileId.GhostSpawn; // Wind ghosts
            advLevel14[6][12] = TileId.GhostSpawn;
            advLevel14[14][12] = TileId.GhostSpawn;
            advLevel14[16][6] = TileId.GhostSpawn;
            advLevel14[5][9] = TileId.GhostSpawn;
            advLevel14[17][9] = TileId.GhostSpawn;
            advLevel14[11][4] = TileId.GhostSpawn;
            advLevel14[11][14] = TileId.GhostSpawn;
            // Storm power pellets
            advLevel14[3][3] = TileId.PowerPellet;
            advLevel14[3][15] = TileId.PowerPellet;
            advLevel14[18][3] = TileId.PowerPellet;
            advLevel14[18][15] = TileId.PowerPellet;
            // Debris cherries (extra for 8 ghosts)
            advLevel14[7][7] = TileId.Cherry;
            advLevel14[7][11] = TileId.Cherry;
            advLevel14[15][7] = TileId.Cherry;
            advLevel14[15][11] = TileId.Cherry;
            advLevel14[4][4] = TileId.Cherry; // Additional storm debris
            advLevel14[4][14] = TileId.Cherry;
            advLevel14[17][4] = TileId.Cherry;
            advLevel14[17][14] = TileId.Cherry;
            advLevel14[9][5] = TileId.Cherry;
            advLevel14[9][17] = TileId.Cherry;
            advLevel14[13][5] = TileId.Cherry;
            advLevel14[13][17] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 19,
              name: "The Tornado",
              width: 19,
              height: 22,
              tiles: advLevel14.flat(),
              wallColor: 'bg-gray-500',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 15: The Cathedral (19x22)
            const advLevel15 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel15[y][x] = TileId.Wall;
              }
            }
            // Gothic cathedral architecture
            // Main nave
            for (let y = 3; y <= 18; y++) {
              advLevel15[y][6] = TileId.Wall;
              advLevel15[y][12] = TileId.Wall;
            }
            // Transept (cross section)
            for (let x = 3; x <= 15; x++) {
              advLevel15[10][x] = TileId.Wall;
              advLevel15[11][x] = TileId.Wall;
            }
            // Cathedral doors
            advLevel15[10][6] = TileId.Empty;
            advLevel15[11][6] = TileId.Empty;
            advLevel15[10][12] = TileId.Empty;
            advLevel15[11][12] = TileId.Empty;
            advLevel15[10][9] = TileId.Empty;
            advLevel15[11][9] = TileId.Empty;
            // Gothic arches
            advLevel15[5][8] = TileId.Wall; advLevel15[5][10] = TileId.Wall;
            advLevel15[4][9] = TileId.Wall;
            advLevel15[16][8] = TileId.Wall; advLevel15[16][10] = TileId.Wall;
            advLevel15[17][9] = TileId.Wall;
            // Bell towers
            for (let y = 2; y <= 4; y++) {
              advLevel15[y][4] = TileId.Wall;
              advLevel15[y][14] = TileId.Wall;
            }
            // Sacred ghost spawns
            advLevel15[1][1] = TileId.PacSpawn;
            advLevel15[3][4] = TileId.GhostSpawn; // Bell tower ghosts
            advLevel15[3][14] = TileId.GhostSpawn;
            advLevel15[7][9] = TileId.GhostSpawn; // Altar ghost
            advLevel15[15][9] = TileId.GhostSpawn; // Choir ghost
            advLevel15[10][4] = TileId.GhostSpawn; // Nave ghosts
            advLevel15[11][4] = TileId.GhostSpawn;
            advLevel15[10][14] = TileId.GhostSpawn;
            advLevel15[11][14] = TileId.GhostSpawn;
            // Holy power pellets
            advLevel15[2][9] = TileId.PowerPellet; // Altar
            advLevel15[19][9] = TileId.PowerPellet; // Back of cathedral
            advLevel15[10][2] = TileId.PowerPellet; // Side chapels
            advLevel15[11][16] = TileId.PowerPellet;
            // Sacred relics
            advLevel15[6][9] = TileId.Cherry;
            advLevel15[15][9] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 20,
              name: "The Cathedral",
              width: 19,
              height: 22,
              tiles: advLevel15.flat(),
              wallColor: 'bg-stone-600',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 16: The Molecule (19x22)
            const advLevel16 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel16[y][x] = TileId.Wall;
              }
            }
            // Molecular structure - atoms connected by bonds
            const atoms = [
              {x: 5, y: 5}, {x: 13, y: 5}, {x: 9, y: 8},
              {x: 5, y: 11}, {x: 13, y: 11}, {x: 9, y: 14},
              {x: 5, y: 17}, {x: 13, y: 17}
            ];
            // Create atoms (circular structures)
            atoms.forEach(atom => {
              for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                  if (Math.abs(dx) + Math.abs(dy) <= 1) {
                    const x = atom.x + dx;
                    const y = atom.y + dy;
                    if (x > 0 && x < 18 && y > 0 && y < 21) {
                      advLevel16[y][x] = TileId.Wall;
                    }
                  }
                }
              }
              // Hollow center for movement
              advLevel16[atom.y][atom.x] = TileId.Empty;
            });
            // Molecular bonds (connections between atoms)
            // Horizontal bonds
            for (let x = 6; x <= 12; x++) advLevel16[5][x] = TileId.Wall;
            for (let x = 6; x <= 12; x++) advLevel16[11][x] = TileId.Wall;
            for (let x = 6; x <= 12; x++) advLevel16[17][x] = TileId.Wall;
            // Vertical bonds
            for (let y = 6; y <= 10; y++) advLevel16[y][5] = TileId.Wall;
            for (let y = 6; y <= 10; y++) advLevel16[y][13] = TileId.Wall;
            for (let y = 12; y <= 16; y++) advLevel16[y][5] = TileId.Wall;
            for (let y = 12; y <= 16; y++) advLevel16[y][13] = TileId.Wall;
            // Diagonal bonds
            advLevel16[6][7] = TileId.Wall; advLevel16[7][8] = TileId.Wall;
            advLevel16[6][11] = TileId.Wall; advLevel16[7][10] = TileId.Wall;
            advLevel16[12][7] = TileId.Wall; advLevel16[13][8] = TileId.Wall;
            advLevel16[12][11] = TileId.Wall; advLevel16[13][10] = TileId.Wall;
            // Electron ghosts orbiting atoms
            advLevel16[1][1] = TileId.PacSpawn;
            atoms.forEach(atom => {
              advLevel16[atom.y][atom.x] = TileId.GhostSpawn;
            });
            // Additional electron ghosts
            advLevel16[9][5] = TileId.GhostSpawn;
            advLevel16[9][13] = TileId.GhostSpawn;
            // Energy power pellets
            advLevel16[2][2] = TileId.PowerPellet;
            advLevel16[2][16] = TileId.PowerPellet;
            advLevel16[19][2] = TileId.PowerPellet;
            advLevel16[19][16] = TileId.PowerPellet;
            // Catalyst cherries
            advLevel16[8][9] = TileId.Cherry;
            advLevel16[14][9] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 21,
              name: "The Molecule",
              width: 19,
              height: 22,
              tiles: advLevel16.flat(),
              wallColor: 'bg-blue-400',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 17: The Constellation (19x22)
            const advLevel17 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel17[y][x] = TileId.Wall;
              }
            }
            // Star constellation pattern
            const stars = [
              {x: 4, y: 3}, {x: 8, y: 4}, {x: 12, y: 3}, {x: 15, y: 6},
              {x: 3, y: 8}, {x: 7, y: 9}, {x: 11, y: 8}, {x: 15, y: 10},
              {x: 4, y: 13}, {x: 9, y: 15}, {x: 14, y: 13}, {x: 6, y: 17},
              {x: 12, y: 18}
            ];
            // Create star points
            stars.forEach(star => {
              // Star shape pattern
              advLevel17[star.y][star.x] = TileId.Wall;
              advLevel17[star.y - 1][star.x] = TileId.Wall;
              advLevel17[star.y + 1][star.x] = TileId.Wall;
              advLevel17[star.y][star.x - 1] = TileId.Wall;
              advLevel17[star.y][star.x + 1] = TileId.Wall;
            });
            // Constellation lines connecting stars
            // Connect nearby stars with "light rays"
            const connections = [
              [{x: 4, y: 3}, {x: 8, y: 4}], [{x: 8, y: 4}, {x: 12, y: 3}],
              [{x: 3, y: 8}, {x: 7, y: 9}], [{x: 7, y: 9}, {x: 11, y: 8}],
              [{x: 4, y: 13}, {x: 9, y: 15}], [{x: 9, y: 15}, {x: 14, y: 13}]
            ];
            connections.forEach(([star1, star2]) => {
              const dx = star2.x - star1.x;
              const dy = star2.y - star1.y;
              const steps = Math.max(Math.abs(dx), Math.abs(dy));
              for (let i = 1; i < steps; i++) {
                const x = Math.round(star1.x + (dx * i) / steps);
                const y = Math.round(star1.y + (dy * i) / steps);
                if (x > 0 && x < 18 && y > 0 && y < 21) {
                  advLevel17[y][x] = TileId.Wall;
                }
              }
            });
            // Cosmic ghost spawns at major stars
            advLevel17[1][1] = TileId.PacSpawn;
            advLevel17[3][4] = TileId.GhostSpawn; // North star
            advLevel17[4][8] = TileId.GhostSpawn; // Polaris
            advLevel17[3][12] = TileId.GhostSpawn; // Sirius
            advLevel17[8][3] = TileId.GhostSpawn; // Vega
            advLevel17[9][7] = TileId.GhostSpawn; // Altair
            advLevel17[8][11] = TileId.GhostSpawn; // Deneb
            advLevel17[13][4] = TileId.GhostSpawn; // Rigel
            advLevel17[15][9] = TileId.GhostSpawn; // Betelgeuse
            advLevel17[13][14] = TileId.GhostSpawn; // Antares
            // Nebula power pellets
            advLevel17[2][2] = TileId.PowerPellet;
            advLevel17[2][16] = TileId.PowerPellet;
            advLevel17[19][2] = TileId.PowerPellet;
            advLevel17[19][16] = TileId.PowerPellet;
            // Cosmic portals (wormholes)
            advLevel17[6][1] = TileId.PortalA;
            advLevel17[15][17] = TileId.PortalB;
            // Meteorite cherries (extra for 9 ghosts)
            advLevel17[10][5] = TileId.Cherry;
            advLevel17[12][12] = TileId.Cherry;
            advLevel17[5][2] = TileId.Cherry; // Additional cosmic rewards
            advLevel17[5][16] = TileId.Cherry;
            advLevel17[16][2] = TileId.Cherry;
            advLevel17[16][16] = TileId.Cherry;
            advLevel17[8][6] = TileId.Cherry;
            advLevel17[8][14] = TileId.Cherry;
            advLevel17[14][6] = TileId.Cherry;
            advLevel17[14][14] = TileId.Cherry;
            advLevel17[11][3] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 22,
              name: "The Constellation",
              width: 19,
              height: 22,
              tiles: advLevel17.flat(),
              wallColor: 'bg-indigo-900',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 18: The Maze Runner (19x22)
            const advLevel18 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel18[y][x] = TileId.Wall;
              }
            }
            // Speed challenge course - minimal walls, maximum chase
            // Central racing track
            for (let x = 4; x <= 14; x++) {
              advLevel18[6][x] = TileId.Wall;
              advLevel18[15][x] = TileId.Wall;
            }
            for (let y = 7; y <= 14; y++) {
              advLevel18[y][4] = TileId.Wall;
              advLevel18[y][14] = TileId.Wall;
            }
            // Track openings for racing
            advLevel18[6][9] = TileId.Empty; // Top opening
            advLevel18[15][9] = TileId.Empty; // Bottom opening
            advLevel18[10][4] = TileId.Empty; // Left opening
            advLevel18[11][4] = TileId.Empty;
            advLevel18[10][14] = TileId.Empty; // Right opening
            advLevel18[11][14] = TileId.Empty;
            // Speed boost sections (empty corridors)
            for (let x = 6; x <= 12; x++) {
              advLevel18[3][x] = TileId.Empty;
              advLevel18[18][x] = TileId.Empty;
            }
            for (let y = 8; y <= 13; y++) {
              advLevel18[y][2] = TileId.Empty;
              advLevel18[y][16] = TileId.Empty;
            }
            // Racing ghost spawns (high-speed pursuit)
            advLevel18[1][1] = TileId.PacSpawn;
            advLevel18[3][6] = TileId.GhostSpawn; // Speed demons
            advLevel18[3][9] = TileId.GhostSpawn;
            advLevel18[3][12] = TileId.GhostSpawn;
            advLevel18[18][6] = TileId.GhostSpawn;
            advLevel18[18][9] = TileId.GhostSpawn;
            advLevel18[18][12] = TileId.GhostSpawn;
            advLevel18[8][2] = TileId.GhostSpawn; // Side chasers
            advLevel18[13][2] = TileId.GhostSpawn;
            advLevel18[8][16] = TileId.GhostSpawn;
            advLevel18[13][16] = TileId.GhostSpawn;
            advLevel18[10][9] = TileId.GhostSpawn; // Center blocker
            // Turbo power pellets
            advLevel18[2][2] = TileId.PowerPellet;
            advLevel18[2][16] = TileId.PowerPellet;
            advLevel18[19][2] = TileId.PowerPellet;
            advLevel18[19][16] = TileId.PowerPellet;
            // Finish line cherries (extra for 11 ghosts)
            advLevel18[7][9] = TileId.Cherry;
            advLevel18[14][9] = TileId.Cherry;
            advLevel18[3][3] = TileId.Cherry; // Racing rewards
            advLevel18[3][15] = TileId.Cherry;
            advLevel18[18][3] = TileId.Cherry;
            advLevel18[18][15] = TileId.Cherry;
            advLevel18[5][7] = TileId.Cherry;
            advLevel18[5][11] = TileId.Cherry;
            advLevel18[16][7] = TileId.Cherry;
            advLevel18[16][11] = TileId.Cherry;
            advLevel18[8][5] = TileId.Cherry;
            advLevel18[13][5] = TileId.Cherry;
            advLevel18[8][13] = TileId.Cherry;
            advLevel18[13][13] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 23,
              name: "The Maze Runner",
              width: 19,
              height: 22,
              tiles: advLevel18.flat(),
              wallColor: 'bg-red-500',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 19: The Pandemonium (19x22)
            const advLevel19 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel19[y][x] = TileId.Wall;
              }
            }
            // Chaos theory design - seemingly random but with hidden patterns
            // Fractal-like structures
            const chaosPoints = [
              {x: 3, y: 3}, {x: 6, y: 5}, {x: 9, y: 3}, {x: 12, y: 5}, {x: 15, y: 3},
              {x: 2, y: 8}, {x: 5, y: 10}, {x: 8, y: 8}, {x: 11, y: 10}, {x: 14, y: 8}, {x: 16, y: 10},
              {x: 3, y: 13}, {x: 6, y: 15}, {x: 9, y: 13}, {x: 12, y: 15}, {x: 15, y: 13},
              {x: 4, y: 18}, {x: 7, y: 19}, {x: 10, y: 18}, {x: 13, y: 19}
            ];
            // Create chaotic wall patterns
            chaosPoints.forEach((point, index) => {
              // Butterfly effect - small changes create big differences
              const pattern = index % 4;
              switch (pattern) {
                case 0: // Cross pattern
                  advLevel19[point.y][point.x] = TileId.Wall;
                  advLevel19[point.y - 1][point.x] = TileId.Wall;
                  advLevel19[point.y + 1][point.x] = TileId.Wall;
                  advLevel19[point.y][point.x - 1] = TileId.Wall;
                  advLevel19[point.y][point.x + 1] = TileId.Wall;
                  break;
                case 1: // L-shape
                  advLevel19[point.y][point.x] = TileId.Wall;
                  advLevel19[point.y + 1][point.x] = TileId.Wall;
                  advLevel19[point.y][point.x + 1] = TileId.Wall;
                  break;
                case 2: // Diagonal
                  advLevel19[point.y][point.x] = TileId.Wall;
                  advLevel19[point.y - 1][point.x - 1] = TileId.Wall;
                  advLevel19[point.y + 1][point.x + 1] = TileId.Wall;
                  break;
                case 3: // T-shape
                  advLevel19[point.y][point.x] = TileId.Wall;
                  advLevel19[point.y][point.x - 1] = TileId.Wall;
                  advLevel19[point.y][point.x + 1] = TileId.Wall;
                  advLevel19[point.y - 1][point.x] = TileId.Wall;
                  break;
              }
            });
            // Chaotic ghost spawns (unpredictable behavior)
            advLevel19[1][1] = TileId.PacSpawn;
            advLevel19[3][3] = TileId.GhostSpawn; // Chaos agents
            advLevel19[5][10] = TileId.GhostSpawn;
            advLevel19[8][8] = TileId.GhostSpawn;
            advLevel19[10][2] = TileId.GhostSpawn;
            advLevel19[13][15] = TileId.GhostSpawn;
            advLevel19[15][6] = TileId.GhostSpawn;
            advLevel19[18][11] = TileId.GhostSpawn;
            advLevel19[6][15] = TileId.GhostSpawn;
            advLevel19[11][4] = TileId.GhostSpawn;
            advLevel19[16][13] = TileId.GhostSpawn;
            advLevel19[4][18] = TileId.GhostSpawn;
            advLevel19[12][19] = TileId.GhostSpawn;
            // Order from chaos power pellets
            advLevel19[2][9] = TileId.PowerPellet;
            advLevel19[9][2] = TileId.PowerPellet;
            advLevel19[16][9] = TileId.PowerPellet;
            advLevel19[9][19] = TileId.PowerPellet;
            // Strange attractor cherries
            advLevel19[7][7] = TileId.Cherry;
            advLevel19[11][11] = TileId.Cherry;
            advLevel19[14][14] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 24,
              name: "The Pandemonium",
              width: 19,
              height: 22,
              tiles: advLevel19.flat(),
              wallColor: 'bg-purple-800',
              createdAt: new Date().toISOString()
            });

            // Advanced Level 20: The Infinity (19x22)
            const advLevel20 = makeGrid(19, 22, TileId.Empty);
            // Border walls
            for (let y = 0; y < 22; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 21 || x === 0 || x === 18) advLevel20[y][x] = TileId.Wall;
              }
            }
            // Infinity symbol (∞) pattern
            const infinityCenterY = 11;
            // Left loop of infinity
            for (let angle = 0; angle < 360; angle += 10) {
              const rad = angle * Math.PI / 180;
              const x = Math.round(6 + 3 * Math.cos(rad));
              const y = Math.round(infinityCenterY + 2 * Math.sin(rad));
              if (x > 0 && x < 18 && y > 0 && y < 21) {
                advLevel20[y][x] = TileId.Wall;
              }
            }
            // Right loop of infinity
            for (let angle = 0; angle < 360; angle += 10) {
              const rad = angle * Math.PI / 180;
              const x = Math.round(12 + 3 * Math.cos(rad));
              const y = Math.round(infinityCenterY + 2 * Math.sin(rad));
              if (x > 0 && x < 18 && y > 0 && y < 21) {
                advLevel20[y][x] = TileId.Wall;
              }
            }
            // Center connection of infinity symbol
            advLevel20[infinityCenterY][8] = TileId.Wall;
            advLevel20[infinityCenterY][9] = TileId.Wall;
            advLevel20[infinityCenterY][10] = TileId.Wall;
            // Additional mathematical symbols
            // Pi symbol elements
            for (let x = 3; x <= 5; x++) advLevel20[5][x] = TileId.Wall;
            advLevel20[6][4] = TileId.Wall;
            advLevel20[7][4] = TileId.Wall;
            // Sigma symbol elements
            for (let x = 13; x <= 15; x++) advLevel20[16][x] = TileId.Wall;
            for (let x = 13; x <= 15; x++) advLevel20[18][x] = TileId.Wall;
            advLevel20[17][14] = TileId.Wall;
            // Infinite ghost spawns (mathematical entities)
            advLevel20[1][1] = TileId.PacSpawn;
            advLevel20[infinityCenterY][6] = TileId.GhostSpawn; // Left loop center
            advLevel20[infinityCenterY][12] = TileId.GhostSpawn; // Right loop center
            advLevel20[infinityCenterY - 2][6] = TileId.GhostSpawn; // Loop guardians
            advLevel20[infinityCenterY + 2][6] = TileId.GhostSpawn;
            advLevel20[infinityCenterY - 2][12] = TileId.GhostSpawn;
            advLevel20[infinityCenterY + 2][12] = TileId.GhostSpawn;
            advLevel20[infinityCenterY][9] = TileId.GhostSpawn; // Infinity center
            advLevel20[5][4] = TileId.GhostSpawn; // Pi guardian
            advLevel20[17][14] = TileId.GhostSpawn; // Sigma guardian
            advLevel20[3][9] = TileId.GhostSpawn; // Mathematical constants
            advLevel20[19][9] = TileId.GhostSpawn;
            // Eternal power pellets
            advLevel20[infinityCenterY][3] = TileId.PowerPellet; // Left infinity
            advLevel20[infinityCenterY][15] = TileId.PowerPellet; // Right infinity
            advLevel20[3][3] = TileId.PowerPellet; // Corner eternities
            advLevel20[3][15] = TileId.PowerPellet;
            advLevel20[19][3] = TileId.PowerPellet;
            advLevel20[19][15] = TileId.PowerPellet;
            // Transcendental portals
            advLevel20[2][9] = TileId.PortalA;
            advLevel20[20][9] = TileId.PortalB;
            // Universal constants cherries
            advLevel20[infinityCenterY - 3][9] = TileId.Cherry;
            advLevel20[infinityCenterY + 3][9] = TileId.Cherry;
            advLevel20[infinityCenterY][1] = TileId.Cherry;
            advLevel20[infinityCenterY][17] = TileId.Cherry;
            
            introMazes.push({
              id: Date.now() + 25,
              name: "The Infinity",
              width: 19,
              height: 22,
              tiles: advLevel20.flat(),
              wallColor: 'bg-violet-600',
              createdAt: new Date().toISOString()
            });

            // Additional Stock Level 21: The Garden (Easy - Nature Theme)
            const gardenLevel = makeGrid(17, 19, TileId.Empty);
            // Border walls
            for (let y = 0; y < 19; y++) {
              for (let x = 0; x < 17; x++) {
                if (y === 0 || y === 18 || x === 0 || x === 16) gardenLevel[y][x] = TileId.Wall;
              }
            }
            // Simple flower pattern with wide paths
            // Central flower
            gardenLevel[9][8] = TileId.Wall;
            for (let i = 1; i <= 2; i++) {
              gardenLevel[9 - i][8] = TileId.Wall; // Stem up
              gardenLevel[9 + i][8] = TileId.Wall; // Stem down
            }
            // Flower petals
            gardenLevel[7][7] = TileId.Wall; gardenLevel[7][9] = TileId.Wall;
            gardenLevel[6][8] = TileId.Wall;
            // Side gardens
            for (let x = 3; x <= 5; x++) gardenLevel[5][x] = TileId.Wall;
            for (let x = 11; x <= 13; x++) gardenLevel[5][x] = TileId.Wall;
            for (let x = 3; x <= 5; x++) gardenLevel[13][x] = TileId.Wall;
            for (let x = 11; x <= 13; x++) gardenLevel[13][x] = TileId.Wall;
            // Tree trunks
            gardenLevel[8][4] = TileId.Wall; gardenLevel[10][4] = TileId.Wall;
            gardenLevel[8][12] = TileId.Wall; gardenLevel[10][12] = TileId.Wall;
            // Spawns and items (ensuring empty spaces)
            gardenLevel[1][1] = TileId.PacSpawn;
            gardenLevel[9][4] = TileId.GhostSpawn; // Garden keeper
            gardenLevel[9][12] = TileId.GhostSpawn; // Garden keeper
            // Power pellets in corners (empty spaces)
            gardenLevel[2][2] = TileId.PowerPellet;
            gardenLevel[2][14] = TileId.PowerPellet;
            gardenLevel[16][2] = TileId.PowerPellet;
            gardenLevel[16][14] = TileId.PowerPellet;
            // Cherries scattered in garden (empty spaces)
            gardenLevel[4][8] = TileId.Cherry; // Center path
            gardenLevel[14][8] = TileId.Cherry;
            gardenLevel[9][2] = TileId.Cherry;
            gardenLevel[9][14] = TileId.Cherry;
            // Portals at garden entrances
            gardenLevel[9][1] = TileId.PortalA;
            gardenLevel[9][15] = TileId.PortalB;
            // Extra life in center garden
            gardenLevel[12][8] = TileId.ExtraLife;

            introMazes.push({
              id: Date.now() + 26,
              name: "The Garden",
              width: 17,
              height: 19,
              tiles: gardenLevel.flat(),
              wallColor: 'bg-green-500',
              createdAt: new Date().toISOString()
            });

            // Additional Stock Level 22: The Dungeon (Difficult - Medieval Theme)
            const dungeonLevel = makeGrid(21, 23, TileId.Empty);
            // Border walls
            for (let y = 0; y < 23; y++) {
              for (let x = 0; x < 21; x++) {
                if (y === 0 || y === 22 || x === 0 || x === 20) dungeonLevel[y][x] = TileId.Wall;
              }
            }
            // Central keep
            for (let y = 8; y <= 14; y++) {
              for (let x = 8; x <= 12; x++) {
                if (y === 8 || y === 14 || x === 8 || x === 12) dungeonLevel[y][x] = TileId.Wall;
              }
            }
            // Corner towers
            for (let y = 2; y <= 6; y++) {
              for (let x = 2; x <= 6; x++) {
                if (y === 2 || y === 6 || x === 2 || x === 6) dungeonLevel[y][x] = TileId.Wall;
              }
            }
            for (let y = 2; y <= 6; y++) {
              for (let x = 14; x <= 18; x++) {
                if (y === 2 || y === 6 || x === 14 || x === 18) dungeonLevel[y][x] = TileId.Wall;
              }
            }
            for (let y = 16; y <= 20; y++) {
              for (let x = 2; x <= 6; x++) {
                if (y === 16 || y === 20 || x === 2 || x === 6) dungeonLevel[y][x] = TileId.Wall;
              }
            }
            for (let y = 16; y <= 20; y++) {
              for (let x = 14; x <= 18; x++) {
                if (y === 16 || y === 20 || x === 14 || x === 18) dungeonLevel[y][x] = TileId.Wall;
              }
            }
            // Connecting corridors
            for (let x = 7; x <= 13; x++) dungeonLevel[4][x] = TileId.Wall;
            for (let x = 7; x <= 13; x++) dungeonLevel[18][x] = TileId.Wall;
            for (let y = 5; y <= 17; y++) dungeonLevel[y][7] = TileId.Wall;
            for (let y = 5; y <= 17; y++) dungeonLevel[y][13] = TileId.Wall;
            // Dungeon doors (gaps in walls)
            dungeonLevel[4][10] = TileId.Empty; // North gate
            dungeonLevel[18][10] = TileId.Empty; // South gate
            dungeonLevel[11][7] = TileId.Empty; // West gate
            dungeonLevel[11][13] = TileId.Empty; // East gate
            // Spawns (ensuring empty spaces)
            dungeonLevel[1][1] = TileId.PacSpawn;
            dungeonLevel[3][3] = TileId.GhostSpawn; // Tower guards
            dungeonLevel[3][17] = TileId.GhostSpawn;
            dungeonLevel[19][3] = TileId.GhostSpawn;
            dungeonLevel[19][17] = TileId.GhostSpawn;
            dungeonLevel[11][10] = TileId.GhostSpawn; // Keep guardian
            dungeonLevel[6][10] = TileId.GhostSpawn; // Corridor patrol
            dungeonLevel[16][10] = TileId.GhostSpawn;
            dungeonLevel[11][5] = TileId.GhostSpawn; // Additional guards
            dungeonLevel[11][15] = TileId.GhostSpawn;
            // Power pellets in tower centers (empty spaces)
            dungeonLevel[4][4] = TileId.PowerPellet;
            dungeonLevel[4][16] = TileId.PowerPellet;
            dungeonLevel[18][4] = TileId.PowerPellet;
            dungeonLevel[18][16] = TileId.PowerPellet;
            // Treasure cherries (empty spaces)
            dungeonLevel[9][9] = TileId.Cherry; // Keep treasure
            dungeonLevel[9][11] = TileId.Cherry;
            dungeonLevel[12][9] = TileId.Cherry;
            dungeonLevel[12][11] = TileId.Cherry;
            dungeonLevel[7][10] = TileId.Cherry; // Corridor treasures
            dungeonLevel[15][10] = TileId.Cherry;
            // Portals at opposite ends (correcting bounds)
            dungeonLevel[1][10] = TileId.PortalA;
            dungeonLevel[20][10] = TileId.PortalB;
            // Extra life in the keep
            dungeonLevel[10][10] = TileId.ExtraLife;

            introMazes.push({
              id: Date.now() + 27,
              name: "The Dungeon",
              width: 21,
              height: 23,
              tiles: dungeonLevel.flat(),
              wallColor: 'bg-gray-600',
              createdAt: new Date().toISOString()
            });

            // Additional Stock Level 23: The Circuit Board (Medium - Tech Theme)
            const circuitLevel = makeGrid(19, 21, TileId.Empty);
            // Border walls
            for (let y = 0; y < 21; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 20 || x === 0 || x === 18) circuitLevel[y][x] = TileId.Wall;
              }
            }
            // Circuit traces (pathways)
            // Horizontal traces
            for (let x = 3; x <= 15; x++) circuitLevel[5][x] = TileId.Wall;
            for (let x = 3; x <= 15; x++) circuitLevel[10][x] = TileId.Wall;
            for (let x = 3; x <= 15; x++) circuitLevel[15][x] = TileId.Wall;
            // Vertical traces
            for (let y = 3; y <= 17; y++) circuitLevel[y][5] = TileId.Wall;
            for (let y = 3; y <= 17; y++) circuitLevel[y][9] = TileId.Wall;
            for (let y = 3; y <= 17; y++) circuitLevel[y][13] = TileId.Wall;
            // Circuit gaps for movement
            circuitLevel[5][9] = TileId.Empty; // Horizontal gaps
            circuitLevel[10][5] = TileId.Empty;
            circuitLevel[10][13] = TileId.Empty;
            circuitLevel[15][9] = TileId.Empty;
            circuitLevel[7][5] = TileId.Empty; // Vertical gaps
            circuitLevel[7][13] = TileId.Empty;
            circuitLevel[13][5] = TileId.Empty;
            circuitLevel[13][13] = TileId.Empty;
            // Microchip areas
            for (let y = 2; y <= 4; y++) {
              for (let x = 2; x <= 4; x++) {
                if (y === 2 || y === 4 || x === 2 || x === 4) circuitLevel[y][x] = TileId.Wall;
              }
            }
            for (let y = 16; y <= 18; y++) {
              for (let x = 14; x <= 16; x++) {
                if (y === 16 || y === 18 || x === 14 || x === 16) circuitLevel[y][x] = TileId.Wall;
              }
            }
            // Spawns and components (ensuring empty spaces)
            circuitLevel[1][1] = TileId.PacSpawn;
            circuitLevel[3][3] = TileId.GhostSpawn; // CPU ghost
            circuitLevel[17][15] = TileId.GhostSpawn; // GPU ghost
            circuitLevel[7][9] = TileId.GhostSpawn; // RAM ghost
            circuitLevel[13][9] = TileId.GhostSpawn; // Cache ghost
            // Power pellets as capacitors (empty spaces)
            circuitLevel[3][15] = TileId.PowerPellet;
            circuitLevel[17][3] = TileId.PowerPellet;
            circuitLevel[8][7] = TileId.PowerPellet;
            circuitLevel[12][11] = TileId.PowerPellet;
            // Data cherries (empty spaces)
            circuitLevel[6][7] = TileId.Cherry;
            circuitLevel[6][11] = TileId.Cherry;
            circuitLevel[14][7] = TileId.Cherry;
            circuitLevel[14][11] = TileId.Cherry;
            circuitLevel[9][3] = TileId.Cherry;
            circuitLevel[9][16] = TileId.Cherry;
            // Data ports (correcting bounds)
            circuitLevel[10][1] = TileId.PortalA;
            circuitLevel[10][16] = TileId.PortalB;
            // Extra life as bonus data
            circuitLevel[11][9] = TileId.ExtraLife;

            introMazes.push({
              id: Date.now() + 28,
              name: "The Circuit Board",
              width: 19,
              height: 21,
              tiles: circuitLevel.flat(),
              wallColor: 'bg-cyan-500',
              createdAt: new Date().toISOString()
            });

            // Additional Stock Level 24: The Pyramid (Medium - Ancient Theme)
            const pyramidLevel = makeGrid(19, 21, TileId.Empty);
            // Border walls
            for (let y = 0; y < 21; y++) {
              for (let x = 0; x < 19; x++) {
                if (y === 0 || y === 20 || x === 0 || x === 18) pyramidLevel[y][x] = TileId.Wall;
              }
            }
            // Pyramid structure - stepped walls
            // Top level
            for (let x = 8; x <= 10; x++) pyramidLevel[3][x] = TileId.Wall;
            // Second level
            for (let x = 7; x <= 11; x++) pyramidLevel[5][x] = TileId.Wall;
            for (let y = 4; y <= 5; y++) {
              pyramidLevel[y][7] = TileId.Wall;
              pyramidLevel[y][11] = TileId.Wall;
            }
            // Third level
            for (let x = 6; x <= 12; x++) pyramidLevel[7][x] = TileId.Wall;
            for (let y = 6; y <= 7; y++) {
              pyramidLevel[y][6] = TileId.Wall;
              pyramidLevel[y][12] = TileId.Wall;
            }
            // Fourth level
            for (let x = 5; x <= 13; x++) pyramidLevel[9][x] = TileId.Wall;
            for (let y = 8; y <= 9; y++) {
              pyramidLevel[y][5] = TileId.Wall;
              pyramidLevel[y][13] = TileId.Wall;
            }
            // Base level
            for (let x = 4; x <= 14; x++) pyramidLevel[11][x] = TileId.Wall;
            for (let y = 10; y <= 11; y++) {
              pyramidLevel[y][4] = TileId.Wall;
              pyramidLevel[y][14] = TileId.Wall;
            }
            // Internal chambers
            pyramidLevel[6][9] = TileId.Wall; // Pharaoh's chamber
            pyramidLevel[8][9] = TileId.Wall;
            pyramidLevel[10][9] = TileId.Wall;
            // Entrance passages
            pyramidLevel[12][9] = TileId.Empty; // Main entrance
            pyramidLevel[9][9] = TileId.Empty; // Chamber entrance
            // Side passages
            for (let x = 2; x <= 3; x++) pyramidLevel[15][x] = TileId.Wall;
            for (let x = 15; x <= 16; x++) pyramidLevel[15][x] = TileId.Wall;
            for (let y = 14; y <= 16; y++) pyramidLevel[y][2] = TileId.Wall;
            for (let y = 14; y <= 16; y++) pyramidLevel[y][16] = TileId.Wall;
            // Spawns (ensuring empty spaces)
            pyramidLevel[1][1] = TileId.PacSpawn;
            pyramidLevel[4][9] = TileId.GhostSpawn; // Pharaoh's spirit
            pyramidLevel[15][3] = TileId.GhostSpawn; // Tomb guardian
            pyramidLevel[15][15] = TileId.GhostSpawn; // Tomb guardian
            pyramidLevel[13][9] = TileId.GhostSpawn; // Entrance guard
            // Power pellets as ancient artifacts (empty spaces)
            pyramidLevel[2][2] = TileId.PowerPellet;
            pyramidLevel[2][16] = TileId.PowerPellet;
            pyramidLevel[18][2] = TileId.PowerPellet;
            pyramidLevel[18][16] = TileId.PowerPellet;
            // Treasure cherries (empty spaces)
            pyramidLevel[6][8] = TileId.Cherry; // Chamber treasures
            pyramidLevel[6][10] = TileId.Cherry;
            pyramidLevel[8][8] = TileId.Cherry;
            pyramidLevel[8][10] = TileId.Cherry;
            pyramidLevel[14][9] = TileId.Cherry; // Entrance treasure
            pyramidLevel[16][9] = TileId.Cherry; // Burial treasure
            // Ancient portals (correcting bounds)
            pyramidLevel[18][9] = TileId.PortalA;
            pyramidLevel[1][9] = TileId.PortalB;
            // Extra life as eternal life symbol
            pyramidLevel[7][9] = TileId.ExtraLife;

            introMazes.push({
              id: Date.now() + 29,
              name: "The Pyramid",
              width: 19,
              height: 21,
              tiles: pyramidLevel.flat(),
              wallColor: 'bg-yellow-600',
              createdAt: new Date().toISOString()
            });

            // Additional Stock Level 25: The Maze (Easy - Classic Theme)
            const mazeLevel = makeGrid(15, 17, TileId.Empty);
            // Border walls
            for (let y = 0; y < 17; y++) {
              for (let x = 0; x < 15; x++) {
                if (y === 0 || y === 16 || x === 0 || x === 14) mazeLevel[y][x] = TileId.Wall;
              }
            }
            // Simple maze pattern with wide corridors
            // Horizontal walls
            for (let x = 2; x <= 12; x += 2) mazeLevel[3][x] = TileId.Wall;
            for (let x = 3; x <= 11; x += 2) mazeLevel[6][x] = TileId.Wall;
            for (let x = 2; x <= 12; x += 2) mazeLevel[9][x] = TileId.Wall;
            for (let x = 3; x <= 11; x += 2) mazeLevel[12][x] = TileId.Wall;
            // Vertical walls
            for (let y = 2; y <= 14; y += 2) mazeLevel[y][4] = TileId.Wall;
            for (let y = 3; y <= 13; y += 2) mazeLevel[y][7] = TileId.Wall;
            for (let y = 2; y <= 14; y += 2) mazeLevel[y][10] = TileId.Wall;
            // Create openings for navigation
            mazeLevel[3][6] = TileId.Empty; // Horizontal openings
            mazeLevel[6][8] = TileId.Empty;
            mazeLevel[9][4] = TileId.Empty;
            mazeLevel[12][10] = TileId.Empty;
            mazeLevel[5][4] = TileId.Empty; // Vertical openings
            mazeLevel[8][7] = TileId.Empty;
            mazeLevel[11][10] = TileId.Empty;
            // Spawns (ensuring empty spaces)
            mazeLevel[1][1] = TileId.PacSpawn;
            mazeLevel[7][7] = TileId.GhostSpawn; // Center maze (moved to avoid conflict)
            mazeLevel[4][11] = TileId.GhostSpawn; // Right side
            // Power pellets in corners (empty spaces)
            mazeLevel[2][2] = TileId.PowerPellet;
            mazeLevel[2][12] = TileId.PowerPellet;
            mazeLevel[14][2] = TileId.PowerPellet;
            mazeLevel[14][12] = TileId.PowerPellet;
            // Cherries in accessible corridors (empty spaces)
            mazeLevel[5][8] = TileId.Cherry; // Moved to avoid conflicts
            mazeLevel[11][6] = TileId.Cherry; // Moved to avoid conflicts
            mazeLevel[8][3] = TileId.Cherry;
            mazeLevel[8][11] = TileId.Cherry;
            // Portals at maze ends
            mazeLevel[8][1] = TileId.PortalA;
            mazeLevel[8][13] = TileId.PortalB;
            // Extra life in center
            mazeLevel[8][8] = TileId.ExtraLife;

            introMazes.push({
              id: Date.now() + 30,
              name: "The Maze",
              width: 15,
              height: 17,
              tiles: mazeLevel.flat(),
              wallColor: 'bg-indigo-500',
              createdAt: new Date().toISOString()
            });

            // Additional Stock Level 26: The Factory (Hard - Industrial Theme)
            const factoryLevel = makeGrid(23, 25, TileId.Empty);
            // Border walls
            for (let y = 0; y < 25; y++) {
              for (let x = 0; x < 23; x++) {
                if (y === 0 || y === 24 || x === 0 || x === 22) factoryLevel[y][x] = TileId.Wall;
              }
            }
            // Factory machinery - conveyor belt pattern
            // Main production line (horizontal)
            for (let x = 3; x <= 19; x++) factoryLevel[8][x] = TileId.Wall;
            for (let x = 3; x <= 19; x++) factoryLevel[16][x] = TileId.Wall;
            // Vertical machinery
            for (let y = 3; y <= 21; y++) factoryLevel[y][6] = TileId.Wall;
            for (let y = 3; y <= 21; y++) factoryLevel[y][11] = TileId.Wall;
            for (let y = 3; y <= 21; y++) factoryLevel[y][16] = TileId.Wall;
            // Machine gaps for movement
            factoryLevel[8][9] = TileId.Empty; // Production line gaps
            factoryLevel[16][13] = TileId.Empty;
            factoryLevel[12][6] = TileId.Empty; // Vertical gaps
            factoryLevel[12][11] = TileId.Empty;
            factoryLevel[12][16] = TileId.Empty;
            // Assembly stations
            for (let y = 4; y <= 6; y++) {
              for (let x = 4; x <= 5; x++) {
                if (y === 4 || y === 6 || x === 4 || x === 5) factoryLevel[y][x] = TileId.Wall;
              }
            }
            for (let y = 18; y <= 20; y++) {
              for (let x = 17; x <= 18; x++) {
                if (y === 18 || y === 20 || x === 17 || x === 18) factoryLevel[y][x] = TileId.Wall;
              }
            }
            // Quality control stations
            for (let y = 4; y <= 6; y++) {
              for (let x = 13; x <= 14; x++) {
                if (y === 4 || y === 6 || x === 13 || x === 14) factoryLevel[y][x] = TileId.Wall;
              }
            }
            for (let y = 18; y <= 20; y++) {
              for (let x = 8; x <= 9; x++) {
                if (y === 18 || y === 20 || x === 8 || x === 9) factoryLevel[y][x] = TileId.Wall;
              }
            }
            // Spawns (ensuring empty spaces)
            factoryLevel[1][1] = TileId.PacSpawn;
            factoryLevel[5][5] = TileId.GhostSpawn; // Assembly worker
            factoryLevel[19][17] = TileId.GhostSpawn; // Assembly worker
            factoryLevel[5][13] = TileId.GhostSpawn; // Quality control
            factoryLevel[19][8] = TileId.GhostSpawn; // Quality control
            factoryLevel[12][9] = TileId.GhostSpawn; // Production line supervisor
            factoryLevel[12][13] = TileId.GhostSpawn; // Production line worker
            factoryLevel[4][11] = TileId.GhostSpawn; // Maintenance ghost
            factoryLevel[20][11] = TileId.GhostSpawn; // Security ghost
            // Power pellets at machine stations (empty spaces)
            factoryLevel[3][3] = TileId.PowerPellet;
            factoryLevel[3][19] = TileId.PowerPellet;
            factoryLevel[21][3] = TileId.PowerPellet;
            factoryLevel[21][19] = TileId.PowerPellet;
            // Industrial cherries (empty spaces)
            factoryLevel[7][7] = TileId.Cherry; // Production rewards
            factoryLevel[7][15] = TileId.Cherry;
            factoryLevel[17][7] = TileId.Cherry;
            factoryLevel[17][15] = TileId.Cherry;
            factoryLevel[10][4] = TileId.Cherry; // Assembly line rewards
            factoryLevel[10][18] = TileId.Cherry;
            factoryLevel[14][4] = TileId.Cherry;
            factoryLevel[14][18] = TileId.Cherry;
            // Factory portals
            factoryLevel[12][1] = TileId.PortalA;
            factoryLevel[12][21] = TileId.PortalB;
            // Extra life at supervisor station
            factoryLevel[12][11] = TileId.ExtraLife;

            introMazes.push({
              id: Date.now() + 31,
              name: "The Factory",
              width: 23,
              height: 25,
              tiles: factoryLevel.flat(),
              wallColor: 'bg-gray-500',
              createdAt: new Date().toISOString()
            });

            // Additional Stock Level 27: The Spiral (Medium - Geometric Theme)
            const spiralLevel = makeGrid(17, 19, TileId.Empty);
            // Border walls
            for (let y = 0; y < 19; y++) {
              for (let x = 0; x < 17; x++) {
                if (y === 0 || y === 18 || x === 0 || x === 16) spiralLevel[y][x] = TileId.Wall;
              }
            }
            // Spiral pattern from outside to center
            // Outer spiral
            for (let x = 2; x <= 14; x++) spiralLevel[2][x] = TileId.Wall;
            for (let y = 2; y <= 16; y++) spiralLevel[y][14] = TileId.Wall;
            for (let x = 2; x <= 14; x++) spiralLevel[16][x] = TileId.Wall;
            for (let y = 2; y <= 16; y++) spiralLevel[y][2] = TileId.Wall;
            // Second layer
            for (let x = 4; x <= 12; x++) spiralLevel[4][x] = TileId.Wall;
            for (let y = 4; y <= 14; y++) spiralLevel[y][12] = TileId.Wall;
            for (let x = 4; x <= 12; x++) spiralLevel[14][x] = TileId.Wall;
            for (let y = 4; y <= 14; y++) spiralLevel[y][4] = TileId.Wall;
            // Third layer
            for (let x = 6; x <= 10; x++) spiralLevel[6][x] = TileId.Wall;
            for (let y = 6; y <= 12; y++) spiralLevel[y][10] = TileId.Wall;
            for (let x = 6; x <= 10; x++) spiralLevel[12][x] = TileId.Wall;
            for (let y = 6; y <= 12; y++) spiralLevel[y][6] = TileId.Wall;
            // Inner core
            spiralLevel[8][8] = TileId.Wall;
            spiralLevel[9][8] = TileId.Wall;
            spiralLevel[10][8] = TileId.Wall;
            // Spiral entrance/exit points
            spiralLevel[2][8] = TileId.Empty; // Outer entrance
            spiralLevel[4][10] = TileId.Empty; // Second layer entrance
            spiralLevel[6][8] = TileId.Empty; // Third layer entrance
            spiralLevel[8][9] = TileId.Empty; // Center access
            // Spawns (ensuring empty spaces)
            spiralLevel[1][1] = TileId.PacSpawn;
            spiralLevel[3][8] = TileId.GhostSpawn; // Outer spiral guard
            spiralLevel[9][9] = TileId.GhostSpawn; // Center guardian
            spiralLevel[5][10] = TileId.GhostSpawn; // Mid spiral patrol
            spiralLevel[13][8] = TileId.GhostSpawn; // Inner spiral guard
            // Power pellets at spiral corners (empty spaces)
            spiralLevel[3][3] = TileId.PowerPellet;
            spiralLevel[3][13] = TileId.PowerPellet;
            spiralLevel[15][3] = TileId.PowerPellet;
            spiralLevel[15][13] = TileId.PowerPellet;
            // Spiral rewards (empty spaces)
            spiralLevel[5][8] = TileId.Cherry; // Spiral path rewards
            spiralLevel[7][9] = TileId.Cherry;
            spiralLevel[11][7] = TileId.Cherry;
            spiralLevel[13][9] = TileId.Cherry;
            spiralLevel[9][5] = TileId.Cherry;
            spiralLevel[9][11] = TileId.Cherry;
            // Geometric portals
            spiralLevel[9][1] = TileId.PortalA;
            spiralLevel[9][15] = TileId.PortalB;
            // Extra life at spiral center (moved to accessible space)
            spiralLevel[9][7] = TileId.ExtraLife;

            introMazes.push({
              id: Date.now() + 32,
              name: "The Spiral",
              width: 17,
              height: 19,
              tiles: spiralLevel.flat(),
              wallColor: 'bg-pink-500',
              createdAt: new Date().toISOString()
            });

            // Additional Stock Level 28: The Crossroads (Medium-Hard - Junction Theme)
            const crossroadsLevel = makeGrid(21, 21, TileId.Empty);
            // Border walls
            for (let y = 0; y < 21; y++) {
              for (let x = 0; x < 21; x++) {
                if (y === 0 || y === 20 || x === 0 || x === 20) crossroadsLevel[y][x] = TileId.Wall;
              }
            }
            // Main crossroads - large plus shape
            // Horizontal main road
            for (let x = 5; x <= 15; x++) crossroadsLevel[8][x] = TileId.Wall;
            for (let x = 5; x <= 15; x++) crossroadsLevel[12][x] = TileId.Wall;
            // Vertical main road
            for (let y = 5; y <= 15; y++) crossroadsLevel[y][8] = TileId.Wall;
            for (let y = 5; y <= 15; y++) crossroadsLevel[y][12] = TileId.Wall;
            // Central intersection (keep open)
            for (let y = 9; y <= 11; y++) {
              for (let x = 9; x <= 11; x++) {
                crossroadsLevel[y][x] = TileId.Empty;
              }
            }
            // Side streets and alleys
            // Top-left quadrant
            for (let x = 2; x <= 6; x++) crossroadsLevel[3][x] = TileId.Wall;
            for (let y = 2; y <= 6; y++) crossroadsLevel[y][3] = TileId.Wall;
            // Top-right quadrant
            for (let x = 14; x <= 18; x++) crossroadsLevel[3][x] = TileId.Wall;
            for (let y = 2; y <= 6; y++) crossroadsLevel[y][17] = TileId.Wall;
            // Bottom-left quadrant
            for (let x = 2; x <= 6; x++) crossroadsLevel[17][x] = TileId.Wall;
            for (let y = 14; y <= 18; y++) crossroadsLevel[y][3] = TileId.Wall;
            // Bottom-right quadrant
            for (let x = 14; x <= 18; x++) crossroadsLevel[17][x] = TileId.Wall;
            for (let y = 14; y <= 18; y++) crossroadsLevel[y][17] = TileId.Wall;
            // Street connections
            crossroadsLevel[3][7] = TileId.Empty; // Top street connections
            crossroadsLevel[3][13] = TileId.Empty;
            crossroadsLevel[17][7] = TileId.Empty; // Bottom street connections
            crossroadsLevel[17][13] = TileId.Empty;
            crossroadsLevel[7][3] = TileId.Empty; // Left street connections
            crossroadsLevel[13][3] = TileId.Empty;
            crossroadsLevel[7][17] = TileId.Empty; // Right street connections
            crossroadsLevel[13][17] = TileId.Empty;
            // Spawns (ensuring empty spaces)
            crossroadsLevel[1][1] = TileId.PacSpawn;
            crossroadsLevel[10][10] = TileId.GhostSpawn; // Central intersection guard
            crossroadsLevel[4][4] = TileId.GhostSpawn; // Quadrant guards
            crossroadsLevel[4][16] = TileId.GhostSpawn;
            crossroadsLevel[16][4] = TileId.GhostSpawn;
            crossroadsLevel[16][16] = TileId.GhostSpawn;
            crossroadsLevel[6][10] = TileId.GhostSpawn; // Street patrol
            crossroadsLevel[14][10] = TileId.GhostSpawn;
            crossroadsLevel[10][6] = TileId.GhostSpawn;
            crossroadsLevel[10][14] = TileId.GhostSpawn;
            // Power pellets at street corners (empty spaces)
            crossroadsLevel[2][2] = TileId.PowerPellet;
            crossroadsLevel[2][18] = TileId.PowerPellet;
            crossroadsLevel[18][2] = TileId.PowerPellet;
            crossroadsLevel[18][18] = TileId.PowerPellet;
            // Traffic rewards (empty spaces)
            crossroadsLevel[5][10] = TileId.Cherry; // Main road rewards
            crossroadsLevel[15][10] = TileId.Cherry;
            crossroadsLevel[10][5] = TileId.Cherry;
            crossroadsLevel[10][15] = TileId.Cherry;
            crossroadsLevel[4][7] = TileId.Cherry; // Side street rewards
            crossroadsLevel[4][13] = TileId.Cherry;
            crossroadsLevel[16][7] = TileId.Cherry;
            crossroadsLevel[16][13] = TileId.Cherry;
            // Junction portals
            crossroadsLevel[10][1] = TileId.PortalA;
            crossroadsLevel[10][19] = TileId.PortalB;
            // Extra life at central intersection
            crossroadsLevel[9][10] = TileId.ExtraLife;

            introMazes.push({
              id: Date.now() + 33,
              name: "The Crossroads",
              width: 21,
              height: 21,
              tiles: crossroadsLevel.flat(),
              wallColor: 'bg-orange-500',
              createdAt: new Date().toISOString()
            });

            return introMazes;
         

// Validation logic
const ITEMS_TO_CHECK = [TileId.PowerPellet, TileId.Cherry, TileId.GhostSpawn, TileId.PacSpawn];

function validateLevel(level) {
    const errors = [];
    const grid = [];
    
    // Convert flat tiles array to 2D grid
    for (let y = 0; y < level.height; y++) {
        const row = [];
        for (let x = 0; x < level.width; x++) {
            row.push(level.tiles[y * level.width + x] || TileId.Empty);
        }
        grid.push(row);
    }
    
    // Check each position for misplaced items
    for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
            const tile = grid[y][x];
            
            // Check if this is an item that should not be on a wall
            if (ITEMS_TO_CHECK.includes(tile)) {
                // Check if this position should be a wall based on surrounding context
                const isBorder = (x === 0 || x === level.width - 1 || y === 0 || y === level.height - 1);
                
                if (isBorder) {
                    errors.push({
                        x: x,
                        y: y,
                        tile: tile,
                        issue: `${getTileName(tile)} placed on border wall at (${x}, ${y})`
                    });
                }
            }
        }
    }
    
    return {
        level: level,
        grid: grid,
        errors: errors,
        isValid: errors.length === 0
    };
}

function fixLevel(validationResult) {
    if (validationResult.isValid) {
        return validationResult.level;
    }
    
    const level = JSON.parse(JSON.stringify(validationResult.level)); // Deep copy
    const grid = validationResult.grid.map(row => [...row]); // Deep copy grid
    const fixes = [];
    
    // Find Pacman and ghost spawn points for pathfinding validation
    let pacSpawn = null;
    const ghostSpawns = [];
    
    for (let sy = 0; sy < level.height; sy++) {
        for (let sx = 0; sx < level.width; sx++) {
            if (grid[sy][sx] === TileId.PacSpawn) {
                pacSpawn = { x: sx, y: sy };
            } else if (grid[sy][sx] === TileId.GhostSpawn) {
                ghostSpawns.push({ x: sx, y: sy });
            }
        }
    }
    
    for (const error of validationResult.errors) {
        const { x, y, tile } = error;
        
        // Replace the wall/problematic position with a standard wall
        grid[y][x] = TileId.Wall;
        
        // Find a nearby empty space to relocate the item with full pathfinding validation
        const newPos = findNearestEmptySpace(grid, x, y, level.width, level.height, pacSpawn, ghostSpawns, tile);
        
        if (newPos) {
            grid[newPos.y][newPos.x] = tile;
            fixes.push({
                from: { x, y },
                to: newPos,
                tile: tile,
                description: `Moved ${getTileName(tile)} from (${x}, ${y}) to (${newPos.x}, ${newPos.y})`
            });
        } else {
            fixes.push({
                from: { x, y },
                to: null,
                tile: tile,
                description: `Removed ${getTileName(tile)} from (${x}, ${y}) - no suitable relocation found`
            });
        }
    }
    
    // Convert grid back to flat array
    level.tiles = grid.flat();
    
    return {
        ...level,
        fixes: fixes
    };
}

function findNearestEmptySpace(grid, startX, startY, width, height, pacSpawn, ghostSpawns, itemType) {
    const visited = new Set();
    const queue = [{ x: startX, y: startY, distance: 0 }];
    const candidates = [];
    
    while (queue.length > 0) {
        const { x, y, distance } = queue.shift();
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        // Check if this position is empty and not on border
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1 && 
            grid[y][x] === TileId.Empty) {
            
            // Full pathfinding validation instead of just local accessibility
            let isValidLocation = true;
            
            // Check Pacman accessibility for all items
            if (pacSpawn && !isAccessibleToPacman(grid, pacSpawn.x, pacSpawn.y, x, y, width, height)) {
                isValidLocation = false;
            }
            
            // Check ghost accessibility for pellet items
            if (isValidLocation && PELLET_ITEMS.includes(itemType) && ghostSpawns && ghostSpawns.length > 0) {
                if (!isAccessibleToGhost(grid, ghostSpawns, x, y, width, height)) {
                    isValidLocation = false;
                }
            }
            
            if (isValidLocation) {
                candidates.push({ x, y, distance });
                // Return the first valid candidate for efficiency
                if (candidates.length === 1) {
                    return candidates[0];
                }
            }
        }
        
        // Add neighbors to queue
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    queue.push({ x: nx, y: ny, distance: distance + 1 });
                }
            }
        }
        
        // Increased search distance for better results, but with reasonable limit
        if (distance > 20) break;
    }
    
    // Return the best candidate if we found any
    return candidates.length > 0 ? candidates.sort((a, b) => a.distance - b.distance)[0] : null;
}

function getTileName(tileId) {
    const names = {
        [TileId.Empty]: 'Empty',
        [TileId.Wall]: 'Wall',
        [TileId.Pellet]: 'Pellet',
        [TileId.PowerPellet]: 'Power Pellet',
        [TileId.PacSpawn]: 'Pacman Spawn',
        [TileId.GhostSpawn]: 'Ghost Spawn',
        [TileId.GhostDoor]: 'Ghost Door',
        [TileId.FruitSpawn]: 'Fruit Spawn',
        [TileId.PortalA]: 'Portal A',
        [TileId.PortalB]: 'Portal B',
        [TileId.Cherry]: 'Cherry',
        [TileId.Black]: 'Black',
        [TileId.ExtraLife]: 'Extra Life'
    };
    return names[tileId] || `Unknown (${tileId})`;
}

// Main execution
console.log('Extracting and validating all stock levels...');
const stockLevels = createIntroMazes();
console.log(`Found ${stockLevels.length} stock levels`);

let totalErrors = 0;
let fixedLevels = [];

for (const level of stockLevels) {
    console.log(`\nValidating level: ${level.name}`);
    const result = validateLevel(level);
    
    if (!result.isValid) {
        console.log(`  ❌ Found ${result.errors.length} issue(s):`);
        for (const error of result.errors) {
            console.log(`    - ${error.issue}`);
        }
        
        console.log(`  🔧 Fixing level...`);
        const fixedLevel = fixLevel(result);
        fixedLevels.push(fixedLevel);
        
        console.log(`  ✅ Applied ${fixedLevel.fixes.length} fix(es):`);
        for (const fix of fixedLevel.fixes) {
            console.log(`    - ${fix.description}`);
        }
        
        totalErrors += result.errors.length;
    } else {
        console.log(`  ✅ No issues found`);
        fixedLevels.push(level);
    }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total levels processed: ${stockLevels.length}`);
console.log(`Total errors found: ${totalErrors}`);
console.log(`Levels fixed: ${fixedLevels.filter(l => l.fixes).length}`);

// Save fixed levels
const outputData = {
    timestamp: new Date().toISOString(),
    summary: {
        totalLevels: stockLevels.length,
        totalErrors: totalErrors,
        levelsFixed: fixedLevels.filter(l => l.fixes).length
    },
    levels: fixedLevels
};

fs.writeFileSync('fixed_stock_levels.json', JSON.stringify(outputData, null, 2));
console.log('\n📁 Fixed levels saved to fixed_stock_levels.json');
