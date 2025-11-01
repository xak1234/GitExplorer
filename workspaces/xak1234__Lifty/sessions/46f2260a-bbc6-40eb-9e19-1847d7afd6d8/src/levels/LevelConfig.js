// Level Configuration System
// Each level has its own settings that don't affect other levels

const LEVEL_CONFIGS = {
  // AllLevels: Settings that apply to every level
  AllLevels: {
    // Core physics (never changes across levels)
    gravity: 0.8,
    terminalVelocity: 12,
    jumpBaseVelocity: -8.0,
    maxSpeedX: 180,
    accelX: 1600,
    frictionGround: 1800,
    frictionAir: 600,
    
    // Player constants
    playerWidth: 22,
    playerHeight: 43,
    footClearance: 8,
    floorExtraClearance: 6,
    
    // Lift constants
    liftWidth: 100,
    liftHeight: 180,
    
    // UI/Display
    canvasWidth: 680,
    canvasHeight: 750,
    
    // Death thresholds
    bigFallDeathHeight: 360, // 2x lift height
    
    // Jump mechanics
    jumpCooldown: 10,
    jumpGracePeriod: 10,
    airTicksMinForBigFall: 25,
    // Balloon dog defaults (disabled unless overridden per-level)
    hasBalloonDogs: false,
    balloonDogMaxCount: 0,
    balloonDogSpawnRange: [240, 360],
    balloonDogSpeedRange: [0.8, 1.4],
    balloonDogYRange: [160, 240],
    balloonDogBiteRadius: 26,
    
    // Flying toilet defaults (disabled unless overridden per-level)
    hasFlyingToilets: false,
    flyingToiletMaxCount: 0,
    flyingToiletSpawnRange: [200, 300],
    flyingToiletSpeedRange: [0.6, 1.2],
    flyingToiletYRange: [150, 280],
    flyingToiletBiteRadius: 30,
    
    // Machine gun drops (disabled unless overridden per-level)
    hasMachineGunDrops: false,
    machineGunDropCount: 0,
    machineGunBulletsPerShot: 3,
    machineGunBulletSpeed: 8,
    
    // Cowboy hat balloons (disabled unless overridden per-level)
    hasCowboyHatBalloons: false,
    cowboyHatBalloonSpawnRange: [300, 600], // Frames between spawns
    cowboyHatBalloonSpeed: 1.5, // Fall speed
  },

  // Level 1: Tutorial level with cherries
  Level1: {
    // Lift speeds - each lift randomized independently
    centerLiftSpeed: 2,
    baseLiftSpeed: 2,
    centerLiftSpeedRange: [1.5, 2.8],
    leftLiftSpeedRange: [1.2, 3.2],
    rightLiftSpeedRange: [1.2, 3.2],
    
    // Platform settings
    platformColors: ['#dd4444', '#4488ff', '#f0d000', '#f0d000'],
    platformDensityRange: [2, 3], // every N rows
    
    // Collectibles
    hasLeftCherry: true,
    hasRightCherry: true,
    hasGoldenKeys: false,
    
    // Special mechanics
    hasLevers: true,
    hasDoors: true,
    
    // Background
    backgroundImage: 'lift1.jpg',
    
    // Completion condition
    completionType: 'collectAllCherries', // or 'reachBottom', 'surviveTime', etc.
  },

  // Level 2: Faster lifts, no cherries
  Level2: {
    // Lift speeds (faster than level 1) - random irrational speeds
    centerLiftSpeed: 2.5,
    baseLiftSpeed: 2.5,
    centerLiftSpeedRange: [1.5, 3.5],
    leftLiftSpeedRange: [0.8, 4.0], // More unpredictable
    rightLiftSpeedRange: [0.8, 4.0],
    
    // Platform settings
    platformColors: ['#ff6644', '#44aaff', '#ffdd00', '#ffdd00'],
    platformDensityRange: [2, 4],
    
    // Collectibles
    hasLeftCherry: false,
    hasRightCherry: false,
    hasGoldenKeys: true, // new collectible type
    
    // Special mechanics
    hasLevers: true,
    hasDoors: true,
    hasCrushingCeiling: true, // ceiling continues moving down after lift hits ground

    // Background
    backgroundImage: 'lift2.jpg',
    
    // Completion condition
    completionType: 'reachBottom',
  },

  // Level 3: Even faster, different platform pattern
  Level3: {
    // Lift speeds - more irrational
    centerLiftSpeed: 3.0,
    baseLiftSpeed: 3.0,
    centerLiftSpeedRange: [1.5, 4.5],
    leftLiftSpeedRange: [0.5, 5.0], // Wider range = more chaos
    rightLiftSpeedRange: [0.5, 5.0],
    
    // Platform settings
    platformColors: ['#cc2222', '#2266cc', '#cccc00', '#cccc00'],
    platformDensityRange: [3, 4],
    
    // Collectibles
    hasLeftCherry: true,
    hasRightCherry: true,
    hasCenterCherry: true,
    hasGoldenKeys: true,
    
    // Special mechanics
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true, // new hazard
    
    // Background
    backgroundImage: 'lift3.jpg',
    
    // Completion condition
    completionType: 'collectAllCherries',
  },

  // Level 4: Wrap mode begins
  Level4: {
    // Lift speeds - increasingly irrational
    centerLiftSpeed: 3.5,
    baseLiftSpeed: 3.5,
    centerLiftSpeedRange: [2.0, 5.5],
    leftLiftSpeedRange: [0.3, 6.0], // Very wide range
    rightLiftSpeedRange: [0.3, 6.0],
    
    // Platform settings - static platforms
    platformColors: ['#aa1111', '#1155aa', '#aaaa11', '#aaaa11'],
    platformDensityRange: [2, 2],
    
    // Collectibles
    hasLeftCherry: false,
    hasRightCherry: false,
    hasGoldenKeys: true,
    hasPlatformCherries: true,
    platformCherryColumn: 0, // Column 0 (left gutter)
    platformCherryInterval: 8, // Every 8th platform
    
    // Special mechanics
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true, // new hazard
    
    // Machine gun
    hasMachineGunDrops: true,
    machineGunDropCount: 2,
    
    // Background
    backgroundImage: 'lift4.jpg',
    
    // Completion condition
    completionType: 'reachBottom',
  },

  // Level 5: Maximum difficulty
  Level5: {
    // Lift speeds - extremely irrational
    centerLiftSpeed: 4.0,
    baseLiftSpeed: 4.0,
    centerLiftSpeedRange: [2.0, 6.5],
    leftLiftSpeedRange: [0.2, 7.0], // Extreme range
    rightLiftSpeedRange: [0.2, 7.0],
    
    // Platform settings
    platformColors: ['#990000', '#003399', '#999900', '#999900'],
    platformDensityRange: [3, 5],
    
    // Collectibles
    hasLeftCherry: false,
    hasRightCherry: false,
    hasGoldenKeys: true,
    
    // Special mechanics
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true,
    hasLaserBeams: true, // new hazard
    
    // Machine gun
    hasMachineGunDrops: true,
    machineGunDropCount: 2,
    
    // Cowboy hat balloons (unlocked after level 4)
    hasCowboyHatBalloons: true,
    
    // Background
    backgroundImage: 'lift5.jpg',
    
    // Completion condition
    completionType: 'reachBottom',
  },

  // Level 6: Increased challenge
  Level6: {
    centerLiftSpeed: 4.2,
    baseLiftSpeed: 4.2,
    centerLiftSpeedRange: [2.0, 7.0],
    leftLiftSpeedRange: [0.1, 8.0], // Wildly unpredictable
    rightLiftSpeedRange: [0.1, 8.0],
    
    platformColors: ['#cc0000', '#0044cc', '#cccc00', '#cccc00'],
    platformDensityRange: [3, 5],
    
    hasLeftCherry: true,
    hasRightCherry: true,
    hasGoldenKeys: true,
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasFlyingToilets: true,
    
    // Machine gun
    hasMachineGunDrops: true,
    machineGunDropCount: 2,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift6.jpg',
    completionType: 'collectAllCherries',
  },

  // Level 7: Extreme speed
  Level7: {
    centerLiftSpeed: 4.5,
    baseLiftSpeed: 4.5,
    centerLiftSpeedRange: [2.5, 8.0],
    leftLiftSpeedRange: [0.1, 9.0], // Insanely unpredictable
    rightLiftSpeedRange: [0.1, 9.0],
    
    platformColors: ['#ff0000', '#0055ff', '#ffff00', '#ffff00'],
    platformDensityRange: [3, 6],
    
    hasLeftCherry: false,
    hasRightCherry: false,
    hasGoldenKeys: true,
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true,
    hasFlyingToilets: true,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift7.jpg',
    completionType: 'reachBottom',
  },

  // Level 8: Master level
  Level8: {
    centerLiftSpeed: 4.8,
    baseLiftSpeed: 4.8,
    centerLiftSpeedRange: [2.5, 9.0],
    leftLiftSpeedRange: [0.1, 10.0], // Near-impossible to predict
    rightLiftSpeedRange: [0.1, 10.0],
    
    platformColors: ['#aa0000', '#0033aa', '#aaaa00', '#aaaa00'],
    platformDensityRange: [4, 6],
    
    hasLeftCherry: true,
    hasRightCherry: true,
    hasCenterCherry: true,
    hasGoldenKeys: true,
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasFlyingToilets: true,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift8.jpg',
    completionType: 'collectAllCherries',
  },

  // Level 9: Expert level
  Level9: {
    centerLiftSpeed: 5.0,
    baseLiftSpeed: 5.0,
    centerLiftSpeedRange: [3.0, 10.0],
    leftLiftSpeedRange: [0.1, 11.0], // Completely chaotic
    rightLiftSpeedRange: [0.1, 11.0],
    
    platformColors: ['#880000', '#002288', '#888800', '#888800'],
    platformDensityRange: [4, 6],
    
    hasLeftCherry: false,
    hasRightCherry: false,
    hasGoldenKeys: true,
    hasPlatformCherries: true,
    platformCherryColumn: 1,
    platformCherryInterval: 6,
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true,
    hasFlyingToilets: true,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift9.jpg',
    completionType: 'reachBottom',
  },

  // Level 10: Ultimate challenge
  Level10: {
    centerLiftSpeed: 5.5,
    baseLiftSpeed: 5.5,
    centerLiftSpeedRange: [3.0, 11.0], // Maximum chaos
    leftLiftSpeedRange: [0.1, 12.0], // Maximum chaos and unpredictability
    rightLiftSpeedRange: [0.1, 12.0],
    
    platformColors: ['#660000', '#001166', '#666600', '#666600'],
    platformDensityRange: [5, 7],
    
    hasLeftCherry: true,
    hasRightCherry: true,
    hasCenterCherry: true,
    hasGoldenKeys: true,
    hasPlatformCherries: true,
    platformCherryColumn: 2,
    platformCherryInterval: 5,
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true,
    hasLaserBeams: true,
    hasFlyingToilets: true,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift10.jpg',
    completionType: 'collectAllCherries',
  },

  // Level 11: Beyond the limit - Extreme chaos
  Level11: {
    centerLiftSpeed: 6.0,
    baseLiftSpeed: 6.0,
    centerLiftSpeedRange: [3.5, 12.0],
    leftLiftSpeedRange: [0.1, 13.0], // Beyond maximum chaos
    rightLiftSpeedRange: [0.1, 13.0],
    
    platformColors: ['#440000', '#000044', '#444400', '#444400'],
    platformDensityRange: [5, 8],
    
    hasLeftCherry: false,
    hasRightCherry: false,
    hasGoldenKeys: true,
    hasPlatformCherries: true,
    platformCherryColumn: 0,
    platformCherryInterval: 4,
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true,
    hasLaserBeams: true,
    hasFlyingToilets: true,
    
    // Machine gun
    hasMachineGunDrops: true,
    machineGunDropCount: 3,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift1.jpg', // Cycle back to lift1
    completionType: 'reachBottom',
  },

  // Level 12: Insanity mode
  Level12: {
    centerLiftSpeed: 6.5,
    baseLiftSpeed: 6.5,
    centerLiftSpeedRange: [4.0, 13.0],
    leftLiftSpeedRange: [0.1, 14.0],
    rightLiftSpeedRange: [0.1, 14.0],
    
    platformColors: ['#330000', '#000033', '#333300', '#333300'],
    platformDensityRange: [6, 8],
    
    hasLeftCherry: true,
    hasRightCherry: true,
    hasCenterCherry: true,
    hasGoldenKeys: true,
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true,
    hasLaserBeams: true,
    hasFlyingToilets: true,
    
    // Machine gun
    hasMachineGunDrops: true,
    machineGunDropCount: 3,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift2.jpg',
    completionType: 'collectAllCherries',
  },

  // Level 13: Nightmare difficulty
  Level13: {
    centerLiftSpeed: 7.0,
    baseLiftSpeed: 7.0,
    centerLiftSpeedRange: [4.5, 14.0],
    leftLiftSpeedRange: [0.1, 15.0],
    rightLiftSpeedRange: [0.1, 15.0],
    
    platformColors: ['#220000', '#000022', '#222200', '#222200'],
    platformDensityRange: [6, 9],
    
    hasLeftCherry: false,
    hasRightCherry: false,
    hasGoldenKeys: true,
    hasPlatformCherries: true,
    platformCherryColumn: 1,
    platformCherryInterval: 3,
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true,
    hasLaserBeams: true,
    hasFlyingToilets: true,
    
    // Machine gun
    hasMachineGunDrops: true,
    machineGunDropCount: 4,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift3.jpg',
    completionType: 'reachBottom',
  },

  // Level 14: Hell mode
  Level14: {
    centerLiftSpeed: 7.5,
    baseLiftSpeed: 7.5,
    centerLiftSpeedRange: [5.0, 15.0],
    leftLiftSpeedRange: [0.1, 16.0],
    rightLiftSpeedRange: [0.1, 16.0],
    
    platformColors: ['#110000', '#000011', '#111100', '#111100'],
    platformDensityRange: [7, 9],
    
    hasLeftCherry: true,
    hasRightCherry: true,
    hasCenterCherry: true,
    hasGoldenKeys: true,
    hasPlatformCherries: true,
    platformCherryColumn: 2,
    platformCherryInterval: 2,
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true,
    hasLaserBeams: true,
    hasFlyingToilets: true,
    
    // Machine gun
    hasMachineGunDrops: true,
    machineGunDropCount: 4,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift4.jpg',
    completionType: 'collectAllCherries',
  },

  // Level 15: Ultimate nightmare
  Level15: {
    centerLiftSpeed: 8.0,
    baseLiftSpeed: 8.0,
    centerLiftSpeedRange: [5.5, 16.0],
    leftLiftSpeedRange: [0.1, 17.0], // Absolutely insane speeds
    rightLiftSpeedRange: [0.1, 17.0],
    
    platformColors: ['#000000', '#000000', '#000000', '#000000'], // Pure black for ultimate difficulty
    platformDensityRange: [7, 10],
    
    hasLeftCherry: true,
    hasRightCherry: true,
    hasCenterCherry: true,
    hasGoldenKeys: true,
    hasPlatformCherries: true,
    platformCherryColumn: 0,
    platformCherryInterval: 1, // Every platform!
    
    hasLevers: true,
    hasDoors: true,
    hasMovingSpikes: true,
    hasTimeBombs: true,
    hasLaserBeams: true,
    hasFlyingToilets: true,
    
    // Machine gun
    hasMachineGunDrops: true,
    machineGunDropCount: 5,
    
    // Cowboy hat balloons
    hasCowboyHatBalloons: true,
    
    backgroundImage: 'lift5.jpg',
    completionType: 'collectAllCherries',
  },
};

// Get configuration for a specific level
export const getLevelConfig = (level) => {
  const levelKey = `Level${level}`;
  const levelConfig = LEVEL_CONFIGS[levelKey] || LEVEL_CONFIGS.Level15; // fallback to Level15 for ultimate difficulty
  const allLevelsConfig = LEVEL_CONFIGS.AllLevels;
  
  // Merge AllLevels with specific level config (level-specific takes precedence)
  return {
    ...allLevelsConfig,
    ...levelConfig,
    level: level
  };
};

// Get all level configurations (for debugging)
export const getAllLevelConfigs = () => LEVEL_CONFIGS;

// Apply level configuration to game state
export const applyLevelConfig = (gameData, level) => {
  const config = getLevelConfig(level);

  // Apply lift speeds
  gameData.currentLiftSpeed = config.centerLiftSpeed;
  gameData.baseLiftSpeed = config.baseLiftSpeed;

  // Platform settings removed - now using static platforms

  
  // Generate random platform density within range
  if (config.platformDensityRange && config.platformDensityRange.length === 2) {
    const [min, max] = config.platformDensityRange;
    gameData.platformSpawnDensity = [
      min + Math.floor(Math.random() * (max - min + 1)),
      min + Math.floor(Math.random() * (max - min + 1)),
      min + Math.floor(Math.random() * (max - min + 1)),
      min + Math.floor(Math.random() * (max - min + 1))
    ];
  }
  
  // Set collectible states based on level
  gameData.leftKeyCollected = !config.hasLeftCherry;
  gameData.rightKeyCollected = !config.hasRightCherry;
  gameData.centerKeyCollected = !config.hasCenterCherry;

  // Store level-specific settings for easy access
  gameData.currentLevelConfig = config;
  gameData.balloonDogs = [];
  gameData.balloonDogSpawnTimer = 0;
  gameData.balloonDogHoldUntil = 0;

  console.log(`Applied Level ${level} configuration:`, {
    centerSpeed: config.centerLiftSpeed,
    hasLeftCherry: config.hasLeftCherry,
    hasRightCherry: config.hasRightCherry,
    completionType: config.completionType
  });
};

export default LEVEL_CONFIGS;