// Script to extract and validate all stock levels from the main game
const fs = require('fs');

console.log('Extracting level creation code from index.html...');

// Read the main index.html file
const path = require('path');
const indexPath = path.join(__dirname, '..', 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Extract the createIntroMazes function
const functionStart = indexContent.indexOf('const createIntroMazes = () => {');
const functionEnd = indexContent.indexOf('return introMazes;') + 'return introMazes;'.length;

if (functionStart === -1 || functionEnd === -1) {
    console.error('Could not find createIntroMazes function');
    process.exit(1);
}

const functionCode = indexContent.substring(functionStart, functionEnd + 10); // +10 for closing braces

// Extract TileId constants
const tileIdStart = indexContent.indexOf('const TileId = {');
const tileIdEnd = indexContent.indexOf('};', tileIdStart) + 2;
const tileIdCode = indexContent.substring(tileIdStart, tileIdEnd);

// Extract makeGrid function
const makeGridStart = indexContent.indexOf('const makeGrid = (');
const makeGridEnd = indexContent.indexOf('};', makeGridStart) + 2;
const makeGridCode = indexContent.substring(makeGridStart, makeGridEnd);

console.log('Creating validation script...');

// Create a complete validation script
const validationScript = `
${tileIdCode}

${makeGridCode}

${functionCode}

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
                        issue: \`\${getTileName(tile)} placed on border wall at (\${x}, \${y})\`
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
                description: \`Moved \${getTileName(tile)} from (\${x}, \${y}) to (\${newPos.x}, \${newPos.y})\`
            });
        } else {
            fixes.push({
                from: { x, y },
                to: null,
                tile: tile,
                description: \`Removed \${getTileName(tile)} from (\${x}, \${y}) - no suitable relocation found\`
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

function findNearestEmptySpace(grid, startX, startY, width, height) {
    const visited = new Set();
    const queue = [{ x: startX, y: startY, distance: 0 }];
    
    while (queue.length > 0) {
        const { x, y, distance } = queue.shift();
        const key = \`\${x},\${y}\`;
        
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
    return names[tileId] || \`Unknown (\${tileId})\`;
}

// Main execution
console.log('Extracting and validating all stock levels...');
const stockLevels = createIntroMazes();
console.log(\`Found \${stockLevels.length} stock levels\`);

let totalErrors = 0;
let fixedLevels = [];

for (const level of stockLevels) {
    console.log(\`\\nValidating level: \${level.name}\`);
    const result = validateLevel(level);
    
    if (!result.isValid) {
        console.log(\`  ❌ Found \${result.errors.length} issue(s):\`);
        for (const error of result.errors) {
            console.log(\`    - \${error.issue}\`);
        }
        
        console.log(\`  🔧 Fixing level...\`);
        const fixedLevel = fixLevel(result);
        fixedLevels.push(fixedLevel);
        
        console.log(\`  ✅ Applied \${fixedLevel.fixes.length} fix(es):\`);
        for (const fix of fixedLevel.fixes) {
            console.log(\`    - \${fix.description}\`);
        }
        
        totalErrors += result.errors.length;
    } else {
        console.log(\`  ✅ No issues found\`);
        fixedLevels.push(level);
    }
}

console.log(\`\\n=== SUMMARY ===\`);
console.log(\`Total levels processed: \${stockLevels.length}\`);
console.log(\`Total errors found: \${totalErrors}\`);
console.log(\`Levels fixed: \${fixedLevels.filter(l => l.fixes).length}\`);

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
console.log('\\n📁 Fixed levels saved to fixed_stock_levels.json');
`;

fs.writeFileSync('level_validator.js', validationScript);
console.log('Level validation script created: level_validator.js');
