// Level Validator and Fixer for Pacman Stock Levels
const fs = require('fs');

// Game constants
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

// Items that should not be on walls or surrounded by walls
const ITEMS_TO_CHECK = [TileId.PowerPellet, TileId.Cherry, TileId.GhostSpawn, TileId.PacSpawn, TileId.ExtraLife];

// Items that must be accessible to both Pacman and ghosts for proper gameplay
const PELLET_ITEMS = [TileId.Pellet, TileId.PowerPellet, TileId.Cherry, TileId.ExtraLife];

// Items that should be accessible to Pacman but don't need ghost access
const PACMAN_ONLY_ITEMS = [TileId.FruitSpawn];

// Portal tiles that need exit validation
const PORTAL_ITEMS = [TileId.PortalA, TileId.PortalB];

function makeGrid(width, height, fillValue = TileId.Empty) {
    const grid = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push(fillValue);
        }
        grid.push(row);
    }
    return grid;
}

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
    
    // Find Pacman spawn position
    let pacSpawn = null;
    for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
            if (grid[y][x] === TileId.PacSpawn) {
                pacSpawn = { x, y };
                break;
            }
        }
        if (pacSpawn) break;
    }
    
    if (!pacSpawn) {
        errors.push({
            x: -1,
            y: -1,
            tile: TileId.PacSpawn,
            issue: 'No Pacman spawn point found in level'
        });
    }
    
    // Find all ghost spawn positions
    const ghostSpawns = [];
    for (let y = 0; y < level.height; y++) {
        for (let x = 0; x < level.width; x++) {
            if (grid[y][x] === TileId.GhostSpawn) {
                ghostSpawns.push({ x, y });
            }
        }
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
                
                // Check if surrounded by walls (likely misplaced)
                let wallCount = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < level.width && ny >= 0 && ny < level.height) {
                            if (grid[ny][nx] === TileId.Wall) wallCount++;
                        }
                    }
                }
                
                if (wallCount >= 6) {
                    errors.push({
                        x: x,
                        y: y,
                        tile: tile,
                        issue: `${getTileName(tile)} at (${x}, ${y}) is surrounded by ${wallCount} walls - possibly misplaced`
                    });
                }
            }
            
            // Check if pellets are accessible to Pacman
            if (PELLET_ITEMS.includes(tile) && pacSpawn) {
                if (!isAccessibleToPacman(grid, pacSpawn.x, pacSpawn.y, x, y, level.width, level.height)) {
                    errors.push({
                        x: x,
                        y: y,
                        tile: tile,
                        issue: `${getTileName(tile)} at (${x}, ${y}) is not accessible to Pacman - blocked by walls or ghost doors`
                    });
                }
            }
            
            // Check if pellets are accessible to ghosts (important for game balance)
            if (PELLET_ITEMS.includes(tile) && ghostSpawns.length > 0) {
                if (!isAccessibleToGhost(grid, ghostSpawns, x, y, level.width, level.height)) {
                    errors.push({
                        x: x,
                        y: y,
                        tile: tile,
                        issue: `${getTileName(tile)} at (${x}, ${y}) is not accessible to ghosts - they cannot chase Pacman to this location`
                    });
                }
            }
            
            // Check if ghost spawns are accessible to Pacman (Pacman should be able to reach ghost areas)
            if (tile === TileId.GhostSpawn && pacSpawn) {
                if (!isAccessibleToPacman(grid, pacSpawn.x, pacSpawn.y, x, y, level.width, level.height)) {
                    errors.push({
                        x: x,
                        y: y,
                        tile: tile,
                        issue: `${getTileName(tile)} at (${x}, ${y}) is not accessible to Pacman - creates isolated ghost area`
                    });
                }
            }
            
            // Check if fruit spawns and other Pacman-only items are accessible
            if (PACMAN_ONLY_ITEMS.includes(tile) && pacSpawn) {
                if (!isAccessibleToPacman(grid, pacSpawn.x, pacSpawn.y, x, y, level.width, level.height)) {
                    errors.push({
                        x: x,
                        y: y,
                        tile: tile,
                        issue: `${getTileName(tile)} at (${x}, ${y}) is not accessible to Pacman`
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
    
    for (const error of validationResult.errors) {
        const { x, y, tile } = error;
        
        // Replace the wall/problematic position with a standard wall
        grid[y][x] = TileId.Wall;
        
        // Find a nearby empty space to relocate the item
        const newPos = findNearestEmptySpace(grid, x, y, level.width, level.height);
        
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

function isAccessibleToPacman(grid, pacX, pacY, targetX, targetY, width, height) {
    // Use BFS to check if target position is reachable from Pacman spawn
    const visited = new Set();
    const queue = [{ x: pacX, y: pacY }];
    
    while (queue.length > 0) {
        const { x, y } = queue.shift();
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        // Found the target
        if (x === targetX && y === targetY) {
            return true;
        }
        
        // Add neighbors to queue (only if passable for Pacman)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                // Only check cardinal directions (no diagonal movement)
                if ((dx === 0) === (dy === 0)) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const tile = grid[ny][nx];
                    // Pacman can move through empty spaces, pellets, power pellets, cherries, extra lives, portals, and fruit spawns
                    // But NOT through walls or ghost doors
                    if (tile !== TileId.Wall && tile !== TileId.GhostDoor) {
                        const neighborKey = `${nx},${ny}`;
                        if (!visited.has(neighborKey)) {
                            queue.push({ x: nx, y: ny });
                        }
                    }
                }
            }
        }
    }
    
    return false; // Target not reachable
}

function isAccessibleToGhost(grid, ghostSpawns, targetX, targetY, width, height) {
    // Check if target position is reachable from any ghost spawn point
    // Ghosts can move through empty spaces, pellets, power pellets, cherries, extra lives, portals, fruit spawns, and ghost doors
    // But NOT through walls
    
    for (const spawn of ghostSpawns) {
        const visited = new Set();
        const queue = [{ x: spawn.x, y: spawn.y }];
        
        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Found the target
            if (x === targetX && y === targetY) {
                return true;
            }
            
            // Add neighbors to queue (only if passable for ghosts)
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    // Only check cardinal directions (no diagonal movement)
                    if ((dx === 0) === (dy === 0)) continue;
                    
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const tile = grid[ny][nx];
                        // Ghosts can move through everything except walls
                        if (tile !== TileId.Wall) {
                            const neighborKey = `${nx},${ny}`;
                            if (!visited.has(neighborKey)) {
                                queue.push({ x: nx, y: ny });
                            }
                        }
                    }
                }
            }
        }
    }
    
    return false; // Target not reachable from any ghost spawn
}

function findNearestEmptySpace(grid, startX, startY, width, height) {
    const visited = new Set();
    const queue = [{ x: startX, y: startY, distance: 0 }];
    
    while (queue.length > 0) {
        const { x, y, distance } = queue.shift();
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        // Check if this position is empty and not on border
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1 && 
            grid[y][x] === TileId.Empty) {
            return { x, y };
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
        
        // Limit search distance to avoid infinite loops
        if (distance > 10) break;
    }
    
    return null;
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

// Load levels from localStorage or create test levels
function loadLevelsFromBrowser() {
    // Since we can't access localStorage from Node.js, we'll create some test levels
    // In a real scenario, you'd export the levels from the browser
    
    const testLevels = [];
    
    // Test level 1: Tutorial with potential issues
    const tutorial = makeGrid(19, 22, TileId.Empty);
    // Border walls
    for (let y = 0; y < 22; y++) {
        for (let x = 0; x < 19; x++) {
            if (y === 0 || y === 21 || x === 0 || x === 18) tutorial[y][x] = TileId.Wall;
        }
    }
    // Internal structure
    for (let x = 3; x < 16; x++) tutorial[5][x] = TileId.Wall;
    for (let x = 2; x < 17; x++) if (x % 2 === 0) tutorial[9][x] = TileId.Wall;
    
    // Correct placements
    tutorial[1][1] = TileId.PacSpawn;
    tutorial[8][9] = TileId.GhostSpawn;
    tutorial[2][2] = TileId.PowerPellet;
    tutorial[2][16] = TileId.PowerPellet;
    
    // Intentional errors for testing
    tutorial[0][5] = TileId.PowerPellet; // Power pellet on border wall
    tutorial[21][7] = TileId.Cherry; // Cherry on border wall
    
    testLevels.push({
        name: "Tutorial (Test)",
        width: 19,
        height: 22,
        tiles: tutorial.flat()
    });
    
    // Test level 2: Simple level with errors including inaccessible pellets
    const simple = makeGrid(15, 15, TileId.Empty);
    // Border walls
    for (let y = 0; y < 15; y++) {
        for (let x = 0; x < 15; x++) {
            if (y === 0 || y === 14 || x === 0 || x === 14) simple[y][x] = TileId.Wall;
        }
    }
    
    // Create a walled-off section with inaccessible pellets
    for (let x = 8; x <= 12; x++) simple[7][x] = TileId.Wall;
    for (let y = 8; y <= 12; y++) simple[y][8] = TileId.Wall;
    for (let y = 8; y <= 12; y++) simple[y][12] = TileId.Wall;
    for (let x = 8; x <= 12; x++) simple[12][x] = TileId.Wall;
    
    // Correct placements
    simple[7][7] = TileId.GhostSpawn;
    simple[2][2] = TileId.PacSpawn;
    simple[3][3] = TileId.PowerPellet;
    simple[4][4] = TileId.Cherry; // Accessible cherry
    
    // Intentional errors
    simple[0][7] = TileId.GhostSpawn; // Ghost on border
    simple[14][3] = TileId.Cherry; // Cherry on border
    simple[10][10] = TileId.PowerPellet; // Inaccessible power pellet (walled off)
    simple[9][11] = TileId.Cherry; // Inaccessible cherry (walled off)
    
    testLevels.push({
        name: "Simple Test Level",
        width: 15,
        height: 15,
        tiles: simple.flat()
    });
    
    return testLevels;
}

// Main execution
console.log('🎮 Pacman Level Validator & Fixer');
console.log('==================================');

const levels = loadLevelsFromBrowser();
console.log(`📚 Loaded ${levels.length} test levels`);

let totalErrors = 0;
let fixedLevels = [];

for (const level of levels) {
    console.log(`\n🔍 Validating level: ${level.name}`);
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

console.log(`\n📊 SUMMARY`);
console.log(`==========`);
console.log(`Total levels processed: ${levels.length}`);
console.log(`Total errors found: ${totalErrors}`);
console.log(`Levels fixed: ${fixedLevels.filter(l => l.fixes).length}`);

// Save fixed levels
const outputData = {
    timestamp: new Date().toISOString(),
    summary: {
        totalLevels: levels.length,
        totalErrors: totalErrors,
        levelsFixed: fixedLevels.filter(l => l.fixes).length
    },
    levels: fixedLevels
};

fs.writeFileSync('fixed_levels_output.json', JSON.stringify(outputData, null, 2));
console.log('\n📁 Fixed levels saved to fixed_levels_output.json');

console.log('\n🚀 Next steps:');
console.log('1. Export your actual levels from the browser localStorage');
console.log('2. Replace the test levels in this script with your real levels');
console.log('3. Run this script again to validate and fix all stock levels');
console.log('4. Import the fixed levels back into your game');
