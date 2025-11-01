// Script to apply level fixes directly to the main index.html file
const fs = require('fs');
const path = require('path');

console.log('🎮 Pacman Level Fix Applicator');
console.log('===============================');

// Read the main index.html file
const indexPath = path.join(__dirname, '..', 'index.html');
console.log('📖 Reading index.html at:', indexPath);
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Backup the original file
const backupName = `index_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.html`;
fs.writeFileSync(backupName, indexContent);
console.log(`💾 Created backup: ${backupName}`);

// List of known problematic placements found in the analysis
const fixes = [
    // These are the actual issues found in the stock levels
    {
        level: 'advLevel1',
        issue: 'Power pellet on border',
        search: 'advLevel1[20][1] = TileId.PowerPellet;',
        replace: 'advLevel1[19][1] = TileId.PowerPellet;',
        description: 'Move power pellet from border (20,1) to (19,1)'
    },
    {
        level: 'advLevel5',
        issue: 'Ghost spawn on border',
        search: 'advLevel5[20][3] = TileId.GhostSpawn; // Bottom level',
        replace: 'advLevel5[19][3] = TileId.GhostSpawn; // Bottom level',
        description: 'Move ghost spawn from border (20,3) to (19,3)'
    },
    {
        level: 'advLevel5',
        issue: 'Ghost spawn on border',
        search: 'advLevel5[20][15] = TileId.GhostSpawn;',
        replace: 'advLevel5[19][15] = TileId.GhostSpawn;',
        description: 'Move ghost spawn from border (20,15) to (19,15)'
    },
    {
        level: 'advLevel5',
        issue: 'Power pellet on border',
        search: 'advLevel5[20][9] = TileId.PowerPellet;',
        replace: 'advLevel5[19][9] = TileId.PowerPellet;',
        description: 'Move power pellet from border (20,9) to (19,9)'
    },
    {
        level: 'advLevel9',
        issue: 'Power pellet on border',
        search: 'advLevel9[20][1] = TileId.PowerPellet;',
        replace: 'advLevel9[19][1] = TileId.PowerPellet;',
        description: 'Move power pellet from border (20,1) to (19,1)'
    },
    {
        level: 'advLevel9',
        issue: 'Power pellet on border',
        search: 'advLevel9[20][17] = TileId.PowerPellet;',
        replace: 'advLevel9[19][17] = TileId.PowerPellet;',
        description: 'Move power pellet from border (20,17) to (19,17)'
    },
    {
        level: 'advLevel10',
        issue: 'Power pellet on border',
        search: 'advLevel10[20][1] = TileId.PowerPellet;',
        replace: 'advLevel10[19][1] = TileId.PowerPellet;',
        description: 'Move power pellet from border (20,1) to (19,1)'
    },
    {
        level: 'advLevel10',
        issue: 'Power pellet on border',
        search: 'advLevel10[20][17] = TileId.PowerPellet;',
        replace: 'advLevel10[19][17] = TileId.PowerPellet;',
        description: 'Move power pellet from border (20,17) to (19,17)'
    },
    {
        level: 'factoryLevel',
        issue: 'Ghost spawn on border',
        search: 'factoryLevel[20][11] = TileId.GhostSpawn; // Security ghost',
        replace: 'factoryLevel[19][11] = TileId.GhostSpawn; // Security ghost',
        description: 'Move ghost spawn from border (20,11) to (19,11)'
    },
    {
        level: 'factoryLevel',
        issue: 'Power pellet on border',
        search: 'factoryLevel[21][3] = TileId.PowerPellet;',
        replace: 'factoryLevel[20][3] = TileId.PowerPellet;',
        description: 'Move power pellet from border (21,3) to (20,3)'
    },
    {
        level: 'factoryLevel',
        issue: 'Power pellet on border',
        search: 'factoryLevel[21][19] = TileId.PowerPellet;',
        replace: 'factoryLevel[20][19] = TileId.PowerPellet;',
        description: 'Move power pellet from border (21,19) to (20,19)'
    }
];

let appliedFixes = 0;
let skippedFixes = 0;

console.log(`🔧 Applying ${fixes.length} fixes...`);

for (const fix of fixes) {
    if (indexContent.includes(fix.search)) {
        indexContent = indexContent.replace(fix.search, fix.replace);
        appliedFixes++;
        console.log(`  ✅ ${fix.level}: ${fix.description}`);
    } else {
        skippedFixes++;
        console.log(`  ⚠️  ${fix.level}: Could not find "${fix.search}" - may already be fixed`);
    }
}

// Write the fixed file
fs.writeFileSync(indexPath, indexContent);

console.log(`\n📊 SUMMARY`);
console.log(`==========`);
console.log(`Fixes applied: ${appliedFixes}`);
console.log(`Fixes skipped: ${skippedFixes}`);
console.log(`Total fixes attempted: ${fixes.length}`);

if (appliedFixes > 0) {
    console.log(`\n✅ Successfully applied ${appliedFixes} fixes to index.html`);
    console.log(`💾 Original file backed up as: ${backupName}`);
    console.log(`🎮 Your game levels have been fixed!`);
} else {
    console.log(`\n🎯 No fixes were needed - all levels appear to be correct already!`);
}

console.log(`\n🚀 Next steps:`);
console.log(`1. Test your game to ensure all levels work correctly`);
console.log(`2. If there are issues, restore from backup: ${backupName}`);
console.log(`3. Use the level_scanner.html tool for comprehensive validation`);
