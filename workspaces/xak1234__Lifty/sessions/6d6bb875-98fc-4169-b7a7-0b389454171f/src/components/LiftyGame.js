import React, { useRef, useEffect, useState, useCallback } from 'react';
import { applyLevelConfig } from '../levels/LevelConfig';

// Mobile/Tablet Device Detection Utilities
const detectDeviceType = () => {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
  const isTablet = /ipad|android(?!.*mobile)|tablet|kindle|silk|playbook/i.test(ua.toLowerCase());
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return {
    isMobile,
    isTablet,
    isTouch,
    isDesktop: !isMobile && !isTablet
  };
};

const getOptimalScale = () => {
  const device = detectDeviceType();
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isPortrait = screenHeight > screenWidth;
  
  // Check if user has manually set a scale preference
  const savedScale = localStorage.getItem('liftyUiScale');
  const userSetScale = localStorage.getItem('liftyUserSetScale'); // Track if user manually changed scale
  
  if (userSetScale === 'true' && savedScale) {
    return parseFloat(savedScale);
  }
  
  // Auto-detect optimal scale based on device
  if (device.isMobile) {
    // Mobile phones - calculate scale to fit 680px canvas width
    const availableWidth = screenWidth - 20; // Account for padding
    const calculatedScale = availableWidth / 680;
    
    // Clamp scale between 0.45 and 0.7 for mobile
    if (screenWidth <= 360) return Math.max(0.45, Math.min(calculatedScale, 0.5)); // Very small phones
    if (screenWidth <= 375) return Math.max(0.5, Math.min(calculatedScale, 0.55)); // Small phones (iPhone SE, etc)
    if (screenWidth <= 430) return Math.max(0.55, Math.min(calculatedScale, 0.6)); // Medium phones
    if (screenWidth <= 480) return Math.max(0.6, Math.min(calculatedScale, 0.65)); // Larger phones
    return Math.max(0.65, Math.min(calculatedScale, 0.7)); // Very large phones
  } else if (device.isTablet) {
    // Tablets
    if (isPortrait) {
      if (screenWidth <= 768) return 0.75; // Standard tablets in portrait
      return 0.85; // Large tablets in portrait
    } else {
      if (screenWidth <= 1024) return 0.85; // Tablets in landscape
      return 1; // Large tablets in landscape
    }
  } else if (device.isTouch && screenWidth < 1024) {
    // Touch laptops or small screens
    return 0.75;
  }
  
  // Desktop default
  return 1;
};

const CANVAS_WIDTH = 680; // Decreased by 15% from 800 (800 * 0.85 = 680)
const CANVAS_HEIGHT = 1200; // Matches platform totalSpan for seamless wrapping
const LIFT_WIDTH = 100; // Decreased by 50% from 200
const LIFT_HEIGHT = 180;
const PLAYER_WIDTH = 22; // 20% smaller than 28 (rounded)
const PLAYER_HEIGHT = 43; // 20% smaller than 54 (rounded)
const FOOT_CLEARANCE = 8; // base clearance above surfaces to avoid clipping
const FLOOR_EXTRA_CLEARANCE = 6; // additional clearance when standing on lift floors
const SHAFT_WIDTH = 160; // Narrower shaft to be closer to the lift
const SHAFT_GAP = 60; // Smaller horizontal gap to move lifts closer together

// Top-of-lift platform cap geometry (shared with drawColumnTopPlatforms and landing checks)
const TOP_PLATFORM_PAD = 12;
const TOP_PLATFORM_HEIGHT = 8;

// Global speed scale (reduce fall speed by 50%)
const SPEED_SCALE = 0.5;

// Physics
const GRAVITY = 0.5; // reduced gravity for longer, floatier jumps
const TERMINAL_VELOCITY = 12; // higher max downward speed

// Horizontal movement tuning (time-based)
const MAX_SPEED_X = 180; // px/s
const ACCEL_X = 3200; // px/s^2 - increased for very responsive feel
const FRICTION_GROUND = 2000; // px/s^2 - increased for snappy stop
const FRICTION_AIR = 600; // px/s^2

// Center lift constant speed (px/frame)
const CENTER_LIFT_SPEED = 2;

// High fall death threshold
const BIG_FALL_DEATH_HEIGHT = LIFT_HEIGHT * 2; // explode if falling more than 2x lift height before landing

// Game states
const GAME_STATES = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  DEAD: 'DEAD'
};

// Pixel colors
const COLORS = {
  BLACK: '#0a0a0a',
  DARK_GRAY: '#1a1a1a',
  GRAY: '#333333',
  LIGHT_GRAY: '#666666',
  WHITE: '#ffffff',
  RED: '#ff3333',
  DARK_RED: '#aa1111',
  GREEN: '#33ff33',
  PURPLE: '#aa33aa',
  ORANGE: '#ff8833',
  YELLOW: '#ffff33',
  BLUE: '#3333ff',
  // Added brighter metallics for higher lift visibility
  SILVER: '#bfbfbf',
  BRIGHT_SILVER: '#e5e5e5'
};

// Feature flags
const ENABLE_SPEED_LINES = false; // Disable horizontal speed lines to avoid level 4 artifacts
// Debug flags (toggle to investigate platform flicker/sticking)
const DEBUG_PLATFORMS = true; // set to false to silence PLAT_* logs
const DEBUG_RIDING = true; // set to false to silence RIDE_* logs
const DEBUG_THROTTLE = 20; // log every N frames to reduce spam

const LiftyGame = () => {
  const canvasRef = useRef(null);
  const titleCanvasRef = useRef(null);
  const statsCanvasRef = useRef(null);
  const controlsCanvasRef = useRef(null);
  const frontCanvasRef = useRef(null); // Overlay start screen
  const dialCanvasRef = useRef(null); // Scale dial control
  const gameLoopRef = useRef(null);
  const audioContextRef = useRef(null);
  const stickmanImageRef = useRef(null);
  const backgroundImagesRef = useRef({});
  const dingSoundRef = useRef(null); // For lift movement sound
  const tingSoundRef = useRef(null); // For key collection sound
  const levelSoundRef = useRef(null); // For level activation sound
  const doorSoundRef = useRef(null); // For door sliding sound
  const splatSoundRef = useRef(null); // For death splat sound
  const oxySoundRef = useRef(null); // For sound toggle icon
  const ufoSoundRef = useRef(null); // For UFO ambient sound
  const medicSoundRef = useRef(null); // For medic balloon sound
  const popSoundRef = useRef(null); // For medic balloon pop sound
  const gunSoundRef = useRef(null); // For machine gun sound
  const chuteSoundRef = useRef(null); // For parachute deployment sound
  const meteorSoundRef = useRef(null); // For meteor ambient sound
  const titleImageRef = useRef(null);
  const [gameState, setGameState] = useState(GAME_STATES.MENU);
  const [soundEnabled, setSoundEnabled] = useState(true); // Sound on/off toggle
  const [deviceInfo] = useState(() => detectDeviceType()); // Store device info
  
  // Scrolling instructions state
  const scrollingTextRef = useRef({ offset: 0, lastUpdate: 0 });
  
  // UI scale (persisted with auto-detection for mobile/tablet)
  const [uiScale, setUiScaleInternal] = useState(() => {
    const optimalScale = getOptimalScale();
    return optimalScale;
  });
  
  // Dial animation state
  const dialAnimationRef = useRef({
    targetAngle: 0,
    currentAngle: 0,
    isDragging: false,
    hoverState: false
  });
  
  // Scale options for the dial
  const SCALE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5];
  const SCALE_LABELS = ['50%', '75%', '100%', '125%', '150%'];
  
  // Helper to set scale and save to localStorage
  const setUiScale = useCallback((newScale) => {
    setUiScaleInternal(newScale);
    localStorage.setItem('liftyUiScale', newScale.toString());
    localStorage.setItem('liftyUserSetScale', 'true'); // Mark as user-set to prevent auto-override
    // Update dial angle based on scale
    const index = SCALE_OPTIONS.indexOf(newScale);
    if (index !== -1) {
      dialAnimationRef.current.targetAngle = (index - 2) * 45; // Center at 100%
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('liftyUiScale', String(uiScale));
  }, [uiScale]);
  
  // Handle window resize and orientation changes for mobile/tablet
  useEffect(() => {
    const handleResize = () => {
      // Only auto-adjust if user hasn't manually set a scale
      const userSetScale = localStorage.getItem('liftyUserSetScale');
      if (userSetScale !== 'true') {
        const newOptimalScale = getOptimalScale();
        if (newOptimalScale !== uiScale) {
          setUiScaleInternal(newOptimalScale);
          localStorage.setItem('liftyUiScale', newOptimalScale.toString());
          
          // Update dial angle
          const index = SCALE_OPTIONS.indexOf(newOptimalScale);
          if (index !== -1) {
            dialAnimationRef.current.targetAngle = (index - 2) * 45;
          }
        }
      }
    };
    
    // Add event listeners for resize and orientation change
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [uiScale]);
  
  // Game state
  const SAVE_KEY = 'lifty2_save_v1';

  const gameData = useRef({
    score: 0,
    highScore: parseInt(localStorage.getItem('liftyHighScore') || '0'),
    level: 1,
    lives: 3, // Start with 3 lives
    baseLiftSpeed: 2, // Base speed that increases with levels
    currentLiftSpeed: 2, // Actual current speed (includes dynamic acceleration)
    centerLiftDir: 1, // 1 = down, -1 = up for center lift
    fallDistance: 0,
    jumpStartTime: 0,
    jumpStartFeetY: 0,
    isJumping: false,
    jumpVelocity: 0,
    playerY: 0, // Will be calculated relative to lift position
    playerX: 0, // Horizontal position relative to lift center
    playerVelocityX: 0, // Horizontal movement velocity
    animationFrame: 0, // Current animation frame
    animationTimer: 0, // Timer for animation frame changes
    movementDirection: 0, // -1 for left, 0 for still, 1 for right
    lastMovementDirection: 0, // Previous movement direction for smooth transitions
    movementTransitionTimer: 0, // Timer for smooth direction changes
    facingDir: 1, // persist last facing direction for idle pose (-1 left, 1 right)
    jumpDirection: 0, // -1 left, 0 none, 1 right (set at jump start)
    liftY: CANVAS_HEIGHT - LIFT_HEIGHT,
    leftLiftY: -LIFT_HEIGHT, // Additional left empty lift starts at top
    rightLiftY: -LIFT_HEIGHT, // Additional right empty lift starts at top
    leftLiftSpeed: 0, // Randomized per run/level
    rightLiftSpeed: 0, // Randomized per run/level
    leftLiftDir: 1, // 1 = down, -1 = up for left lift
    rightLiftDir: 1, // 1 = down, -1 = up for right lift
    currentShaftIndex: 0, // -1 left, 0 center, 1 right
    // Lever and door states
    redLeverTriggered: false,
    blueLeverTriggered: false,
    yellowLeverTriggered: false,
    centerDoorLeftOpen: false,
    centerDoorRightOpen: false,
    leftLiftDoorRightOpen: false,
    leftLiftDoorLeftOpen: false,
    rightLiftDoorLeftOpen: false,
    rightLiftDoorRightOpen: false,
    // Animated door open progress (0..1)
    doorOpenProgress: {
      centerLeft: 0,
      centerRight: 0,
      leftLeft: 0,
      leftRight: 0,
      rightLeft: 0,
      rightRight: 0
    },
    shaftMarkers: [],
    shaftLines: [], // Speed tracks on shaft edges
    stars: [],
    bloodSplatters: [],
    bodyParts: [],
    deathAnimation: 0,
    lastTime: 0,
    keys: {},
    stickmanColor: 'white', // 'white' or 'black' for stickman rendering
    processedSpriteCache: {}, // cache processed frames by key to avoid reprocessing
    impactZone: 50, // pixels from bottom where impact occurs
    perfectJumpWindow: 30, // frames of perfect timing
    jumpCooldown: 0,
    perfectJump: false, // Track if current jump was perfectly timed
    jumpGracePeriod: 0, // Grace period after landing to survive cage impact
    survivedImpact: false, // Track if player survived the cage hitting ground
    hitCeiling: false, // Track if player hit ceiling during this round
    wasJumpingAtImpact: false, // Track if player was jumping when cage reached impact zone
    bigFallTriggered: false, // prevent multiple triggers during a single fatal fall
    mobileGravityLogged: false, // track if mobile gravity reduction has been logged
    deathEffectUntil: 0, // Timestamp (ms) until which to show gore effects during deaths
    deathEnv: null, // { type: 'lift' | 'outside', liftIndex?: -1|0|1, liftX?: number, liftY?: number }
    onOutsidePlatform: false, // riding outside/mid platform
    onTopOfLift: false, // standing on top of a lift cap
    outsidePlatformCol: -1, // column index for outside/mid platforms (0..3)
    ridingPlatformLineIndex: -1, // which shaftLines index we are riding (-1 = none)
    ridingPlatformCol: -1, // which column index (0..3) we are riding (-1 = none)
    lastAutoSaveAt: 0,
    balloonDogs: [], // Level hazards for Level 2
    balloonDogSpawnTimer: 0,
    balloonDogHoldUntil: 0,
    // UFO spacecraft system (level 3+)
    ufos: [],
    ufoSpawnTimer: 0,
    ufoNextSpawnTime: 0,
    // Medical pack system
    medpacks: [], // Array of falling medpacks {x, y, collected}
    medpackSpawnTimer: 0, // Frames until next medpack spawn
    // Mushroom system (invincibility power-up, level 3+)
    mushrooms: [], // Array of falling mushrooms {x, y, collected}
    mushroomSpawnTimer: 0, // Frames until next mushroom spawn
    invincible: false, // Is player currently invincible
    invincibleUntil: 0, // Timestamp when invincibility ends
    // Dynamite balloons (hazard)
    dynamiteBalloons: [], // Array of falling dynamite balloons {x, y, exploded}
    dynamiteBalloonSpawnTimer: 0, // Frames until next dynamite spawn
    // Machine gun system
    machineGunDrops: [], // Array of machine gun drops {x, y, collected}
    machineGunSpawnTimer: 0, // Frames until next machine gun spawn
    machineGunDropsSpawned: 0, // Count of machine guns spawned in current level
    hasMachineGun: false, // Whether player has collected a machine gun
    bullets: [], // Array of active bullets {x, y, vx, vy}
    gunAimAngle: 0, // Cached aim angle for cricket bat (updated only when firing)
    // Meteor system (hazard from above)
    meteors: [], // Array of falling meteors {x, y, vx, vy, size, trail: [{x, y, alpha}]}
    meteorSpawnTimer: 0, // Frames until next meteor spawn
    // Level2 crushing ceiling state
    crushingCeilingY: 0, // Y position of the crushing ceiling (separate from lift position)
    crushingCeilingActive: false, // whether ceiling is in crushing mode
    crushingCeilingDir: 1, // 1 = down, -1 = up
    // Level2 left lift crushing ceiling state
    leftCrushingCeilingY: 0,
    leftCrushingCeilingActive: false,
    leftCrushingCeilingDir: 1,
    // Level2 right lift crushing ceiling state
    rightCrushingCeilingY: 0,
    rightCrushingCeilingActive: false,
    rightCrushingCeilingDir: 1,
    previousFloor: 30, // Track previous floor number for ding sound
    // Wrap-around mode after level 3
    wrapModeEnabled: false,
    cycleIndex: 0, // 0 -> e.g., 4 ; 1 -> e.g., 4.1
    forceMaxSpeed: false, // start .1 cycles at full speed
    goldenKeys: 0, // total golden keys collected
    leftKeyCollected: false, // whether the left-lift key is collected this level/cycle
    centerKeyCollected: false, // whether the center-lift key is collected this level/cycle
    rightKeyCollected: false, // whether the right-lift key is collected this level/cycle
    platformCherriesCollected: new Set(), // track which platform cherries have been collected (by platform index)
    // Required fruit collection system (for level progression)
    requiredApplesPerLevel: 0, // Number of apples required for current level
    requiredBananasPerLevel: 0, // Number of bananas required for current level
    applesCollected: 0, // Apples collected this level
    bananasCollected: 0, // Bananas collected this level
    applesPlacements: [], // Array of {platformIndex, collected} for apples
    bananasPlacements: [], // Array of {platformIndex, collected} for bananas
    liftMoving: false, // track if lift is currently moving for ding sound
    platformModeEnabled: true, // enable platform-on-top mode for jumping onto columns
    platformSpawnPhases: [0, 1, 0, 1], // per-column spawn phase to stagger rows (outside L/R, mid L/R)
    platformSpawnDensity: [2, 2, 2, 2], // per-column density: draw every Nth row (2 or 3)
    // Level complete banner
    showLevelCompleteBanner: false, // whether to show level complete banner
    levelCompleteBannerLevel: 0, // which level to display on banner
    levelCompleteBannerTimer: 0, // frames to show banner
    // Parachute system
    parachuteActive: false, // whether parachute is deployed
    lastJumpTime: 0, // timestamp of last jump press
    jumpTapCount: 0, // count of rapid jump taps
    // Jump meta
    airTicks: 0, // frames spent in air this jump
    startedFromPlatformThisJump: false, // whether this jump started from platform or lift top-cap
    // Cowboy hat system (unlocked after level 4)
    cowboyHatBalloons: [], // Array of falling hat balloons {x, y, collected}
    cowboyHatSpawnTimer: 0, // Frames until next hat balloon spawn
    hasCowboyHat: false, // Whether player is currently wearing the hat
    // Debug state
    debugCounter: 0,
    frameCount: 0,
    debugPrevPy: {},
    debugLastFallbackAt: 0
  
  });

  // Helper functions (moved here to avoid temporal dead zone errors)
  // Helper: compute shaft positions for left, center, right
  const getShaftPositions = () => {
    const center = CANVAS_WIDTH / 2 - SHAFT_WIDTH / 2;
    return {
      // Increase spacing between shafts by inserting SHAFT_GAP between them
      left: center - (SHAFT_WIDTH + SHAFT_GAP),
      center,
      right: center + (SHAFT_WIDTH + SHAFT_GAP)
    };
  };

  // Helper: get shaft X by index (-1,0,1)
  const getShaftXByIndex = (idx) => {
    const pos = getShaftPositions();
    if (idx === -1) return pos.left;
    if (idx === 1) return pos.right;
    return pos.center;
  };

  // Helper: get column top Y (top of moving lift) by index
  const getColumnTopYByIndex = (idx) => {
    if (idx === -1) return gameData.current.leftLiftY;
    if (idx === 1) return gameData.current.rightLiftY;
    return gameData.current.liftY;
  };

  // Draw mobile controls canvas
  const drawControlsCanvas = useCallback(() => {
    const canvas = controlsCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add semi-transparent background for visibility (debugging)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Detect device and adjust button sizes accordingly
    const device = detectDeviceType();
    const isMobileOrTablet = device.isMobile || device.isTablet;
    const sizeMultiplier = isMobileOrTablet ? 2 : 1;
    
    // Draw control buttons - larger on mobile/tablet
    const leftRadius = 28 * sizeMultiplier;
    const rightRadius = 28 * sizeMultiplier;
    const jumpRadius = 38 * sizeMultiplier;
    const spacing = 18 * sizeMultiplier;
    const centerX = canvas.width / 2;
    const buttonY = canvas.height / 2;

    const leftButtonX = centerX - (jumpRadius + spacing + leftRadius);
    const jumpButtonX = centerX;
    const rightButtonX = centerX + (jumpRadius + spacing + rightRadius);

    // Helper: rounded rect
    const roundedRect = (ctx2, x, y, w, h, r) => {
      ctx2.beginPath();
      ctx2.moveTo(x + r, y);
      ctx2.lineTo(x + w - r, y);
      ctx2.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx2.lineTo(x + w, y + h - r);
      ctx2.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx2.lineTo(x + r, y + h);
      ctx2.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx2.lineTo(x, y + r);
      ctx2.quadraticCurveTo(x, y, x + r, y);
      ctx2.closePath();
    };

    // No control panel background; keep only the buttons visible
    // Helper to draw glossy arcade button
    const drawArcadeButton = (x, y, radius, baseColor, label) => {
      ctx.save();

      // Outer glow
      ctx.shadowColor = '#ffffff33';
      ctx.shadowBlur = 10;

      // Button face gradient
      const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.2, x, y, radius);
      grad.addColorStop(0, baseColor);
      grad.addColorStop(1, '#222');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Rim
      ctx.shadowBlur = 0;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#e0e0e0';
      ctx.stroke();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(x, y - radius * 0.4, radius * 0.65, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Label
      ctx.fillStyle = COLORS.WHITE;
      const fontSize = 12 * sizeMultiplier;
      ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y);

      ctx.restore();
    };

    // Draw buttons
    drawArcadeButton(leftButtonX, buttonY, leftRadius, '#2b6cb0', '◀'); // Blue-ish
    drawArcadeButton(jumpButtonX, buttonY, jumpRadius, '#c53030', 'JUMP'); // Red
    drawArcadeButton(rightButtonX, buttonY, rightRadius, '#2b6cb0', '▶'); // Blue-ish
    
    
  }, []);

  // Initialize title image
  const initializeTitleImage = useCallback(() => {
    const img = new Image();
    img.onload = () => {
      console.log('Title image loaded successfully!', img.width, 'x', img.height);
      titleImageRef.current = img;
      drawTitleCanvas();
    };
    img.onerror = () => {
      console.error('Failed to load title image from images/front.png');
    };
    img.src = 'images/front.png';
  }, []);

  // Draw overlay front canvas (covers everything while in MENU)
  const drawFrontCanvas = useCallback(() => {
    const canvas = frontCanvasRef.current;
    const image = titleImageRef.current; // front.png already loaded here
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');

    // Ensure device-pixel-ratio scaling for crisp rendering across mobile/tablet/web
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvas.width;
    const cssH = canvas.clientHeight || canvas.height;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssW, cssH);
    
    // Draw background color first
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, cssW, cssH);
    
    // Contain the image within the canvas (object-fit: contain behavior) - no stretching
    const canvasRatio = cssW / cssH;
    const imageRatio = image.width / image.height;
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imageRatio > canvasRatio) {
      // Image is wider than canvas - fit to width
      drawWidth = cssW;
      drawHeight = drawWidth / imageRatio;
      drawX = 0;
      drawY = (cssH - drawHeight) / 2;
    } else {
      // Image is taller than canvas - fit to height
      drawHeight = cssH;
      drawWidth = drawHeight * imageRatio;
      drawX = (cssW - drawWidth) / 2;
      drawY = 0;
    }
    
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    // Scrolling instructions (above PRESS START)
    if (gameState === GAME_STATES.MENU) {
      const now = Date.now();
      const scrollSpeed = 0.15; // pixels per millisecond (reduced from 0.5 for better readability)
      
      // Update scroll offset
      if (scrollingTextRef.current.lastUpdate > 0) {
        const deltaTime = now - scrollingTextRef.current.lastUpdate;
        scrollingTextRef.current.offset += deltaTime * scrollSpeed;
      }
      scrollingTextRef.current.lastUpdate = now;
      
      // Scrolling instruction messages
      const instructions = [
        "🎮 NAVIGATE: Use ← → arrows to move between lifts",
        "🚀 JUMP: Press SPACE (double-tap for parachute)",
        "🍒 COLLECT: Cherries, golden keys, and power-ups",
        "💊 MEDPACKS: Restore health (+25 HP)",
        "🍄 MUSHROOMS: Invincibility for 10 seconds (Level 3+)",
        "🤠 COWBOY HAT: Protection from hazards (Level 5+)",
        "🔫 MACHINE GUN: Weapon for defense (Level 4+)",
        "⚠️ AVOID: Dynamite, meteors, flying toilets, balloon dogs",
        "💥 DYNAMITE: Explodes on contact - instant death!",
        "☄️ METEORS: Fall from sky starting Level 5",
        "🚽 FLYING TOILETS: Bite and chase you (Level 6+)",
        "🎈 BALLOON DOGS: Floating enemies that bite",
        "🛸 UFOS: Abduction beam destroys your items",
        "📱 MOBILE: Touch controls optimized for phones/tablets",
        "🪂 PARACHUTE: Slow dangerous falls - double-tap SPACE",
        "⚡ SURVIVAL TIP: Watch lift speeds - they vary wildly!",
        "🎯 OBJECTIVES: Some levels require collecting ALL items",
        "🌟 DIFFICULTY: Increases dramatically after Level 5"
      ];
      
      // Create continuous scrolling text
      const fullText = instructions.join("    •    ") + "    •    ";
      const textWidth = ctx.measureText(fullText).width;
      
      // Reset scroll when text has completely passed
      if (scrollingTextRef.current.offset > textWidth) {
        scrollingTextRef.current.offset = 0;
      }
      
      // Draw scrolling text with clipping
      ctx.save();
      ctx.fillStyle = COLORS.YELLOW;
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      // Create clipping region for scrolling area
      const scrollY = cssH - 200;
      const scrollHeight = 20;
      ctx.beginPath();
      ctx.rect(0, scrollY - scrollHeight/2, cssW, scrollHeight);
      ctx.clip();
      
      // Draw the scrolling text
      const startX = cssW - scrollingTextRef.current.offset;
      ctx.fillText(fullText, startX, scrollY);
      
      // Draw second copy for seamless loop
      ctx.fillText(fullText, startX + textWidth, scrollY);
      
      ctx.restore();
    }
    
    // Flashing PRESS START
    if (gameState === GAME_STATES.MENU) {
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = COLORS.GREEN;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 28px "Press Start 2P", monospace';
        ctx.fillText('PRESS START', cssW / 2, cssH - 60);
      }
      
      // Version text (always visible, positioned above PRESS START)
      ctx.fillStyle = COLORS.WHITE;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillText('Version 8.0', cssW / 2, cssH - 100);
      
      // Device type indicator for mobile/tablet
      const device = detectDeviceType();
      if (device.isMobile || device.isTablet) {
        ctx.fillStyle = COLORS.YELLOW;
        ctx.font = '12px "Press Start 2P", monospace';
        const deviceText = device.isMobile ? 'Mobile Mode' : 'Tablet Mode';
        ctx.fillText(deviceText, cssW / 2, cssH - 130);
        ctx.fillText(`Scale: ${Math.round(uiScale * 100)}%`, cssW / 2, cssH - 150);
      }
      
      // Copyright/credit text at bottom center
      ctx.fillStyle = COLORS.WHITE;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Franksgames2025', cssW / 2, cssH - 20);
    }
  }, [gameState, uiScale]);

  // Resize front overlay canvas on window resize / scale changes
  useEffect(() => {
    const handleResize = () => {
      if (gameState === GAME_STATES.MENU) drawFrontCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gameState, drawFrontCanvas, uiScale]);

  // Animation loop for scrolling instructions in menu
  useEffect(() => {
    let animationId;
    
    const animateMenu = () => {
      if (gameState === GAME_STATES.MENU) {
        drawFrontCanvas();
        animationId = requestAnimationFrame(animateMenu);
      }
    };
    
    if (gameState === GAME_STATES.MENU) {
      animationId = requestAnimationFrame(animateMenu);
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [gameState, drawFrontCanvas]);

  // Draw title canvas
  const drawTitleCanvas = useCallback(() => {
    const canvas = titleCanvasRef.current;
    const image = titleImageRef.current;
    
    if (!canvas || !image) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw front.png to cover entire canvas (cover)
    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = image.width / image.height;
    let drawWidth, drawHeight, drawX, drawY;
    if (imageRatio > canvasRatio) {
      // image wider than canvas -> match height, crop sides
      drawHeight = canvas.height;
      drawWidth = drawHeight * imageRatio;
      drawX = (canvas.width - drawWidth) / 2;
      drawY = 0;
    } else {
      // image taller than canvas -> match width, crop top/bottom
      drawWidth = canvas.width;
      drawHeight = drawWidth / imageRatio;
      drawX = 0;
      drawY = (canvas.height - drawHeight) / 2;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    
    // Flashing PRESS START on title canvas when in MENU
    if (gameState === GAME_STATES.MENU) {
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = COLORS.GREEN;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 28px "Press Start 2P", monospace';
        ctx.fillText('PRESS START', canvas.width / 2, canvas.height - 40);
      }
    }
  }, [gameState]);
  // Draw retro dial control for scale selection
  const drawDialCanvas = useCallback(() => {
    const canvas = dialCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 23; // Reduced from 35
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Smooth animation
    const anim = dialAnimationRef.current;
    if (Math.abs(anim.currentAngle - anim.targetAngle) > 0.5) {
      anim.currentAngle += (anim.targetAngle - anim.currentAngle) * 0.2;
    } else {
      anim.currentAngle = anim.targetAngle;
    }
    
    // Background plate removed for transparent background
    
    // Outer ring (metal bezel)
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner ring highlight
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    
    // Dial face (dark gradient)
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#2a2a2a');
    gradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Scale markings and labels
    SCALE_OPTIONS.forEach((scale, index) => {
      const angle = (index - 2) * 45 - 90; // -90 to start at top
      const rad = angle * Math.PI / 180;
      
      // Tick marks
      const tickStart = radius - 8;
      const tickEnd = radius - 3;
      const x1 = centerX + Math.cos(rad) * tickStart;
      const y1 = centerY + Math.sin(rad) * tickStart;
      const x2 = centerX + Math.cos(rad) * tickEnd;
      const y2 = centerY + Math.sin(rad) * tickEnd;
      
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // Labels removed for cleaner appearance
    });
    
    // Dial pointer (red indicator)
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((anim.currentAngle - 90) * Math.PI / 180);
    
    // Pointer shaft
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius - 12, -3);
    ctx.lineTo(radius - 12, 3);
    ctx.closePath();
    ctx.fill();
    
    // Pointer tip (brighter red)
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.moveTo(radius - 12, -3);
    ctx.lineTo(radius - 5, 0);
    ctx.lineTo(radius - 12, 3);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    
    // Center knob
    const knobGradient = ctx.createRadialGradient(centerX - 2, centerY - 2, 0, centerX, centerY, 8);
    knobGradient.addColorStop(0, '#666');
    knobGradient.addColorStop(0.5, '#444');
    knobGradient.addColorStop(1, '#222');
    ctx.fillStyle = knobGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Knob highlight
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, -Math.PI * 0.7, -Math.PI * 0.3);
    ctx.stroke();
    
    // Hover/drag effect
    if (anim.hoverState || anim.isDragging) {
      ctx.strokeStyle = anim.isDragging ? '#ff3333' : '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Label at top
    ctx.fillStyle = '#888';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SCALE', centerX, 5);
    
    // Request next frame if animating
    if (Math.abs(anim.currentAngle - anim.targetAngle) > 0.5) {
      requestAnimationFrame(() => drawDialCanvas());
    }
  }, []);
  // Draw stats canvas (level, lives, keys, score)
  const drawStatsCanvas = useCallback(() => {
    const canvas = statsCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === GAME_STATES.PLAYING) {
      // Set up text styling
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const centerY = canvas.height / 2;
      
      // Always show all fruit types on every level
      const totalSections = 7; // Level, Score, Lives, Cherries, Apples, Bananas, (future expansion)
      const sectionWidth = canvas.width / totalSections;
      
      let sectionIndex = 0;
      
      // Level (first section)
      const levelLabel = (gameData.current.wrapModeEnabled && gameData.current.level >= 3 && gameData.current.cycleIndex === 1)
        ? `${gameData.current.level}.1`
        : `${gameData.current.level}`;
      ctx.fillStyle = COLORS.YELLOW;
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      ctx.fillText(`LEVEL`, sectionWidth * (sectionIndex + 0.5), centerY - 10);
      ctx.fillText(`${levelLabel}`, sectionWidth * (sectionIndex + 0.5), centerY + 10);
      sectionIndex++;
      
      // Score (second section)
      ctx.fillStyle = COLORS.GREEN;
      ctx.fillText(`SCORE`, sectionWidth * (sectionIndex + 0.5), centerY - 10);
      ctx.fillText(`${gameData.current.score.toString().padStart(6, '0')}`, sectionWidth * (sectionIndex + 0.5), centerY + 10);
      sectionIndex++;
      
      // Lives (third section) - using heart icon
      ctx.fillStyle = COLORS.RED;
      ctx.fillText(`❤️`, sectionWidth * (sectionIndex + 0.5), centerY - 10);
      ctx.fillText(`${gameData.current.lives}`, sectionWidth * (sectionIndex + 0.5), centerY + 10);
      sectionIndex++;
      
      // Cherries (fourth section) - calculate required cherries for this level
      const config = gameData.current.currentLevelConfig || {};
      let requiredCherries = 0;
      if (config.hasLeftCherry) requiredCherries++;
      if (config.hasRightCherry) requiredCherries++;
      if (config.hasCenterCherry) requiredCherries++;
      // Note: platform cherries are collected dynamically, not tracked in required count
      
      const allCherriesCollected = (gameData.current.goldenKeys || 0) >= requiredCherries && requiredCherries > 0;
      ctx.fillStyle = allCherriesCollected ? '#00ff00' : COLORS.RED;
      ctx.fillText(`🍒`, sectionWidth * (sectionIndex + 0.5), centerY - 10);
      ctx.fillText(`${gameData.current.goldenKeys || 0}/${requiredCherries}`, sectionWidth * (sectionIndex + 0.5), centerY + 10);
      sectionIndex++;
      
      // Apples (fifth section) - always shown
      const allApplesCollected = gameData.current.applesCollected >= gameData.current.requiredApplesPerLevel && gameData.current.requiredApplesPerLevel > 0;
      ctx.fillStyle = allApplesCollected ? '#00ff00' : '#4CAF50';
      ctx.fillText(`🍏`, sectionWidth * (sectionIndex + 0.5), centerY - 10);
      ctx.fillText(`${gameData.current.applesCollected}/${gameData.current.requiredApplesPerLevel}`, sectionWidth * (sectionIndex + 0.5), centerY + 10);
      sectionIndex++;
      
      // Bananas (sixth section) - always shown
      const allBananasCollected = gameData.current.bananasCollected >= gameData.current.requiredBananasPerLevel && gameData.current.requiredBananasPerLevel > 0;
      ctx.fillStyle = allBananasCollected ? '#00ff00' : '#FFEB3B';
      ctx.fillText(`🍌`, sectionWidth * (sectionIndex + 0.5), centerY - 10);
      ctx.fillText(`${gameData.current.bananasCollected}/${gameData.current.requiredBananasPerLevel}`, sectionWidth * (sectionIndex + 0.5), centerY + 10);
      sectionIndex++;
      
      // Invincibility timer (seventh section) - only show when active
      if (gameData.current.invincible) {
        const now = Date.now();
        const timeLeft = Math.max(0, Math.ceil((gameData.current.invincibleUntil - now) / 1000));
        if (timeLeft > 0) {
          ctx.fillStyle = '#ffdd00';
          ctx.fillText(`🍄`, sectionWidth * (sectionIndex + 0.5), centerY - 10);
          ctx.fillText(`${timeLeft}s`, sectionWidth * (sectionIndex + 0.5), centerY + 10);
        }
      }
      sectionIndex++;
      
      // Add subtle separators
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      for (let i = 1; i < totalSections; i++) {
        const x = sectionWidth * i;
        ctx.beginPath();
        ctx.moveTo(x, 8);
        ctx.lineTo(x, canvas.height - 8);
        ctx.stroke();
      }
    }
    
    // Draw sound toggle icon in top-right corner (always visible)
    const iconSize = 24;
    const iconX = canvas.width - iconSize - 10;
    const iconY = 10;
    
    // Draw speaker icon
    ctx.save();
    ctx.fillStyle = soundEnabled ? '#33ff33' : '#ff3333';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    // Speaker body (trapezoid)
    ctx.beginPath();
    ctx.moveTo(iconX + 4, iconY + 8);
    ctx.lineTo(iconX + 8, iconY + 8);
    ctx.lineTo(iconX + 12, iconY + 4);
    ctx.lineTo(iconX + 12, iconY + 20);
    ctx.lineTo(iconX + 8, iconY + 16);
    ctx.lineTo(iconX + 4, iconY + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    if (soundEnabled) {
      // Sound waves (3 arcs)
      ctx.strokeStyle = '#33ff33';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(iconX + 12, iconY + 12, 6 + i * 3, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
      }
    } else {
      // X mark when muted
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(iconX + 14, iconY + 6);
      ctx.lineTo(iconX + 22, iconY + 18);
      ctx.moveTo(iconX + 22, iconY + 6);
      ctx.lineTo(iconX + 14, iconY + 18);
      ctx.stroke();
    }
    
    ctx.restore();
    
    // Draw level advance arrow button ("> " icon) underneath speaker (only during gameplay)
    if (gameState === GAME_STATES.PLAYING) {
      const arrowSize = 16;
      const arrowX = canvas.width - arrowSize - 10;
      const arrowY = iconY + iconSize + 8; // 8px gap below speaker icon
      
      ctx.save();
      ctx.fillStyle = '#ffdd00'; // Yellow/gold color
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      
      // Draw arrow button background (rounded rectangle)
      const cornerRadius = 3;
      ctx.beginPath();
      ctx.moveTo(arrowX + cornerRadius, arrowY);
      ctx.lineTo(arrowX + arrowSize - cornerRadius, arrowY);
      ctx.arcTo(arrowX + arrowSize, arrowY, arrowX + arrowSize, arrowY + cornerRadius, cornerRadius);
      ctx.lineTo(arrowX + arrowSize, arrowY + arrowSize - cornerRadius);
      ctx.arcTo(arrowX + arrowSize, arrowY + arrowSize, arrowX + arrowSize - cornerRadius, arrowY + arrowSize, cornerRadius);
      ctx.lineTo(arrowX + cornerRadius, arrowY + arrowSize);
      ctx.arcTo(arrowX, arrowY + arrowSize, arrowX, arrowY + arrowSize - cornerRadius, cornerRadius);
      ctx.lineTo(arrowX, arrowY + cornerRadius);
      ctx.arcTo(arrowX, arrowY, arrowX + cornerRadius, arrowY, cornerRadius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Draw ">" arrow symbol
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(arrowX + 5, arrowY + 4);
      ctx.lineTo(arrowX + 11, arrowY + 8);
      ctx.lineTo(arrowX + 5, arrowY + 12);
      ctx.stroke();
      
      ctx.restore();
    }
  }, [gameState, soundEnabled]);

  // Draw a red cherry icon at x,y
  const drawGoldenKeyIcon = (ctx, x, y) => {
    ctx.save();

    // Add pulsing glow effect
    const time = Date.now() * 0.004; // Different timing for cherries
    const glowIntensity = 0.8 + 0.2 * Math.sin(time);
    const glowSize = 10 + 6 * Math.sin(time * 0.9);
    
    // Outer glow (red)
    ctx.shadowColor = COLORS.RED;
    ctx.shadowBlur = glowSize;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = glowIntensity * 0.9;
    
    // Draw glow circle
    ctx.fillStyle = COLORS.RED;
    ctx.beginPath();
    ctx.arc(x + 6, y + 8, 11, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow and alpha for main cherry
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    // Cherry body
    ctx.fillStyle = COLORS.RED;
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 6, y + 8, 5, 0, Math.PI * 2); // main cherry
    ctx.fill();
    ctx.stroke();

    // Stem
    ctx.strokeStyle = '#2e8b57'; // stem green
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 3);
    ctx.quadraticCurveTo(x + 8, y + 0, x + 10, y + 2);
    ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(x + 4, y + 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw green apple icon with glow effect
  const drawGreenAppleIcon = (ctx, x, y) => {
    ctx.save();

    // Add pulsing glow effect
    const time = Date.now() * 0.003; // Slow pulsing
    const glowIntensity = 0.7 + 0.3 * Math.sin(time);
    const glowSize = 8 + 4 * Math.sin(time * 1.2);
    
    // Outer glow (green)
    ctx.shadowColor = '#4CAF50';
    ctx.shadowBlur = glowSize;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = glowIntensity * 0.8;
    
    // Draw glow circle
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(x + 6, y + 7, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow and alpha for main apple
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    // Apple body (green)
    ctx.fillStyle = '#4CAF50'; // Bright green
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 7, 6, 7, 0, 0, Math.PI * 2); // oval apple shape
    ctx.fill();
    ctx.stroke();

    // Stem (brown)
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 1);
    ctx.lineTo(x + 6, y + 3);
    ctx.stroke();

    // Leaf (darker green)
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(x + 9, y + 2, 3, 2, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(x + 4, y + 5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw yellow banana icon with glow effect
  const drawYellowBananaIcon = (ctx, x, y) => {
    ctx.save();

    // Add pulsing glow effect
    const time = Date.now() * 0.0035; // Slightly different timing than apple
    const glowIntensity = 0.6 + 0.4 * Math.sin(time);
    const glowSize = 9 + 5 * Math.sin(time * 1.1);
    
    // Outer glow (yellow)
    ctx.shadowColor = '#FFEB3B';
    ctx.shadowBlur = glowSize;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = glowIntensity * 0.7;
    
    // Draw glow ellipse
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.ellipse(x + 7, y + 7, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow and alpha for main banana
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    // Banana body (curved yellow)
    ctx.fillStyle = '#FFEB3B'; // Bright yellow
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 4);
    ctx.quadraticCurveTo(x + 4, y + 2, x + 8, y + 3);
    ctx.quadraticCurveTo(x + 12, y + 4, x + 13, y + 7);
    ctx.quadraticCurveTo(x + 12, y + 10, x + 8, y + 11);
    ctx.quadraticCurveTo(x + 4, y + 11, x + 2, y + 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brown end spots
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.arc(x + 2, y + 6, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 13, y + 7, 1, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(x + 8, y + 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Initialize fruit placements for current level
  const initializeFruitPlacements = useCallback((level) => {
    // Configuration: How many fruits per level - increasingly challenging
    const fruitConfig = {
      1: { apples: 2, bananas: 1 },    // Level 1: 3 total fruits (tutorial level)
      2: { apples: 3, bananas: 2 },    // Level 2: 5 total fruits
      3: { apples: 4, bananas: 3 },    // Level 3: 7 total fruits
      4: { apples: 5, bananas: 4 },    // Level 4: 9 total fruits
      5: { apples: 6, bananas: 5 },    // Level 5: 11 total fruits
      6: { apples: 7, bananas: 6 },    // Level 6: 13 total fruits
      7: { apples: 8, bananas: 7 },    // Level 7: 15 total fruits
      8: { apples: 9, bananas: 8 },    // Level 8: 17 total fruits
      9: { apples: 10, bananas: 9 },   // Level 9: 19 total fruits
      10: { apples: 12, bananas: 10 }, // Level 10: 22 total fruits
      11: { apples: 14, bananas: 12 }, // Level 11: 26 total fruits
      12: { apples: 16, bananas: 14 }, // Level 12: 30 total fruits
      13: { apples: 18, bananas: 16 }, // Level 13: 34 total fruits
      14: { apples: 20, bananas: 18 }, // Level 14: 38 total fruits
      15: { apples: 25, bananas: 20 }  // Level 15: 45 total fruits (ultimate challenge)
    };

    // Default for any higher levels (beyond 15)
    const config = fruitConfig[level] || { apples: 25, bananas: 20 };

    gameData.current.requiredApplesPerLevel = config.apples;
    gameData.current.requiredBananasPerLevel = config.bananas;
    gameData.current.applesCollected = 0;
    gameData.current.bananasCollected = 0;
    gameData.current.applesPlacements = [];
    gameData.current.bananasPlacements = [];

    // Get platform densities and phases for this level
    const densities = gameData.current.platformSpawnDensity || [2, 2, 2, 2];
    const phases = gameData.current.platformSpawnPhases || [0, 1, 0, 1];

    // Helper: Find valid platform rows for a column
    const getValidPlatformRows = (colIndex, startRow, count, spacing = 8) => {
      const density = Math.max(1, densities[colIndex] || 2);
      const phase = phases[colIndex] || 0;
      const validRows = [];
      
      // Search through more rows to ensure we can place all fruits
      for (let row = 0; row < 200; row++) {
        if (((row + phase) % density) === 0) {
          validRows.push(row);
        }
      }
      
      // Select rows with proper spacing
      const selectedRows = [];
      let lastSelectedRow = startRow;
      for (let i = 0; i < count; i++) {
        const candidateRows = validRows.filter(r => r >= lastSelectedRow);
        if (candidateRows.length > 0) {
          selectedRows.push(candidateRows[0]);
          lastSelectedRow = candidateRows[0] + spacing;
        }
      }
      
      return selectedRows;
    };

    // Place apples on platforms (distribute across columns)
    let appleCount = 0;
    let currentRow = 5;
    let attempts = 0;
    const maxAttempts = 200; // Prevent infinite loop
    while (appleCount < config.apples && attempts < maxAttempts) {
      attempts++;
      const colIndex = appleCount % 4; // Distribute across 4 columns
      const validRows = getValidPlatformRows(colIndex, currentRow, 1);
      
      if (validRows.length > 0) {
        const platformRow = validRows[0];
        gameData.current.applesPlacements.push({
          platformIndex: `${colIndex}_${platformRow}`,
          collected: false
        });
        console.log(`🍏 Apple ${appleCount} placed at column ${colIndex}, row ${platformRow}`);
        appleCount++;
        currentRow = platformRow + 8; // Space out vertically
      } else {
        currentRow += 2; // Try next row if no valid platform found
        // Reset to beginning if we've gone too far
        if (currentRow > 200) {
          currentRow = 5;
        }
      }
    }
    if (appleCount < config.apples) {
      console.warn(`⚠️ Could only place ${appleCount}/${config.apples} apples`);
    }

    // Place bananas on platforms (distribute across columns, different from apples)
    let bananaCount = 0;
    currentRow = 10;
    attempts = 0;
    while (bananaCount < config.bananas && attempts < maxAttempts) {
      attempts++;
      const colIndex = (bananaCount + 2) % 4; // Offset columns from apples
      const validRows = getValidPlatformRows(colIndex, currentRow, 1);
      
      if (validRows.length > 0) {
        const platformRow = validRows[0];
        gameData.current.bananasPlacements.push({
          platformIndex: `${colIndex}_${platformRow}`,
          collected: false
        });
        console.log(`🍌 Banana ${bananaCount} placed at column ${colIndex}, row ${platformRow}`);
        bananaCount++;
        currentRow = platformRow + 8; // Space out vertically
      } else {
        currentRow += 2; // Try next row if no valid platform found
        // Reset to beginning if we've gone too far
        if (currentRow > 200) {
          currentRow = 10;
        }
      }
    }
    if (bananaCount < config.bananas) {
      console.warn(`⚠️ Could only place ${bananaCount}/${config.bananas} bananas`);
    }

    console.log(`🍎🍌 Level ${level} Fruits Initialized:`, config.apples, 'apples,', config.bananas, 'bananas');
  }, []);

  // Draw and handle red cherry in the left lift
  const drawGoldenKeyLeft = (ctx) => {
    if (gameData.current.leftKeyCollected) return;
    const { left: shaftX } = getShaftPositions();
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const liftY = gameData.current.leftLiftY;

    // Position cherry inside the left lift (roughly centered)
    const keyX = liftX + Math.floor(LIFT_WIDTH / 2) - 6;
    const keyY = liftY + Math.floor(LIFT_HEIGHT / 2) - 6;

    // Draw the cherry
    drawGoldenKeyIcon(ctx, keyX, keyY);

    // Compute pickup collision with larger, more generous hitbox
    const idx = gameData.current.currentShaftIndex || 0;
    const shaftXForPlayer = getShaftXByIndex(idx);
    const liftCenterXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
    const playerRect = {
      x: liftCenterXForPlayer + gameData.current.playerX,
      y: gameData.current.playerY,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT
    };

    // Larger cherry hitbox for easier collection (28x28 instead of 12x12)
    const keyRect = { x: keyX - 8, y: keyY - 8, w: 28, h: 28 };
    if (rectsIntersect(playerRect, keyRect)) {
      gameData.current.leftKeyCollected = true;
      gameData.current.goldenKeys = (gameData.current.goldenKeys || 0) + 1;
      gameData.current.score += 100; // Add 100 points for collecting a cherry
      playTingSound(); // Play ting sound when cherry is collected
      console.log('Left cherry collected! Score:', gameData.current.score, 'Total cherries:', gameData.current.goldenKeys);
    }
  };

  // Draw and handle red cherry in the right lift
  const drawGoldenKeyRight = (ctx) => {
    if (gameData.current.rightKeyCollected) return;
    const { right: shaftX } = getShaftPositions();
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const liftY = gameData.current.rightLiftY;

    // Position cherry inside the right lift (roughly centered)
    const keyX = liftX + Math.floor(LIFT_WIDTH / 2) - 6;
    const keyY = liftY + Math.floor(LIFT_HEIGHT / 2) - 6;

    // Draw the cherry
    drawGoldenKeyIcon(ctx, keyX, keyY);

    // Compute pickup collision with larger, more generous hitbox
    const idx = gameData.current.currentShaftIndex || 0;
    const shaftXForPlayer = getShaftXByIndex(idx);
    const liftCenterXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
    const playerRect = {
      x: liftCenterXForPlayer + gameData.current.playerX,
      y: gameData.current.playerY,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT
    };

    // Larger cherry hitbox for easier collection (28x28 instead of 12x12)
    const keyRect = { x: keyX - 8, y: keyY - 8, w: 28, h: 28 };
    if (rectsIntersect(playerRect, keyRect)) {
      gameData.current.rightKeyCollected = true;
      gameData.current.goldenKeys = (gameData.current.goldenKeys || 0) + 1;
      gameData.current.score += 100; // Add 100 points for collecting a cherry
      playTingSound(); // Play ting sound when cherry is collected
      console.log('Right cherry collected! Score:', gameData.current.score, 'Total cherries:', gameData.current.goldenKeys);
    }
  };

  // Draw and handle red cherry in the center lift
  const drawGoldenKeyCenter = (ctx) => {
    if (gameData.current.centerKeyCollected) return;
    const { center: shaftX } = getShaftPositions();
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const liftY = gameData.current.liftY;

    const keyX = liftX + Math.floor(LIFT_WIDTH / 2) - 6;
    const keyY = liftY + Math.floor(LIFT_HEIGHT / 2) - 6;

    drawGoldenKeyIcon(ctx, keyX, keyY);

    // Compute pickup collision with larger, more generous hitbox
    const idx = gameData.current.currentShaftIndex || 0;
    const shaftXForPlayer = getShaftXByIndex(idx);
    const liftCenterXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
    const playerRect = {
      x: liftCenterXForPlayer + gameData.current.playerX,
      y: gameData.current.playerY,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT
    };

    // Larger cherry hitbox for easier collection (28x28 instead of 12x12)
    const keyRect = { x: keyX - 8, y: keyY - 8, w: 28, h: 28 };
    if (rectsIntersect(playerRect, keyRect)) {
      gameData.current.centerKeyCollected = true;
      gameData.current.goldenKeys = (gameData.current.goldenKeys || 0) + 1;
      gameData.current.score += 100;
      playTingSound();
      console.log('Center cherry collected! Score:', gameData.current.score, 'Total cherries:', gameData.current.goldenKeys);
    }
  };
  // Initialize stickman sprite (temporarily disabled to show improved fallback)
  const initializeStickmanSprite = useCallback(() => {
    // Temporarily disabled - we'll use the improved fallback white stickman
    console.log('Using improved fallback white stickman instead of sprite');
    // const img = new Image();
    // img.onload = () => {
    //   console.log('Stickman sprite loaded successfully!', img.width, 'x', img.height);
    //   stickmanImageRef.current = img;
    //   // Reset processed sprite cache when asset changes
    //   if (gameData.current) {
    //     gameData.current.processedSpriteCache = {};
    //   }
    // };
    // img.onerror = () => {
    //   console.error('Failed to load stickman sprite from /stickman.png');
    // };
    // img.src = 'stickman.png'; // Load from public folder
  }, []);
  // Save/Load full snapshot to localStorage
  const snapshotState = useCallback(() => {
    const gd = gameData.current;
    return {
      score: gd.score,
      highScore: gd.highScore,
      level: gd.level,
      lives: gd.lives,
      liftY: gd.liftY,
      leftLiftY: gd.leftLiftY,
      rightLiftY: gd.rightLiftY,
      currentShaftIndex: gd.currentShaftIndex,
      playerX: gd.playerX,
      playerY: gd.playerY,
      playerVelocityX: gd.playerVelocityX,
      isJumping: gd.isJumping,
      jumpVelocity: gd.jumpVelocity,
      redLeverTriggered: gd.redLeverTriggered,
      blueLeverTriggered: gd.blueLeverTriggered,
      yellowLeverTriggered: gd.yellowLeverTriggered,
      centerDoorLeftOpen: gd.centerDoorLeftOpen,
      centerDoorRightOpen: gd.centerDoorRightOpen,
      leftLiftDoorRightOpen: gd.leftLiftDoorRightOpen,
      leftLiftDoorLeftOpen: gd.leftLiftDoorLeftOpen,
      rightLiftDoorLeftOpen: gd.rightLiftDoorLeftOpen,
      rightLiftDoorRightOpen: gd.rightLiftDoorRightOpen,
      leftKeyCollected: gd.leftKeyCollected,
      centerKeyCollected: gd.centerKeyCollected,
      rightKeyCollected: gd.rightKeyCollected,
      platformCherriesCollected: Array.from(gd.platformCherriesCollected),
      goldenKeys: gd.goldenKeys,
      wrapModeEnabled: gd.wrapModeEnabled,
      cycleIndex: gd.cycleIndex,
      forceMaxSpeed: gd.forceMaxSpeed,
      onOutsidePlatform: gd.onOutsidePlatform,
      outsidePlatformCol: gd.outsidePlatformCol
    };
  }, []);

  const saveSnapshot = useCallback(() => {
    try {
      const snap = snapshotState();
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
      console.log('Game saved.');
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }, [snapshotState]);

  const loadSnapshot = useCallback(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const snap = JSON.parse(raw);
      const gd = gameData.current;
      Object.assign(gd, snap);
      // Restore platform cherry collection as Set
      if (snap.platformCherriesCollected) {
        gd.platformCherriesCollected = new Set(snap.platformCherriesCollected);
      }
      console.log('Game restored from save.');
      return true;
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  }, []);

  // Initialize background images
  const initializeBackgroundImages = useCallback(() => {
    const imagesToLoad = ['lift1.jpg', 'lift2.jpg', 'lift3.jpg', 'lift4.jpg', 'lift5.jpg', 'lift6.jpg', 'lift7.jpg', 'lift8.jpg', 'lift9.jpg', 'lift10.jpg', 'lift11.jpg', 'lift12.jpg', 'lift13.jpg', 'lift14.jpg', 'lift15.jpg'];
    
    imagesToLoad.forEach((imageName, index) => {
      const img = new Image();
      const levelNumber = index + 1;
      
      img.onload = () => {
        console.log(`Background image ${imageName} loaded successfully!`, img.width, 'x', img.height);
        backgroundImagesRef.current[levelNumber] = img;
      };
      
      img.onerror = () => {
        console.error(`Failed to load background image from images/${imageName}`);
      };
      
      img.src = `images/${imageName}`; // Load from public/images folder
    });
  }, []);

  // Initialize ding sound for lift movement
  const initializeDingSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Ding sound loaded successfully!');
      dingSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Ding sound data loaded');
      if (!dingSoundRef.current) {
        dingSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load ding sound from sound/ding.mp3');
    };
    
    audio.src = 'sound/ding.mp3'; // Load from public/sound folder
    audio.preload = 'auto';
    audio.loop = true; // Loop the ding sound while lift is moving
    audio.volume = 0.5; // Reduce volume by half
    audio.load(); // Explicitly load the audio
  }, []);

  // Initialize ting sound for key collection
  const initializeTingSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Ting sound loaded successfully!');
      tingSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Ting sound data loaded');
      if (!tingSoundRef.current) {
        tingSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load ting sound from sound/ting.mp3');
    };
    
    audio.src = 'sound/ting.mp3'; // Load from public/sound folder
    audio.preload = 'auto';
    audio.load(); // Explicitly load the audio
  }, []);

  // Play ting sound for key collection
  const playTingSound = useCallback(() => {
    console.log('playTingSound called, tingSoundRef.current:', !!tingSoundRef.current);
    if (tingSoundRef.current) {
      try {
        // Ensure audio context is resumed (for browser autoplay policies)
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // Reset the audio to the beginning in case it was played before
        tingSoundRef.current.currentTime = 0;
        console.log('Playing ting sound...');
        
        // Use a promise to handle the play
        const playPromise = tingSoundRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Ting sound played successfully');
          }).catch(error => {
            console.error('Error playing ting sound:', error);
          });
        }
      } catch (error) {
        console.error('Error playing ting sound:', error);
      }
    } else {
      console.warn('Ting sound not loaded yet');
    }
  }, []);

  // Initialize level activation sound
  const initializeLevelSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Level sound loaded successfully!');
      levelSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Level sound data loaded');
      if (!levelSoundRef.current) {
        levelSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load level sound from sound/level.mp3');
    };
    
    audio.src = 'sound/level.mp3';
    audio.preload = 'auto';
    audio.load();
  }, []);

  // Initialize door sliding sound
  const initializeDoorSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Door sound loaded successfully!');
      doorSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Door sound data loaded');
      if (!doorSoundRef.current) {
        doorSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load door sound from sound/door.mp3');
    };
    
    audio.src = 'sound/door.mp3';
    audio.preload = 'auto';
    audio.load();
  }, []);

  // Initialize death splat sound
  const initializeSplatSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Splat sound loaded successfully!');
      splatSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Splat sound data loaded');
      if (!splatSoundRef.current) {
        splatSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load splat sound from sound/splat.mp3');
    };
    
    audio.src = 'sound/splat.mp3';
    audio.preload = 'auto';
    audio.load();
  }, []);

  // Initialize oxy sound for sound toggle
  const initializeOxySound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Oxy sound loaded successfully!');
      oxySoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Oxy sound data loaded');
      if (!oxySoundRef.current) {
        oxySoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load oxy sound from sound/oxy.mp3');
    };
    
    audio.src = 'sound/oxy.mp3';
    audio.preload = 'auto';
    audio.volume = 0.7;
    audio.load();
  }, []);

  // Play oxy sound when toggling sound icon
  const playOxySound = useCallback(() => {
    if (oxySoundRef.current) {
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        oxySoundRef.current.currentTime = 0;
        oxySoundRef.current.play().then(() => {
          console.log('Oxy sound played successfully');
        }).catch(err => {
          console.error('Failed to play oxy sound:', err);
        });
      } catch (error) {
        console.error('Error playing oxy sound:', error);
      }
    }
  }, []);
  // Initialize UFO ambient sound
  const initializeUfoSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('UFO sound loaded successfully!');
      audio.pause(); // Ensure sound starts paused
      ufoSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('UFO sound data loaded');
      if (!ufoSoundRef.current) {
        audio.pause(); // Ensure sound starts paused
        ufoSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load UFO sound from sound/ufo.mp3');
    };
    
    audio.src = 'sound/ufo.mp3';
    audio.preload = 'auto';
    audio.loop = true; // Loop while UFO is on screen
    audio.volume = 0.6;
    audio.load();
  }, []);

  // Initialize medic balloon sound
  const initializeMedicSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Medic sound loaded successfully!');
      medicSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Medic sound data loaded');
      if (!medicSoundRef.current) {
        medicSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load medic sound from sound/medic.mp3');
    };
    
    audio.src = 'sound/medic.mp3';
    audio.preload = 'auto';
    audio.loop = true; // Loop while medpack is on screen
    audio.volume = 0.5;
    audio.load();
  }, []);

  // Initialize pop sound for medic balloon destruction
  const initializePopSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Pop sound loaded successfully!');
      popSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Pop sound data loaded');
      if (!popSoundRef.current) {
        popSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load pop sound from sound/POP.mp3');
    };
    
    audio.src = 'sound/POP.mp3';
    audio.preload = 'auto';
    audio.volume = 0.7;
    audio.load();
  }, []);

  // Play pop sound
  const playPopSound = useCallback(() => {
    if (popSoundRef.current) {
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        popSoundRef.current.currentTime = 0;
        popSoundRef.current.play().then(() => {
          console.log('Pop sound played successfully');
        }).catch(err => {
          console.error('Failed to play pop sound:', err);
        });
      } catch (error) {
        console.error('Error playing pop sound:', error);
      }
    }
  }, []);

  // Initialize gun sound for machine gun
  const initializeGunSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Gun sound loaded successfully!');
      gunSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Gun sound data loaded');
      if (!gunSoundRef.current) {
        gunSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load gun sound from sound/gun.mp3');
    };
    
    audio.src = 'sound/gun.mp3';
    audio.preload = 'auto';
    audio.volume = 0.4;
    audio.load();
  }, []);

  // Play gun sound
  const playGunSound = useCallback(() => {
    if (gunSoundRef.current && soundEnabled) {
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        gunSoundRef.current.currentTime = 0;
        gunSoundRef.current.play().then(() => {
          console.log('Gun sound played successfully');
        }).catch(err => {
          console.error('Failed to play gun sound:', err);
        });
      } catch (error) {
        console.error('Error playing gun sound:', error);
      }
    }
  }, [soundEnabled]);

  // Initialize chute sound for parachute deployment
  const initializeChuteSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Chute sound loaded successfully!');
      chuteSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Chute sound data loaded');
      if (!chuteSoundRef.current) {
        chuteSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load chute sound from sound/chute.mp3');
    };
    
    audio.src = 'sound/chute.mp3';
    audio.preload = 'auto';
    audio.volume = 0.5;
    audio.load();
  }, []);

  // Initialize meteor sound
  const initializeMeteorSound = useCallback(() => {
    const audio = new Audio();
    
    audio.oncanplaythrough = () => {
      console.log('Meteor sound loaded successfully!');
      meteorSoundRef.current = audio;
    };
    
    audio.onloadeddata = () => {
      console.log('Meteor sound data loaded');
      if (!meteorSoundRef.current) {
        meteorSoundRef.current = audio;
      }
    };
    
    audio.onerror = () => {
      console.error('Failed to load meteor sound from sound/meteor.mp3');
    };
    
    audio.src = 'sound/meteor.mp3';
    audio.preload = 'auto';
    audio.volume = 0.6;
    audio.loop = true; // Loop the sound while meteors are visible
    audio.load();
  }, []);

  // Stop all sound effects (for level transitions and cleanup)
  const stopAllSounds = useCallback(() => {
    console.log('🔇 Stopping all sound effects');
    
    // Stop looping sounds
    if (dingSoundRef.current && !dingSoundRef.current.paused) {
      dingSoundRef.current.pause();
      dingSoundRef.current.currentTime = 0;
      console.log('Stopped ding sound');
    }
    
    if (ufoSoundRef.current && !ufoSoundRef.current.paused) {
      ufoSoundRef.current.pause();
      ufoSoundRef.current.currentTime = 0;
      console.log('Stopped UFO sound');
    }
    
    if (medicSoundRef.current && !medicSoundRef.current.paused) {
      medicSoundRef.current.pause();
      medicSoundRef.current.currentTime = 0;
      console.log('Stopped medic sound');
    }
    
    if (meteorSoundRef.current && !meteorSoundRef.current.paused) {
      meteorSoundRef.current.pause();
      meteorSoundRef.current.currentTime = 0;
      console.log('Stopped meteor sound');
    }
    
    // Stop one-shot sounds that might still be playing
    if (gunSoundRef.current && !gunSoundRef.current.paused) {
      gunSoundRef.current.pause();
      gunSoundRef.current.currentTime = 0;
      console.log('Stopped gun sound');
    }
    
    if (levelSoundRef.current && !levelSoundRef.current.paused) {
      levelSoundRef.current.pause();
      levelSoundRef.current.currentTime = 0;
      console.log('Stopped level sound');
    }
    
    if (doorSoundRef.current && !doorSoundRef.current.paused) {
      doorSoundRef.current.pause();
      doorSoundRef.current.currentTime = 0;
      console.log('Stopped door sound');
    }
    
    if (chuteSoundRef.current && !chuteSoundRef.current.paused) {
      chuteSoundRef.current.pause();
      chuteSoundRef.current.currentTime = 0;
      console.log('Stopped chute sound');
    }
  }, []);

  // Play chute sound
  const playChuteSound = useCallback(() => {
    if (chuteSoundRef.current && soundEnabled) {
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        chuteSoundRef.current.currentTime = 0;
        chuteSoundRef.current.play().then(() => {
          console.log('Chute sound played successfully');
        }).catch(err => {
          console.error('Failed to play chute sound:', err);
        });
      } catch (error) {
        console.error('Error playing chute sound:', error);
      }
    }
  }, [soundEnabled]);

  // Handle click on stats canvas (for sound icon toggle)
  const handleStatsClick = useCallback((event) => {
    const canvas = statsCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Check if click is on sound icon (top-right corner)
    const iconSize = 24;
    const iconX = canvas.width - iconSize - 10;
    const iconY = 10;

    if (x >= iconX && x <= iconX + iconSize && y >= iconY && y <= iconY + iconSize) {
      // Toggle sound
      setSoundEnabled(prev => !prev);
      // Play oxy sound
      playOxySound();
      console.log('Sound toggled:', !soundEnabled);
    }
    
    // Check if click is on level advance arrow button (only during gameplay)
    if (gameState === GAME_STATES.PLAYING) {
      const arrowSize = 24;
      const arrowX = canvas.width - arrowSize - 10;
      const arrowY = iconY + iconSize + 10; // 10px gap below speaker icon
      
      if (x >= arrowX && x <= arrowX + arrowSize && y >= arrowY && y <= arrowY + arrowSize) {
        // Advance to next level (wrap from 15 to 1)
        const currentLevel = gameData.current.level;
        const nextLevel = currentLevel >= 15 ? 1 : currentLevel + 1;
        console.log(`TEST: Advancing from level ${currentLevel} to ${nextLevel}`);
        
        try {
          gameData.current.level = nextLevel;
          // Reset level state
          gameData.current.liftY = -LIFT_HEIGHT;
          gameData.current.leftLiftY = -LIFT_HEIGHT;
          gameData.current.rightLiftY = -LIFT_HEIGHT;
          gameData.current.centerLiftDir = 1;
          gameData.current.leftLiftDir = 1;
          gameData.current.rightLiftDir = 1;
          gameData.current.fallDistance = 0;
          gameData.current.isJumping = false;
          gameData.current.playerY = getGroundPlayerYByIndex(0);
          gameData.current.playerX = 0;
          gameData.current.playerVelocityX = 0;
          gameData.current.animationFrame = 0;
          gameData.current.animationTimer = 0;
          gameData.current.movementDirection = 0;
          gameData.current.bodyParts = [];
          gameData.current.bloodSplatters = [];
          gameData.current.onOutsidePlatform = false;
          gameData.current.outsidePlatformCol = -1;
          gameData.current.jumpDirection = 0;
          gameData.current.hitCeiling = false;
          gameData.current.jumpGracePeriod = 0;
          gameData.current.jumpCooldown = 0;
          gameData.current.previousFloor = 30;
          gameData.current.survivedImpact = false;
          gameData.current.wasJumpingAtImpact = false;
          gameData.current.redLeverTriggered = false;
          gameData.current.blueLeverTriggered = false;
          gameData.current.yellowLeverTriggered = false;
          gameData.current.centerDoorLeftOpen = false;
          gameData.current.centerDoorRightOpen = false;
          gameData.current.leftLiftDoorRightOpen = false;
          gameData.current.leftLiftDoorLeftOpen = false;
          gameData.current.rightLiftDoorLeftOpen = false;
          gameData.current.rightLiftDoorRightOpen = false;
          gameData.current.doorOpenProgress = {
            centerLeft: 0,
            centerRight: 0,
            leftLeft: 0,
            leftRight: 0,
            rightLeft: 0,
            rightRight: 0
          };
          gameData.current.currentShaftIndex = 0;
          gameData.current.platformCherriesCollected = new Set();
          gameData.current.goldenKeys = 0;
          
          // Apply level configuration for target level (this will set cherry collection states)
          applyLevelConfig(gameData.current, nextLevel);
          
          // Set platform spawn phases and density before initializing fruit placements
          gameData.current.platformSpawnPhases = [
            Math.floor(Math.random() * 2),
            Math.floor(Math.random() * 2),
            Math.floor(Math.random() * 2),
            Math.floor(Math.random() * 2)
          ];
          gameData.current.platformSpawnDensity = [
            2 + Math.floor(Math.random() * 2),
            2 + Math.floor(Math.random() * 2),
            2 + Math.floor(Math.random() * 2),
            2 + Math.floor(Math.random() * 2)
          ];
          
          // Initialize fruit placements for the target level
          console.log(`TEST: Initializing fruits for level ${nextLevel}`);
          initializeFruitPlacements(nextLevel);
          initializeShaftMarkers();
          logPlatformConfig();
          calculateDynamicSpeed();
          randomizeSideLiftSpeeds();
          
          // Play level sound for feedback
          playLevelSound();
        } catch (error) {
          console.error('ERROR: Failed to advance to level', nextLevel, error);
          console.error('Error stack:', error.stack);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, playOxySound, soundEnabled]);

  // Play level activation sound
  const playLevelSound = useCallback(() => {
    if (levelSoundRef.current) {
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        levelSoundRef.current.currentTime = 0;
        const playPromise = levelSoundRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Level sound played successfully');
          }).catch(error => {
            console.error('Error playing level sound:', error);
          });
        }
      } catch (error) {
        console.error('Error playing level sound:', error);
      }
    }
  }, []);

  // Play door sliding sound
  const playDoorSound = useCallback(() => {
    if (doorSoundRef.current) {
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        doorSoundRef.current.currentTime = 0;
        const playPromise = doorSoundRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Door sound played successfully');
          }).catch(error => {
            console.error('Error playing door sound:', error);
          });
        }
      } catch (error) {
        console.error('Error playing door sound:', error);
      }
    }
  }, []);

  // Play death splat sound
  const playSplatSound = useCallback(() => {
    if (splatSoundRef.current) {
      try {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        splatSoundRef.current.currentTime = 0;
        const playPromise = splatSoundRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Splat sound played successfully');
          }).catch(error => {
            console.error('Error playing splat sound:', error);
          });
        }
      } catch (error) {
        console.error('Error playing splat sound:', error);
      }
    }
  }, []);

  // Calculate dynamic speed based on lift position and level
  const calculateDynamicSpeed = useCallback(() => {
    // Keep center lift speed constant; still update baseLiftSpeed for side lifts randomness
    const cycleBonus = (gameData.current.wrapModeEnabled && gameData.current.cycleIndex === 1) ? 1 : 0;
    const levelBaseSpeed = 2 + (gameData.current.level - 1) + cycleBonus;
    gameData.current.baseLiftSpeed = levelBaseSpeed;

    // Constant center speed (independent of level/position)
    gameData.current.currentLiftSpeed = CENTER_LIFT_SPEED;
  }, []);
  // Randomize ALL lift speeds independently (left, center, right each get different random speeds)
  const randomizeSideLiftSpeeds = useCallback(() => {
    const config = gameData.current.currentLevelConfig || {};
    const rand = (min, max) => min + Math.random() * (max - min);
    
    // Get speed ranges from level config, with fallback defaults
    const leftRange = config.leftLiftSpeedRange || [0.6, 1.6];
    const rightRange = config.rightLiftSpeedRange || [0.6, 1.6];
    const centerRange = config.centerLiftSpeedRange || [2.0, 2.5]; // Center can vary too
    
    // Each lift gets its own completely independent random speed
    // 15% chance each lift goes CRAZY (super fast or super slow)
    const goCrazyChance = 0.15;
    
    // Left lift
    if (Math.random() < goCrazyChance) {
      // Go crazy! Either super slow (0.1-0.3) or super fast (8.0-15.0)
      gameData.current.leftLiftSpeed = (Math.random() < 0.5 ? rand(0.1, 0.3) : rand(8.0, 15.0)) * SPEED_SCALE;
    } else {
      gameData.current.leftLiftSpeed = rand(leftRange[0], leftRange[1]) * SPEED_SCALE;
    }
    
    // Right lift
    if (Math.random() < goCrazyChance) {
      // Go crazy! Either super slow (0.1-0.3) or super fast (8.0-15.0)
      gameData.current.rightLiftSpeed = (Math.random() < 0.5 ? rand(0.1, 0.3) : rand(8.0, 15.0)) * SPEED_SCALE;
    } else {
      gameData.current.rightLiftSpeed = rand(rightRange[0], rightRange[1]) * SPEED_SCALE;
    }
    
    // Center lift
    if (Math.random() < goCrazyChance) {
      // Go crazy! Either super slow (0.2-0.5) or super fast (10.0-18.0)
      gameData.current.currentLiftSpeed = (Math.random() < 0.5 ? rand(0.2, 0.5) : rand(10.0, 18.0)) * SPEED_SCALE;
    } else {
      gameData.current.currentLiftSpeed = rand(centerRange[0], centerRange[1]) * SPEED_SCALE;
    }
    
    const leftCrazy = gameData.current.leftLiftSpeed > 7 * SPEED_SCALE || gameData.current.leftLiftSpeed < 0.4 * SPEED_SCALE ? '🔥' : '';
    const centerCrazy = gameData.current.currentLiftSpeed > 9 * SPEED_SCALE || gameData.current.currentLiftSpeed < 0.6 * SPEED_SCALE ? '🔥' : '';
    const rightCrazy = gameData.current.rightLiftSpeed > 7 * SPEED_SCALE || gameData.current.rightLiftSpeed < 0.4 * SPEED_SCALE ? '🔥' : '';
    
    console.log(`🎲 Randomized lift speeds: Left=${gameData.current.leftLiftSpeed.toFixed(2)}${leftCrazy}, Center=${gameData.current.currentLiftSpeed.toFixed(2)}${centerCrazy}, Right=${gameData.current.rightLiftSpeed.toFixed(2)}${rightCrazy}`);
  }, []);
// Audio system
  const initializeAudio = useCallback(() => {
    // Deprecated: do not auto-create AudioContext on mount to avoid autoplay warning
  }, []);

  // Ensure audio context is created/resumed after a user gesture
  const ensureAudioReady = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          audioContextRef.current = new Ctx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Generate retro sound effects
  const playSound = useCallback((type) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    switch (type) {
      case 'jump':
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        break;
        
      case 'death':
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;
        
      case 'levelUp':
        // Ascending arpeggio
        [440, 554, 659, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.2);
        });
        break;
        
      case 'impact':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
        break;
        
      case 'alarm':
        // Distinctive warning siren sound - alternating high/low tones
        oscillator.type = 'square';
        // Create multiple pulses for siren effect
        [0, 0.15, 0.3, 0.45, 0.6].forEach((offset, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          // Alternate between high and low frequency
          const freq = i % 2 === 0 ? 800 : 600;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
          
          gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 0.15);
          
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + 0.15);
        });
        break;
        
      default:
        // Default case to satisfy ESLint
        break;
    }
  }, []);

  // Play ding sound for lift movement
  const startDingSound = useCallback(() => {
    console.log('startDingSound called, dingSoundRef.current:', !!dingSoundRef.current);
    if (dingSoundRef.current && dingSoundRef.current.paused) {
      try {
        // Ensure audio context is resumed (for browser autoplay policies)
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // Reset the audio to the beginning and play
        dingSoundRef.current.currentTime = 0;
        console.log('Starting ding sound loop...');
        
        // Use a promise to handle the play
        const playPromise = dingSoundRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Ding sound started successfully');
          }).catch(error => {
            console.error('Error playing ding sound:', error);
          });
        }
      } catch (error) {
        console.error('Error playing ding sound:', error);
      }
    }
  }, []);

  // Stop ding sound when lift stops moving
  const stopDingSound = useCallback(() => {
    console.log('stopDingSound called, dingSoundRef.current:', !!dingSoundRef.current);
    if (dingSoundRef.current && !dingSoundRef.current.paused) {
      try {
        dingSoundRef.current.pause();
        dingSoundRef.current.currentTime = 0; // Reset to beginning for next play
        console.log('Ding sound stopped');
      } catch (error) {
        console.error('Error stopping ding sound:', error);
      }
    }
  }, []);

  // Initialize stars
  const initializeStars = useCallback(() => {
    const stars = [];
    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 1,
        twinkle: Math.random() * 100
      });
    }
    gameData.current.stars = stars;
  }, []);

  const randomIntFromRange = useCallback((range, fallbackMin, fallbackMax = fallbackMin) => {
    const hasRange = Array.isArray(range) && range.length >= 2;
    const min = hasRange ? Math.min(range[0], range[1]) : fallbackMin;
    const max = hasRange ? Math.max(range[0], range[1]) : (typeof fallbackMax === 'number' ? fallbackMax : fallbackMin);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return fallbackMin;
    }
    const span = Math.max(0, max - min);
    return Math.floor(min + Math.random() * (span + 1));
  }, []);

  const randomFloatFromRange = useCallback((range, fallbackMin, fallbackMax = fallbackMin) => {
    const hasRange = Array.isArray(range) && range.length >= 2;
    const min = hasRange ? Math.min(range[0], range[1]) : fallbackMin;
    const max = hasRange ? Math.max(range[0], range[1]) : (typeof fallbackMax === 'number' ? fallbackMax : fallbackMin);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return fallbackMin;
    }
    return min + Math.random() * Math.max(0, max - min);
  }, []);

  const primeBalloonDogs = useCallback(() => {
    if (!gameData.current) return;
    const config = gameData.current.currentLevelConfig;
    gameData.current.balloonDogs = [];
    gameData.current.balloonDogHoldUntil = 0;
    gameData.current.ufos = [];
    gameData.current.ufoSpawnTimer = 0;
    gameData.current.ufoNextSpawnTime = 0;
    if (config && config.hasBalloonDogs) {
      gameData.current.balloonDogSpawnTimer = randomIntFromRange(config.balloonDogSpawnRange, 240, 360);
    } else {
      gameData.current.balloonDogSpawnTimer = 0;
    }
  }, [randomIntFromRange]);

  // Initialize machine gun drops for levels 4-6
  const initializeMachineGunDrops = useCallback(() => {
    if (!gameData.current) return;
    const config = gameData.current.currentLevelConfig;
    gameData.current.machineGunDrops = [];
    gameData.current.machineGunSpawnTimer = 0;
    gameData.current.machineGunDropsSpawned = 0;
    gameData.current.bullets = [];
    
    if (config && config.hasMachineGunDrops) {
      // Set initial spawn timer for first machine gun
      gameData.current.machineGunSpawnTimer = 300 + Math.random() * 200; // Spawn after 5-8 seconds
      console.log(`Machine gun drops enabled for level ${gameData.current.level}`);
    }
  }, []);

  // Initialize platform markers (repurpose shaft markers/lines)
  const initializeShaftMarkers = useCallback(() => {
    // No longer using random shaft markers for stars/monsters; keep minimal to avoid errors
    gameData.current.shaftMarkers = [];

    // Initialize platform rows using shaftLines; all platforms start from bottom of screen
    const rows = [];
    const rowSpacing = 60; // vertical spacing between platform rows
    for (let i = 0; i < 20; i++) {
      rows.push({
        y: CANVAS_HEIGHT + i * rowSpacing,
        side: i % 2, // keep property for compatibility, unused in platform mode
        length: 40 // not used, kept for compatibility
      });
    }
    gameData.current.shaftLines = rows;
    primeBalloonDogs();
    initializeMachineGunDrops();
  }, [primeBalloonDogs, initializeMachineGunDrops]);

  // Debug: log platform configuration for current level
  const logPlatformConfig = useCallback(() => {
    try {
      const phases = gameData.current.platformSpawnPhases || [];
      const densities = gameData.current.platformSpawnDensity || [];
      const colors = ['#dd4444', '#4488ff', '#f0d000', '#f0d000'];
      console.log('PLATFORM CONFIG', {
        level: gameData.current.level,
        phases,
        densities,
        colors
      });
    } catch (e) {
      console.log('PLATFORM CONFIG log failed', e);
    }
  }, []);

  // Level2: Draw crushing ceiling (spikes pointing down)
  const drawCrushingCeiling = (ctx, shaftX, ceilingY) => {
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const interiorLeft = liftX + 10;
    const interiorRight = liftX + LIFT_WIDTH - 10;
    const ceilingHeight = 10;
    
    // Pulsing effect to make ceiling more visible
    const pulseSpeed = 0.15;
    const pulse = Math.abs(Math.sin(Date.now() * pulseSpeed * 0.001));
    
    // Draw ceiling block with pulsing brightness
    const brightness = 170 + Math.floor(pulse * 85); // Oscillates between 170-255
    ctx.fillStyle = `rgb(${brightness}, 0, 0)`; // Bright red that pulses
    ctx.fillRect(interiorLeft, ceilingY, interiorRight - interiorLeft, ceilingHeight);
    
    // Draw crushing spikes (pointing down) - larger and more visible
    const spikeBrightness = 200 + Math.floor(pulse * 55); // Oscillates between 200-255
    ctx.fillStyle = `rgb(${spikeBrightness}, ${Math.floor(spikeBrightness * 0.2)}, 0)`; // Bright orange-red
    const spikeWidth = 10; // Increased from 8
    const spikeHeight = 16; // Increased from 12
    for (let sx = interiorLeft; sx < interiorRight - spikeWidth; sx += spikeWidth) {
      ctx.beginPath();
      ctx.moveTo(sx, ceilingY + ceilingHeight);
      ctx.lineTo(sx + spikeWidth / 2, ceilingY + ceilingHeight + spikeHeight);
      ctx.lineTo(sx + spikeWidth, ceilingY + ceilingHeight);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 2; // Thicker stroke
      ctx.stroke();
    }
    
    // Warning stripes on ceiling block
    ctx.fillStyle = COLORS.YELLOW;
    for (let i = 0; i < 3; i++) {
      const stripeX = interiorLeft + (i + 1) * (interiorRight - interiorLeft) / 4;
      ctx.fillRect(stripeX - 2, ceilingY, 4, ceilingHeight);
    }
    
    // Outline with pulsing thickness
    ctx.strokeStyle = COLORS.YELLOW;
    ctx.lineWidth = 3 + Math.floor(pulse * 2); // Pulsing outline
    ctx.strokeRect(interiorLeft, ceilingY, interiorRight - interiorLeft, ceilingHeight);
    
    // Add warning text above ceiling
    ctx.fillStyle = COLORS.YELLOW;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ DANGER ⚠️', (interiorLeft + interiorRight) / 2, ceilingY - 5);
  };

  const getPlayerBounds = () => {
    const idx = gameData.current.currentShaftIndex || 0;
    const shaftX = getShaftXByIndex(idx);
    const liftCenterX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
    const x = liftCenterX + (gameData.current.playerX || 0);
    const y = typeof gameData.current.playerY === 'number'
      ? gameData.current.playerY
      : getGroundPlayerYByIndex(idx);
    return {
      left: x,
      top: y,
      right: x + PLAYER_WIDTH,
      bottom: y + PLAYER_HEIGHT,
      centerX: x + PLAYER_WIDTH / 2,
      centerY: y + PLAYER_HEIGHT / 2
    };
  };

  // Helper function to calculate natural balloon sway motion
  const calculateBalloonSway = (balloon, frameCount) => {
    // Initialize sway properties if not set
    if (balloon.swayPhase === undefined) {
      balloon.swayPhase = Math.random() * Math.PI * 2; // Random starting phase
      balloon.swayAmplitude = 0.8 + Math.random() * 0.4; // Amplitude between 0.8-1.2
      balloon.swaySpeed = 0.02 + Math.random() * 0.01; // Speed between 0.02-0.03
    }
    
    // Calculate sway using sine wave
    const sway = Math.sin((frameCount * balloon.swaySpeed) + balloon.swayPhase) * balloon.swayAmplitude;
    return sway;
  };

  const spawnBalloonDog = useCallback(() => {
    const config = gameData.current.currentLevelConfig;
    if (!config || !config.hasBalloonDogs) return;

    if (!Array.isArray(gameData.current.balloonDogs)) {
      gameData.current.balloonDogs = [];
    }

    const spawnX = 60 + Math.random() * (CANVAS_WIDTH - 120);
    const spawnY = randomFloatFromRange(config.balloonDogYRange, 150, 240);
    const maxSpeed = Math.max(0.8, randomFloatFromRange(config.balloonDogSpeedRange, 1.0, 1.6));

    const dog = {
      x: spawnX,
      y: spawnY,
      baseY: spawnY,
      vx: 0,
      maxSpeed,
      accel: Math.max(0.04, maxSpeed * 0.06),
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 0.02 + Math.random() * 0.01,
      bobAmplitude: 10 + Math.random() * 6,
      facing: 1
    };

    gameData.current.balloonDogs.push(dog);
    gameData.current.balloonDogSpawnTimer = randomIntFromRange(config.balloonDogSpawnRange, 240, 360);
  }, [randomFloatFromRange, randomIntFromRange]);

  const spawnFlyingToilet = useCallback(() => {
    const config = gameData.current.currentLevelConfig;
    if (!config || !config.hasFlyingToilets) return;

    if (!Array.isArray(gameData.current.flyingToilets)) {
      gameData.current.flyingToilets = [];
    }

    const spawnX = 60 + Math.random() * (CANVAS_WIDTH - 120);
    const spawnY = randomFloatFromRange(config.flyingToiletYRange, 150, 240);
    const maxSpeed = Math.max(0.8, randomFloatFromRange(config.flyingToiletSpeedRange, 1.0, 1.6));

    const toilet = {
      x: spawnX,
      y: spawnY,
      baseY: spawnY,
      vx: 0,
      maxSpeed,
      accel: Math.max(0.04, maxSpeed * 0.06),
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 0.02 + Math.random() * 0.01,
      bobAmplitude: 10 + Math.random() * 6,
      facing: 1
    };

    gameData.current.flyingToilets.push(toilet);
    gameData.current.flyingToiletSpawnTimer = randomIntFromRange(config.flyingToiletSpawnRange, 240, 360);
  }, [randomFloatFromRange, randomIntFromRange]);

  const resetLevelAfterDeath = useCallback(() => {
    // Stop all sound effects when level resets
    stopAllSounds();
    
    gameData.current.liftY = -LIFT_HEIGHT;
    gameData.current.leftLiftY = -LIFT_HEIGHT;
    gameData.current.rightLiftY = -LIFT_HEIGHT;
    gameData.current.centerLiftDir = 1;
    gameData.current.leftLiftDir = 1;
    gameData.current.rightLiftDir = 1;
    randomizeSideLiftSpeeds();
    gameData.current.fallDistance = 0;
    gameData.current.isJumping = false;
    gameData.current.deathEnv = null;
    const idxR = 0;
    gameData.current.playerY = getGroundPlayerYByIndex(idxR);
    gameData.current.playerX = 0;
    gameData.current.playerVelocityX = 0;
    gameData.current.animationFrame = 0;
    gameData.current.animationTimer = 0;
    gameData.current.movementDirection = 0;
    gameData.current.bodyParts = [];
    gameData.current.bloodSplatters = [];
    gameData.current.onOutsidePlatform = false;
    gameData.current.onTopOfLift = false;
    gameData.current.outsidePlatformCol = -1;
    gameData.current.ridingPlatformLineIndex = -1;
    gameData.current.ridingPlatformCol = -1;
    gameData.current.jumpDirection = 0;
    gameData.current.hitCeiling = false;
    gameData.current.jumpGracePeriod = 0;
    gameData.current.jumpCooldown = 30;
    gameData.current.previousFloor = 30;
    gameData.current.survivedImpact = false;
    gameData.current.wasJumpingAtImpact = false;
    gameData.current.bigFallTriggered = false;
    gameData.current.redLeverTriggered = false;
    gameData.current.blueLeverTriggered = false;
    gameData.current.yellowLeverTriggered = false;
    gameData.current.centerDoorLeftOpen = false;
    gameData.current.centerDoorRightOpen = false;
    gameData.current.leftLiftDoorRightOpen = false;
    gameData.current.leftLiftDoorLeftOpen = false;
    gameData.current.rightLiftDoorLeftOpen = false;
    gameData.current.rightLiftDoorRightOpen = false;
    gameData.current.doorOpenProgress = {
      centerLeft: 0,
      centerRight: 0,
      leftLeft: 0,
      leftRight: 0,
      rightLeft: 0,
      rightRight: 0
    };
    gameData.current.platformCherriesCollected = new Set();
    gameData.current.goldenKeys = 0;
    applyLevelConfig(gameData.current, gameData.current.level);
    initializeFruitPlacements(gameData.current.level);
    gameData.current.medpacks = [];
    gameData.current.medpackSpawnTimer = 300 + Math.random() * 300;
    gameData.current.meteors = [];
    gameData.current.meteorSpawnTimer = 1200 + Math.random() * 900;
    gameData.current.mushrooms = [];
    gameData.current.mushroomSpawnTimer = 1800 + Math.random() * 900;
    gameData.current.invincible = false;
    gameData.current.invincibleUntil = 0;
    gameData.current.parachuteActive = false;
    gameData.current.jumpTapCount = 0;
    gameData.current.dynamiteBalloons = [];
    gameData.current.dynamiteBalloonSpawnTimer = 400 + Math.random() * 400;
    gameData.current.currentShaftIndex = 0;
    gameData.current.leftKeyCollected = false;
    gameData.current.centerKeyCollected = false;
    gameData.current.rightKeyCollected = false;
    gameData.current.crushingCeilingActive = false;
    gameData.current.crushingCeilingY = 0;
    gameData.current.crushingCeilingDir = 1;
    gameData.current.leftCrushingCeilingActive = false;
    gameData.current.leftCrushingCeilingY = 0;
    gameData.current.leftCrushingCeilingDir = 1;
    gameData.current.rightCrushingCeilingActive = false;
    gameData.current.rightCrushingCeilingY = 0;
    gameData.current.rightCrushingCeilingDir = 1;
    gameData.current.balloonDogHoldUntil = 0;
    gameData.current.balloonDogSpawnTimer = 0;
    gameData.current.balloonDogs = [];
    gameData.current.ufos = [];
    gameData.current.ufoSpawnTimer = 0;
    gameData.current.ufoNextSpawnTime = 0;
    // Reset cowboy hat state on death
    gameData.current.hasCowboyHat = false;
    gameData.current.cowboyHatBalloons = [];
    gameData.current.cowboyHatSpawnTimer = 0;
    initializeShaftMarkers();
  }, [applyLevelConfig, initializeFruitPlacements, initializeShaftMarkers, randomizeSideLiftSpeeds]);

  const handleBalloonDogBite = useCallback((dog) => {
    if (gameState !== GAME_STATES.PLAYING) return false;
    const now = Date.now();
    if (now < (gameData.current.balloonDogHoldUntil || 0)) return false;
    
    // Check if player is invincible
    const isInvincible = gameData.current.invincible && now < (gameData.current.invincibleUntil || 0);
    if (isInvincible) return false;

    console.log('Level2: Balloon dog chomped the stickman!');
    playSound('death');
    playSplatSound();
    createGoreEffect();
    gameData.current.isJumping = false;
    gameData.current.playerVelocityX = 0;
    gameData.current.movementDirection = 0;
    gameData.current.lives--;
    gameData.current.balloonDogHoldUntil = now + 2000;
    if (dog) {
      dog.vx = 0;
    }

    if (gameData.current.lives <= 0) {
      setGameState(GAME_STATES.DEAD);
    } else {
      setTimeout(() => {
        resetLevelAfterDeath();
        primeBalloonDogs();
      }, 1600);
    }

    return true;
  }, [gameState, playSound, playSplatSound, resetLevelAfterDeath, primeBalloonDogs, setGameState]);

  const handleFlyingToiletBite = useCallback((toilet) => {
    if (gameState !== GAME_STATES.PLAYING) return false;
    const now = Date.now();
    if (now < (gameData.current.flyingToiletHoldUntil || 0)) return false;
    
    // Check if player is invincible
    const isInvincible = gameData.current.invincible && now < (gameData.current.invincibleUntil || 0);
    if (isInvincible) return false;
    
    console.log('Flying toilet ate the stickman!');
    playSound('death');
    playSplatSound();
    createGoreEffect();
    gameData.current.isJumping = false;
    gameData.current.playerVelocityX = 0;
    gameData.current.movementDirection = 0;
    gameData.current.lives--;
    gameData.current.flyingToiletHoldUntil = now + 2000;
    if (toilet) { toilet.vx = 0; }
    if (gameData.current.lives <= 0) {
      setGameState(GAME_STATES.DEAD);
    } else {
      setTimeout(() => { resetLevelAfterDeath(); primeBalloonDogs(); }, 1600);
    }
    return true;
  }, [gameState, playSound, playSplatSound, resetLevelAfterDeath, primeBalloonDogs, setGameState]);

  const updateBalloonDogs = useCallback(() => {
    const config = gameData.current.currentLevelConfig;
    if (!config || !config.hasBalloonDogs) return;
    if (gameState !== GAME_STATES.PLAYING) return;

    const now = Date.now();
    if (now < (gameData.current.balloonDogHoldUntil || 0)) {
      return;
    }

    if (!Array.isArray(gameData.current.balloonDogs)) {
      gameData.current.balloonDogs = [];
    }

    const maxCount = config.balloonDogMaxCount || 0;
    if (maxCount > 0) {
      if (gameData.current.balloonDogSpawnTimer > 0) {
        gameData.current.balloonDogSpawnTimer--;
      } else if (gameData.current.balloonDogs.length < maxCount) {
        spawnBalloonDog();
      }
    }

    const playerBounds = getPlayerBounds();
    if (!playerBounds) return;

    let playerBit = false;
    const leftClamp = 40;
    const rightClamp = CANVAS_WIDTH - 40;

    gameData.current.balloonDogs.forEach(dog => {
      if (!dog || playerBit) return;

      const diffX = playerBounds.centerX - dog.x;
      const dir = diffX === 0 ? 0 : (diffX > 0 ? 1 : -1);
      const accel = dog.accel || 0.05;
      dog.vx = (dog.vx || 0) + dir * accel;
      const limit = dog.maxSpeed || 1.2;
      if (dog.vx > limit) dog.vx = limit;
      if (dog.vx < -limit) dog.vx = -limit;

      dog.x += dog.vx;
      if (dog.x < leftClamp) {
        dog.x = leftClamp;
        dog.vx = Math.abs(dog.vx) * 0.4;
      } else if (dog.x > rightClamp) {
        dog.x = rightClamp;
        dog.vx = -Math.abs(dog.vx) * 0.4;
      }
      dog.facing = diffX >= 0 ? 1 : -1;

      const desiredBaseY = Math.max(90, Math.min(playerBounds.top - 36, CANVAS_HEIGHT - 170));
      dog.baseY = typeof dog.baseY === 'number' ? dog.baseY : (typeof dog.y === 'number' ? dog.y : desiredBaseY);
      dog.baseY += (desiredBaseY - dog.baseY) * 0.03;
      dog.bobPhase = (dog.bobPhase || 0) + (dog.bobSpeed || 0.02);
      dog.y = dog.baseY + Math.sin(dog.bobPhase) * (dog.bobAmplitude || 12);

      const mouthX = dog.x + dog.facing * 18;
      const mouthY = dog.y + 8;
      const dx = mouthX - playerBounds.centerX;
      const dy = mouthY - playerBounds.centerY;
      const radius = config.balloonDogBiteRadius || 28;
      if (dx * dx + dy * dy <= radius * radius) {
        playerBit = handleBalloonDogBite(dog);
      }
    });

    gameData.current.balloonDogs = gameData.current.balloonDogs.filter(dog => dog && dog.x > -200 && dog.x < CANVAS_WIDTH + 200);
  }, [gameState, spawnBalloonDog, handleBalloonDogBite]);

  const drawBalloonDogs = useCallback((ctx) => {
    const config = gameData.current.currentLevelConfig;
    if (!config || !config.hasBalloonDogs) return;
    const dogs = gameData.current.balloonDogs;
    if (!dogs || dogs.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    dogs.forEach(dog => {
      if (!dog) return;
      const x = dog.x;
      const y = dog.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 18);
      ctx.stroke();

      ctx.fillStyle = '#b8ddff';
      ctx.beginPath();
      ctx.ellipse(x, y - 28, 18, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#85c5ff';
      ctx.beginPath();
      ctx.ellipse(x, y - 30, 12, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#6fa3ff';
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 16);
      ctx.lineTo(x + 4, y - 16);
      ctx.lineTo(x, y - 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#5a3b22';
      ctx.beginPath();
      ctx.ellipse(x, y + 12, 20, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x - dog.facing * 16, y + 12);
      ctx.lineTo(x - dog.facing * 22, y + 6);
      ctx.lineTo(x - dog.facing * 20, y + 14);
      ctx.closePath();
      ctx.fill();

      const headX = x + dog.facing * 16;
      ctx.beginPath();
      ctx.ellipse(headX, y + 6, 12, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3a2516';
      ctx.beginPath();
      ctx.moveTo(headX - dog.facing * 6, y - 2);
      ctx.lineTo(headX - dog.facing * 2, y - 12);
      ctx.lineTo(headX + dog.facing * 2, y - 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#c68a5a';
      ctx.beginPath();
      ctx.ellipse(headX + dog.facing * 6, y + 8, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.WHITE;
      ctx.beginPath();
      ctx.arc(headX + dog.facing * 4, y + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.BLACK;
      ctx.beginPath();
      ctx.arc(headX + dog.facing * 4.5, y + 2, 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.WHITE;
      ctx.beginPath();
      ctx.moveTo(headX + dog.facing * 10, y + 6);
      ctx.lineTo(headX + dog.facing * 14, y + 10);
      ctx.lineTo(headX + dog.facing * 8, y + 10);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(headX + dog.facing * 11, y + 10);
      ctx.lineTo(headX + dog.facing * 15, y + 14);
      ctx.lineTo(headX + dog.facing * 9, y + 14);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }, []);

  // Draw pixel font text
  const drawPixelText = (ctx, text, x, y, size = 2, color = COLORS.WHITE) => {
    ctx.fillStyle = color;
    ctx.font = `${size * 8}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
  };

  // Draw level complete banner
  const drawLevelCompleteBanner = (ctx, level) => {
    ctx.save();
    
    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Banner background
    const bannerWidth = 500;
    const bannerHeight = 150;
    const bannerX = (CANVAS_WIDTH - bannerWidth) / 2;
    const bannerY = (CANVAS_HEIGHT - bannerHeight) / 2;
    
    // Banner box with glow
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bannerX, bannerY, bannerWidth, bannerHeight);
    
    // Banner border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 4;
    ctx.strokeRect(bannerX, bannerY, bannerWidth, bannerHeight);
    
    // Draw text
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 32px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEVEL COMPLETE!', CANVAS_WIDTH / 2, bannerY + 50);
    
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 48px "Press Start 2P", monospace';
    ctx.fillText(`LEVEL ${level}`, CANVAS_WIDTH / 2, bannerY + 105);
    
    ctx.restore();
  };
  // Broken stickman function removed - replaced with immediate gore explosion
  // Draw stick man player using sprite sheet
  const drawPlayer = (ctx, x, y, isDead = false) => {
    // Draw invincibility glow/aura if active
    if (!isDead && gameData.current.invincible) {
      const now = Date.now();
      if (now < (gameData.current.invincibleUntil || 0)) {
        ctx.save();
        // Pulsing golden glow
        const pulsePhase = (now / 200) % (Math.PI * 2);
        const pulseAlpha = 0.3 + Math.sin(pulsePhase) * 0.2;
        const glowRadius = 30 + Math.sin(pulsePhase) * 5;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2, 5, x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2, glowRadius);
        gradient.addColorStop(0, `rgba(255, 221, 0, ${pulseAlpha})`);
        gradient.addColorStop(0.5, `rgba(255, 221, 0, ${pulseAlpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 221, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - glowRadius, y - glowRadius, PLAYER_WIDTH + glowRadius * 2, PLAYER_HEIGHT + glowRadius * 2);
        ctx.restore();
      }
    }
    
    if (isDead) {
      // Draw gore mode - detached parts
      gameData.current.bodyParts.forEach(part => {
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, part.width, part.height);
        
        // Add blood trail
        if (part.bloodTrail) {
          part.bloodTrail.forEach(blood => {
            ctx.fillStyle = `rgba(255, 0, 0, ${blood.alpha})`;
            ctx.fillRect(blood.x, blood.y, 2, 2);
          });
        }
      });
    } else if (stickmanImageRef.current) {
      // Use sprite sheet if loaded
      const spriteSheet = stickmanImageRef.current;

      // Ensure crisp rendering
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Reduce debug logging to prevent console spam and improve performance
      if (gameData.current.movementDirection !== 0 && gameData.current.frameCount % 60 === 0) {
        console.log('Animating:', 'Direction:', gameData.current.movementDirection, 'Frame:', gameData.current.animationFrame, 'Timer:', gameData.current.animationTimer);
      }
      
      // Sprite sheet is 4x2 grid (8 frames total)
      const frameWidth = spriteSheet.width / 4;
      const frameHeight = spriteSheet.height / 2;
      
      // Determine which frame to use based on movement and animation
      let frameX = 0;
      let frameY = 0;
      
      if (gameData.current.isJumping) {
        // Use jumping frame - frame 3 from top row (standing jump pose)
        frameX = 3;
        frameY = 0;
      } else if (gameData.current.movementDirection !== 0) {
        // Use running animation frames - cycle through frames 0-3 from top row
        // This creates a smooth running animation loop
        frameX = gameData.current.animationFrame;
        frameY = 0; // Use top row for all movement animations
      } else {
        // Use idle/standing frame - frame 2 (center-standing pose)
        frameX = 2;
        frameY = 0;
      }
      
      // Calculate source rectangle in sprite sheet
      const srcX = frameX * frameWidth;
      const srcY = frameY * frameHeight;

      // Prepare cache key based on pose, direction, and color with stable direction logic
      const dir = (() => {
        if (gameData.current.isJumping) {
          const jd = gameData.current.jumpDirection || gameData.current.facingDir || 1;
          return jd < 0 ? 'L' : 'R';
        }
        // Use stable direction based on facing direction when not moving to prevent flickering
        if (gameData.current.movementDirection === 0) {
          return (gameData.current.facingDir < 0) ? 'L' : 'R';
        }
        // Update facing direction based on movement and use it
        gameData.current.facingDir = gameData.current.movementDirection;
        return (gameData.current.movementDirection < 0) ? 'L' : 'R';
      })();
      const colorKey = gameData.current.stickmanColor;
      const cacheKey = `${colorKey}_${frameX}_${frameY}_${dir}`;

      // Use cached processed frame if available
      const cache = gameData.current.processedSpriteCache || (gameData.current.processedSpriteCache = {});
      const cached = cache[cacheKey];
      if (cached) {
        // Use pixel-perfect positioning to prevent sub-pixel artifacts
        ctx.drawImage(cached, Math.round(x), Math.round(y));
        ctx.restore();
        return;
      }

      // Create a silhouette of the current frame (already transparent background)
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = PLAYER_WIDTH;
      tempCanvas.height = PLAYER_HEIGHT;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.imageSmoothingEnabled = false;

      if (dir === 'L') {
        // Flip horizontally for left movement
        tempCtx.save();
        tempCtx.scale(-1, 1);
        tempCtx.drawImage(
          spriteSheet,
          srcX, srcY, frameWidth, frameHeight,
          -PLAYER_WIDTH, 0, PLAYER_WIDTH, PLAYER_HEIGHT
        );
        tempCtx.restore();
      } else {
        // Normal drawing
        tempCtx.drawImage(
          spriteSheet,
          srcX, srcY, frameWidth, frameHeight,
          0, 0, PLAYER_WIDTH, PLAYER_HEIGHT
        );
      }

      // If the frame appears fully opaque (likely has a solid background),
      // detect the background color from the corners and make it transparent.
      try {
        const imgData = tempCtx.getImageData(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
        const data = imgData.data;
        const totalPixels = PLAYER_WIDTH * PLAYER_HEIGHT;
        let transparentCount = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) transparentCount++;
        }
        const transparentRatio = transparentCount / totalPixels;

        if (transparentRatio < 0.05) {
          // Estimate background color by averaging the four corners
          const idxTL = 0 * 4;
          const idxTR = ((PLAYER_WIDTH - 1) + 0 * PLAYER_WIDTH) * 4;
          const idxBL = ((0) + (PLAYER_HEIGHT - 1) * PLAYER_WIDTH) * 4;
          const idxBR = ((PLAYER_WIDTH - 1) + (PLAYER_HEIGHT - 1) * PLAYER_WIDTH) * 4;

          const bgR = (data[idxTL] + data[idxTR] + data[idxBL] + data[idxBR]) / 4;
          const bgG = (data[idxTL + 1] + data[idxTR + 1] + data[idxBL + 1] + data[idxBR + 1]) / 4;
          const bgB = (data[idxTL + 2] + data[idxTR + 2] + data[idxBL + 2] + data[idxBR + 2]) / 4;

          // Remove pixels close to the background color
          const threshold = 42; // color distance threshold (~medium tolerance)
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const dr = r - bgR;
            const dg = g - bgG;
            const db = b - bgB;
            const dist = Math.abs(dr) + Math.abs(dg) + Math.abs(db);
            if (dist < threshold) {
              data[i + 3] = 0; // make background transparent
            }
          }

          // Also strip near-white halo if present
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a > 0 && r > 245 && g > 245 && b > 245) {
              data[i + 3] = 0;
            }
          }

          tempCtx.putImageData(imgData, 0, 0);
        }
      } catch (e) {
        // If getImageData fails (tainted canvas or other), continue without background stripping
      }

      // Recolor to a solid monochrome while preserving alpha
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.fillStyle = colorKey === 'black' ? COLORS.BLACK : COLORS.WHITE;
      tempCtx.fillRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
      tempCtx.globalCompositeOperation = 'source-over';

      // Build outline from the silhouette for better visibility
      const outlineCanvas = document.createElement('canvas');
      outlineCanvas.width = PLAYER_WIDTH;
      outlineCanvas.height = PLAYER_HEIGHT;
      const outlineCtx = outlineCanvas.getContext('2d');
      outlineCtx.imageSmoothingEnabled = false;
      outlineCtx.clearRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
      outlineCtx.drawImage(tempCanvas, 0, 0);
      outlineCtx.globalCompositeOperation = 'source-in';
      const outlineColor = colorKey === 'black' ? COLORS.WHITE : COLORS.BLACK;
      outlineCtx.fillStyle = outlineColor;
      outlineCtx.fillRect(0, 0, PLAYER_WIDTH, PLAYER_HEIGHT);
      outlineCtx.globalCompositeOperation = 'source-over';

      // Compose final (outline + fill) into a cached canvas
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = PLAYER_WIDTH;
      finalCanvas.height = PLAYER_HEIGHT;
      const finalCtx = finalCanvas.getContext('2d');
      finalCtx.imageSmoothingEnabled = false;

      // Draw thicker outline around the sprite for better visibility
      const offsets = [
        [-2, 0], [2, 0], [0, -2], [0, 2],
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [1, -1], [-1, 1], [1, 1]
      ];
      offsets.forEach(([dx, dy]) => {
        finalCtx.drawImage(outlineCanvas, dx, dy);
      });

      // Draw filled silhouette on top
      finalCtx.drawImage(tempCanvas, 0, 0);

      // Cache and draw with pixel-perfect positioning
      cache[cacheKey] = finalCanvas;
      ctx.drawImage(finalCanvas, Math.round(x), Math.round(y));
      ctx.restore();
    } else {
      // Fallback: animated side-walk stickman with facing and limb swing
      ctx.save();
      ctx.globalAlpha = 1.0;

      // Compute orientation and walk phase with stable direction logic
      const dir = (() => {
        if (gameData.current.isJumping && gameData.current.jumpDirection) {
          return gameData.current.jumpDirection < 0 ? -1 : 1;
        }
        // Use stable facing direction to prevent flickering
        if (gameData.current.movementDirection !== 0) {
          gameData.current.facingDir = gameData.current.movementDirection;
        }
        return (gameData.current.facingDir || 1) < 0 ? -1 : 1;
      })();
      const moving = gameData.current.movementDirection !== 0;
      const phase = moving ? (gameData.current.animationFrame / 4) * Math.PI * 2 : 0;
      let armSwing = Math.sin(phase) * 1.5; // radians (walk) - increased to 1.5 for MORE visible arm swinging when walking
      let legSwing = Math.sin(phase) * 0.6; // radians (walk) - slightly increased for more visible leg movement
      let bodyLean = moving ? dir * 0.08 : 0; // slight lean
      if (gameData.current.isJumping) {
        // Animated in-air pose: vary arms over time; keep legs still when falling
        const now = Date.now();
        const ascend = (gameData.current.jumpVelocity || 0) < 0;
        const falling = !ascend;
        const airPhase = ((now % 600) / 600) * Math.PI * 2;
        // Lean toward jump direction
        bodyLean = dir * (0.12 + 0.08);
        if (ascend) {
          armSwing = 1.05 + 0.25 * Math.sin(airPhase);
          legSwing = 0.60 + 0.15 * Math.sin(airPhase + Math.PI / 2);
        } else {
          // Falling: wave arms, but keep legs straight (no swing)
          armSwing = 0.70 + 0.35 * Math.sin(airPhase);
          legSwing = 0;
        }
      }

      // Work in local coords with center anchored, then flip for left
      const cx = Math.round(x + PLAYER_WIDTH / 2);
      const cy = Math.round(y);
      ctx.translate(cx, cy);
      if (dir < 0) ctx.scale(-1, 1);

      // Sizes
      const headSize = Math.max(8, PLAYER_WIDTH / 3.5);
      const bodyHeight = PLAYER_HEIGHT * 0.55;
      const bodyWidth = Math.max(6, PLAYER_WIDTH / 4.5);

      // HEAD
      ctx.save();
      ctx.translate(0, headSize);
      // slight head bob when moving
      ctx.translate(0, moving ? Math.sin(phase) * 1.5 : 0);
      ctx.fillStyle = COLORS.WHITE;
      ctx.beginPath();
      ctx.arc(0, 0, headSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, headSize, 0, Math.PI * 2);
      ctx.stroke();
      // Eye on facing side
      const eyeSize = Math.max(2, headSize / 4);
      ctx.fillStyle = COLORS.BLACK;
      ctx.fillRect(headSize * 0.35, -eyeSize / 2, eyeSize, eyeSize);
      ctx.restore();

      // BODY (slight lean)
      ctx.save();
      const bodyTop = headSize * 2;
      ctx.translate(0, bodyTop);
      ctx.rotate(bodyLean);
      ctx.fillStyle = COLORS.WHITE;
      ctx.fillRect(-bodyWidth / 2, 0, bodyWidth, bodyHeight);
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 2;
      ctx.strokeRect(-bodyWidth / 2, 0, bodyWidth, bodyHeight);
      ctx.restore();

      // ARMS and LEGS
      const armLen = PLAYER_WIDTH * 0.55;
      const armThick = Math.max(3, PLAYER_HEIGHT / 16);
      const shoulderY = bodyTop + bodyHeight * 0.28;
      const hipY = bodyTop + bodyHeight;
      const legLen = Math.max(20, PLAYER_HEIGHT - hipY);
      const legThick = Math.max(4, PLAYER_WIDTH / 7);
      const jumpOffset = gameData.current.isJumping ? -6 : 0;

      if (moving || gameData.current.isJumping) {
        // Moving/jumping: upright gait with vertical limbs swinging under the body
        const armOffsetX = armThick * 0.5;
        const legOffsetX = Math.max(3, bodyWidth * 0.25);
        const armAngle = armSwing; // stronger arm swing for visible motion
        const legAngle = legSwing * 0.8; // slightly stronger leg swing for natural gait

      // Back arm
      ctx.save();
      ctx.translate(0, shoulderY);
      ctx.rotate(gameData.current.isJumping ? -armSwing * (dir > 0 ? 1 : 0.6) : -armSwing);
      ctx.fillStyle = COLORS.WHITE;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.fillRect(-armThick / 2, 0, armThick, armLen);
        ctx.strokeRect(-armThick / 2, 0, armThick, armLen);
        ctx.restore();
      // Front arm
      ctx.save();
      ctx.translate(0, shoulderY);
      ctx.rotate(gameData.current.isJumping ? armSwing * (dir > 0 ? 0.6 : 1) : armSwing);
      ctx.fillStyle = COLORS.WHITE;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.fillRect(-armThick / 2, 0, armThick, armLen);
        ctx.strokeRect(-armThick / 2, 0, armThick, armLen);
        ctx.restore();

      // Back leg (offset to back side)
      ctx.save();
      ctx.translate(-legOffsetX, hipY + jumpOffset);
      const ascendLeg = (gameData.current.jumpVelocity || 0) < 0;
      const fallingLeg = gameData.current.isJumping && !ascendLeg;
      ctx.rotate(gameData.current.isJumping ? (fallingLeg ? 0 : -legSwing * (dir > 0 ? 1 : 0.8)) : -legSwing);
      ctx.fillStyle = COLORS.WHITE;
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 2;
      ctx.fillRect(-legThick / 2, 0, legThick, legLen);
      ctx.strokeRect(-legThick / 2, 0, legThick, legLen);
      ctx.restore();
      // Front leg (offset to front side)
      ctx.save();
      ctx.translate(legOffsetX, hipY + jumpOffset);
      const ascendLegF = (gameData.current.jumpVelocity || 0) < 0;
      const fallingLegF = gameData.current.isJumping && !ascendLegF;
      ctx.rotate(gameData.current.isJumping ? (fallingLegF ? 0 : legSwing * (dir > 0 ? 0.8 : 1)) : legSwing);
      ctx.fillStyle = COLORS.WHITE;
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 2;
      ctx.fillRect(-legThick / 2, 0, legThick, legLen);
      ctx.strokeRect(-legThick / 2, 0, legThick, legLen);
      ctx.restore();
      } else {
        // Idle/standing: arms hang down, legs vertical under the body
        // Back arm (slightly behind)
        ctx.save();
        ctx.translate(-armThick * 0.4, shoulderY);
        ctx.fillStyle = COLORS.WHITE;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.fillRect(-armThick / 2, 0, armThick, armLen);
        ctx.strokeRect(-armThick / 2, 0, armThick, armLen);
        ctx.restore();
        // Front arm
        ctx.save();
        ctx.translate(armThick * 0.4, shoulderY);
        ctx.fillStyle = COLORS.WHITE;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.fillRect(-armThick / 2, 0, armThick, armLen);
        ctx.strokeRect(-armThick / 2, 0, armThick, armLen);
        ctx.restore();

        // Legs vertical under hips
        const legOffsetX = Math.max(3, bodyWidth * 0.25);
        // Back leg
        ctx.save();
        ctx.translate(-legOffsetX, hipY + jumpOffset);
        ctx.fillStyle = COLORS.WHITE;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.fillRect(-legThick / 2, 0, legThick, legLen);
        ctx.strokeRect(-legThick / 2, 0, legThick, legLen);
        ctx.restore();
        // Front leg
        ctx.save();
        ctx.translate(legOffsetX, hipY + jumpOffset);
        ctx.fillStyle = COLORS.WHITE;
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.fillRect(-legThick / 2, 0, legThick, legLen);
        ctx.strokeRect(-legThick / 2, 0, legThick, legLen);
        ctx.restore();
      }

      ctx.restore();
    }
    
    // Draw parachute if active AND in the air (not standing on ground)
    if (gameData.current.parachuteActive && !isDead && gameData.current.isJumping) {
      ctx.save();
      
      // Parachute position above player
      const parachuteX = x + PLAYER_WIDTH / 2;
      const parachuteY = y - 40;
      const parachuteWidth = 60;
      
      // Parachute canopy (inverted semi-circle - opening downward)
      ctx.fillStyle = '#ff0000'; // Red parachute
      ctx.beginPath();
      ctx.arc(parachuteX, parachuteY, parachuteWidth / 2, Math.PI, Math.PI * 2);
      ctx.fill();
      
      // Parachute outline
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(parachuteX, parachuteY, parachuteWidth / 2, Math.PI, Math.PI * 2);
      ctx.stroke();
      
      // Parachute lines connecting to player
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 1;
      const playerCenterX = x + PLAYER_WIDTH / 2;
      const playerTopY = y + 5;
      
      // Draw 4 suspension lines
      for (let i = 0; i < 4; i++) {
        const lineX = parachuteX - parachuteWidth / 2 + (i * parachuteWidth / 3);
        ctx.beginPath();
        ctx.moveTo(lineX, parachuteY);
        ctx.lineTo(playerCenterX, playerTopY);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    // Draw cricket bat (machine gun) if player has it
    if (gameData.current.hasMachineGun && !isDead) {
      ctx.save();
      
      const playerCenterX = x + PLAYER_WIDTH / 2;
      const playerCenterY = y + PLAYER_HEIGHT / 2;
      
      // Use cached aim angle from last firing calculation
      // Fallback: default to facing direction if no target
      let batAngle = gameData.current.gunAimAngle;
      if (batAngle === undefined) {
        const facingDir = gameData.current.facingDir || 1;
        batAngle = facingDir > 0 ? 0 : Math.PI;
      }
      
      ctx.translate(playerCenterX, playerCenterY);
      ctx.rotate(batAngle);
      
      // Cricket bat dimensions
      const batLength = 32;
      const batWidth = 8;
      const handleLength = 12;
      const handleWidth = 3;
      
      // Draw bat blade (wider part) - black
      ctx.fillStyle = '#1a1a1a'; // Very dark gray/black
      ctx.fillRect(8, -batWidth / 2, batLength, batWidth);
      
      // Draw bat edge highlight
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, -batWidth / 2, batLength, batWidth);
      
      // Draw handle (grip) - slightly lighter
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(8 - handleLength, -handleWidth / 2, handleLength, handleWidth);
      
      // Draw grip tape (red bands)
      ctx.fillStyle = '#cc0000';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(8 - handleLength + i * 3, -handleWidth / 2, 1, handleWidth);
      }
      
      // Draw sweet spot (hitting area) on bat face
      ctx.fillStyle = '#333333';
      ctx.fillRect(8 + batLength / 2 - 6, -batWidth / 4, 12, batWidth / 2);
      
      ctx.restore();
    }
    
    // Draw cowboy hat if player has it
    if (gameData.current.hasCowboyHat && !isDead) {
      ctx.save();
      
      // Hat position on player's head
      const hatX = x + PLAYER_WIDTH / 2;
      const hatY = y - 5; // Slightly above the head
      const hatSize = 18;
      
      // Hat brim (dark brown)
      ctx.fillStyle = '#654321';
      ctx.beginPath();
      ctx.ellipse(hatX, hatY + 8, hatSize / 1.3, hatSize / 5, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Hat crown (lighter brown)
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(hatX - 7, hatY - 8, 14, 12);
      
      // Hat crown top (rounded)
      ctx.beginPath();
      ctx.ellipse(hatX, hatY - 8, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Hat band (darker)
      ctx.fillStyle = '#654321';
      ctx.fillRect(hatX - 7, hatY + 1, 14, 2);
      
      // Hat band buckle (gold)
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(hatX - 1, hatY + 1, 2, 2);
      
      // Hat outline for better visibility
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(hatX, hatY + 8, hatSize / 1.3, hatSize / 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(hatX - 7, hatY - 8, 14, 12);
      
      ctx.restore();
    }
  };

  // Draw monsters on shaft walls
  const drawMonster = (ctx, x, y, type) => {
    const colors = [COLORS.GREEN, COLORS.PURPLE, COLORS.ORANGE, COLORS.RED];
    ctx.fillStyle = colors[type];
    
    // Monster body
    ctx.fillRect(x, y, 24, 32);
    
    // Eyes
    ctx.fillStyle = COLORS.RED;
    ctx.fillRect(x + 4, y + 6, 3, 3);
    ctx.fillRect(x + 17, y + 6, 3, 3);
    
    // Teeth
    ctx.fillStyle = COLORS.WHITE;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 4 + i * 4, y + 16, 2, 4);
    }
  };

  // Draw lift cable
  const drawLiftCable = (ctx) => {
    // Center the lift in the shaft
    const shaftX = CANVAS_WIDTH / 2 - SHAFT_WIDTH / 2;
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const liftY = gameData.current.liftY;
    
    // Cable connection point (top center of lift)
    const cableX = liftX + LIFT_WIDTH / 2;
    const cableStartY = liftY; // Top of the lift
    const cableEndY = 0; // Top of screen
    
    // Draw main cable line
    ctx.strokeStyle = COLORS.LIGHT_GRAY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cableX, cableEndY);
    ctx.lineTo(cableX, cableStartY);
    ctx.stroke();
    
    // Draw cable segments for more realistic appearance
    ctx.strokeStyle = COLORS.DARK_GRAY;
    ctx.lineWidth = 1;
    const segmentLength = 20;
    for (let y = cableEndY; y < cableStartY; y += segmentLength) {
      ctx.beginPath();
      ctx.moveTo(cableX - 1, y);
      ctx.lineTo(cableX + 1, y);
      ctx.stroke();
    }
    
    // Draw cable attachment point at top of screen
    ctx.fillStyle = COLORS.GRAY;
    ctx.fillRect(cableX - 4, 0, 8, 8);
    
    // Draw cable attachment point on lift
    ctx.fillStyle = COLORS.GRAY;
    ctx.fillRect(cableX - 3, liftY - 2, 6, 4);
  };

  // Calculate current floor based on lift position
  const calculateCurrentFloor = () => {
    // The lift starts above the screen (negative Y) at floor 30
    // When lift reaches bottom of screen, it should be at floor 0
    // Calculate floor based on how far the lift has traveled down
    const totalDistance = CANVAS_HEIGHT + LIFT_HEIGHT; // Total distance from start to bottom
    const currentDistance = gameData.current.liftY + LIFT_HEIGHT; // How far lift has traveled
    const floorProgress = Math.max(0, Math.min(1, currentDistance / totalDistance));
    const currentFloor = Math.max(0, Math.floor(30 - (floorProgress * 30)));
    return currentFloor;
  };

  // Draw digital floor display
  const drawFloorDisplay = (ctx, x, y, floor) => {
    // Display background (dark screen with slight glow)
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(x - 1, y - 1, 32, 14);
    
    // Display border with metallic look
    ctx.strokeStyle = COLORS.LIGHT_GRAY;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 1, y - 1, 32, 14);
    
    // Inner display area (darker)
    ctx.fillStyle = '#001100'; // Very dark green
    ctx.fillRect(x, y, 30, 12);
    
    // Floor number in bright green digital style
    ctx.fillStyle = '#00FF00'; // Bright green
    ctx.font = 'bold 10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(floor.toString().padStart(2, '0'), x + 15, y + 9);
    
    // Add slight glow effect
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 2;
    ctx.fillText(floor.toString().padStart(2, '0'), x + 15, y + 9);
    ctx.shadowBlur = 0; // Reset shadow
  };

  // Draw lift
  const drawLift = (ctx) => {
    // Center the lift in the shaft
    const shaftX = CANVAS_WIDTH / 2 - SHAFT_WIDTH / 2;
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const liftY = gameData.current.liftY;
    
    // Make lift brighter and more visible
    ctx.save();

    // Subtle outer glow for visibility
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 0.95;

    // Middle lift theme: WHITE
    // Floor
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(liftX, liftY + LIFT_HEIGHT - 10, LIFT_WIDTH, 10);

    // Walls
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(liftX, liftY, 10, LIFT_HEIGHT);
    ctx.fillRect(liftX + LIFT_WIDTH - 10, liftY, 10, LIFT_HEIGHT);

    // Ceiling
    ctx.fillRect(liftX, liftY, LIFT_WIDTH, 10);

    // Spikes hanging from ceiling (red, pointing down)
    {
      const interiorLeft = liftX + 10;
      const interiorRight = liftX + LIFT_WIDTH - 10;
      const spikeBaseY = liftY + 10; // bottom edge of ceiling
      const spikeWidth = 12;
      const spikeHeight = 12;
      for (let sx = interiorLeft + 2; sx < interiorRight - 2 - spikeWidth; sx += spikeWidth) {
        ctx.beginPath();
        ctx.moveTo(sx, spikeBaseY);
        ctx.lineTo(sx + spikeWidth / 2, spikeBaseY + spikeHeight);
        ctx.lineTo(sx + spikeWidth, spikeBaseY);
        ctx.closePath();
        ctx.fillStyle = COLORS.RED;
        ctx.fill();
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Turn off glow for crisp outlines and details
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Outline to pop against background
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 2;
    ctx.strokeRect(liftX + 0.5, liftY + 0.5, LIFT_WIDTH - 1, LIFT_HEIGHT - 1);

    // Lift details (rivets)
    ctx.fillStyle = COLORS.GRAY;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(liftX + 2, liftY + 20 + i * 20, 2, 2);
      ctx.fillRect(liftX + LIFT_WIDTH - 4, liftY + 20 + i * 20, 2, 2);
    }

    ctx.restore();
    
    // Digital floor display on top of lift
    const currentFloor = calculateCurrentFloor();
    drawFloorDisplay(ctx, liftX + LIFT_WIDTH/2 - 15, liftY - 15, currentFloor);
  };

  // Helper: get current ground playerY for given index
  const getGroundPlayerYByIndex = (idx) => {
    // Always compute the inside floor height for the target lift index.
    // Standing on top-of-lift caps is handled elsewhere via onTopOfLift logic.
    const ly = getLiftYByIndex(idx);
    return ly + LIFT_HEIGHT - 10 - PLAYER_HEIGHT - (FOOT_CLEARANCE + FLOOR_EXTRA_CLEARANCE);
  };

  const getLiftYByIndex = (idx) => {
    if (idx === -1) return gameData.current.leftLiftY;
    if (idx === 1) return gameData.current.rightLiftY;
    return gameData.current.liftY;
  };
  // Create gore effect - ALWAYS triggers when stickman dies (moved here to avoid TDZ)
  const createGoreEffect = () => {
    console.log('🩸 CREATING GORE EXPLOSION! Stickman is exploding with blood and body parts!');
    
    // Calculate ACTUAL player position at death (not always center shaft)
    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftXForPlayer = getShaftXByIndex(currentIdx);
    const liftCenterXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
    const playerX = liftCenterXForPlayer + gameData.current.playerX; // left edge of player
    const playerCenterX = playerX + PLAYER_WIDTH / 2;
    
    // Get current player Y position (use actual current position)
    let playerY = gameData.current.playerY;
    
    // Determine death environment for body-part physics (lift interior vs outside)
    const liftXForIdx = shaftXForPlayer + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const interiorLeft = liftXForIdx + 10;
    const interiorRight = liftXForIdx + LIFT_WIDTH - 10;
    const insideHoriz = (playerCenterX >= interiorLeft && playerCenterX <= interiorRight);
    if (insideHoriz && !gameData.current.onOutsidePlatform) {
      gameData.current.deathEnv = {
        type: 'lift',
        liftIndex: currentIdx,
        liftX: liftXForIdx,
        liftY: getLiftYByIndex(currentIdx)
      };
    } else {
      gameData.current.deathEnv = { type: 'outside' };
    }
    
    console.log('🩸 Gore explosion at actual position:', { playerX, playerY, shaftIndex: currentIdx, env: gameData.current.deathEnv });
    
    // Create body parts with MORE EXPLOSIVE velocities
    gameData.current.bodyParts = [
      // Head (larger round head) - flies off dramatically
      {
        x: playerX + PLAYER_WIDTH/2 - 10,
        y: playerY + 8,
        width: 20,
        height: 20,
        vx: (Math.random() - 0.5) * 4, // softer velocities
        vy: -Math.random() * 4 - 3, // reduced upward force
        color: '#ff0000',
        bloodTrail: []
      },
      // Body (straight torso) - splits apart
      {
        x: playerX + PLAYER_WIDTH/2 - 2,
        y: playerY + 18,
        width: 4,
        height: 35,
        vx: (Math.random() - 0.5) * 3, // softer
        vy: -Math.random() * 2 - 1,
        color: '#ff0000',
        bloodTrail: []
      },
      // Left arm (straight horizontal) - flies left violently
      {
        x: playerX + PLAYER_WIDTH/2 - 12,
        y: playerY + 28,
        width: 10,
        height: 4,
        vx: -Math.random() * 3 - 1.5, // toned down motion
        vy: -Math.random() * 2 - 0.5,
        color: '#ff0000',
        bloodTrail: []
      },
      // Right arm (straight horizontal) - flies right violently
      {
        x: playerX + PLAYER_WIDTH/2 + 2,
        y: playerY + 28,
        width: 10,
        height: 4,
        vx: Math.random() * 3 + 1.5, // toned down motion
        vy: -Math.random() * 2 - 0.5,
        color: '#ff0000',
        bloodTrail: []
      },
      // Left leg (straight leg) - separates violently
      {
        x: playerX + PLAYER_WIDTH/2 - 5,
        y: playerY + 53,
        width: 4,
        height: 22,
        vx: -Math.random() * 2 - 1, // softer separation
        vy: -Math.random() * 3 - 1,
        color: '#ff0000',
        bloodTrail: []
      },
      // Right leg (straight leg) - separates violently
      {
        x: playerX + PLAYER_WIDTH/2 + 1,
        y: playerY + 53,
        width: 4,
        height: 22,
        vx: Math.random() * 2 + 1, // softer separation
        vy: -Math.random() * 3 - 1,
        color: COLORS.WHITE,
        bloodTrail: []
      }
    ];
    
  // Create smaller blood effect
    for (let i = 0; i < 25; i++) {
      gameData.current.bloodSplatters.push({
        x: playerX + Math.random() * PLAYER_WIDTH * 2 - PLAYER_WIDTH/2,
        y: playerY + Math.random() * PLAYER_HEIGHT * 1.5 - PLAYER_HEIGHT/4,
        size: Math.random() * 2 + 1, // smaller drops (1-3 px)
        alpha: 0.8,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6
      });
    }
    
  // Shorter gore visibility
    gameData.current.deathEffectUntil = Date.now() + 800;
    
    console.log('🩸 GORE EXPLOSION COMPLETE! Created', gameData.current.bodyParts.length, 'body parts and', gameData.current.bloodSplatters.length, 'blood splatters');
  };
  // ====== UFO Spacecraft System (Level 3+) ======
  const spawnUFO = useCallback(() => {
    if (!gameData.current) return;
    
    // Only spawn UFOs on level 3 and above
    if (gameData.current.level < 3) return;
    
    // Level 7+ UFOs are double size with 3x longer beam
    const isLargeUFO = gameData.current.level >= 7;
    const sizeMultiplier = isLargeUFO ? 2 : 1;
    const beamMultiplier = isLargeUFO ? 3 : 1;
    
    // Spawn from either left or right side
    const fromLeft = Math.random() < 0.5;
    const spawnX = fromLeft ? -80 * sizeMultiplier : CANVAS_WIDTH + 80 * sizeMultiplier;
    const spawnY = 80 + Math.random() * 200; // Spawn in upper half
    
    const ufo = {
      x: spawnX,
      y: spawnY,
      vx: (fromLeft ? 1 : -1) * (1.5 + Math.random() * 1.5), // Speed varies
      vy: (Math.random() - 0.5) * 0.5, // Slight vertical movement
      wobble: Math.random() * Math.PI * 2, // For wobble animation
      width: 40 * sizeMultiplier,
      height: 20 * sizeMultiplier,
      sizeMultiplier: sizeMultiplier,
      beamMultiplier: beamMultiplier,
      directionChangeTimer: Math.floor(Math.random() * 60) + 30, // Random direction change every 30-90 frames
      suddenMoveTimer: Math.floor(Math.random() * 120) + 60 // Sudden jerky movement every 60-180 frames
    };
    
    if (!Array.isArray(gameData.current.ufos)) {
      gameData.current.ufos = [];
    }
    
    gameData.current.ufos.push(ufo);
    console.log(`UFO spawned at ${spawnX}, ${spawnY} - ${isLargeUFO ? 'LARGE (Level 7+)' : 'Normal'}`);
  }, []);

  const updateUFOs = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    if (!gameData.current || gameData.current.level < 3) return;
    
    if (!Array.isArray(gameData.current.ufos)) {
      gameData.current.ufos = [];
    }
    
    // Spawn timer - spawn UFOs frequently from level 3 onwards (every 5-10 seconds)
    gameData.current.ufoSpawnTimer = (gameData.current.ufoSpawnTimer || 0) + 1;
    
    // Initialize next spawn time if not set (5-10 seconds at 60fps)
    if (!gameData.current.ufoNextSpawnTime) {
      gameData.current.ufoNextSpawnTime = 300 + Math.random() * 300; // 5-10 seconds
    }
    
    // Check if it's time to spawn a UFO (up to 3 UFOs allowed at a time)
    if (gameData.current.ufoSpawnTimer > gameData.current.ufoNextSpawnTime && gameData.current.ufos.length < 3) {
      gameData.current.ufoSpawnTimer = 0;
      gameData.current.ufoNextSpawnTime = 300 + Math.random() * 300; // Next spawn in 5-10 seconds
      spawnUFO();
      console.log('UFO spawned! Next UFO in 5-10 seconds (max 3 at once)');
    }
    
    // Update UFO positions with sporadic movement
    gameData.current.ufos.forEach(ufo => {
      if (!ufo) return;
      
      // Initialize timers if not set (for old UFOs)
      if (ufo.directionChangeTimer === undefined) {
        ufo.directionChangeTimer = Math.floor(Math.random() * 60) + 30;
      }
      if (ufo.suddenMoveTimer === undefined) {
        ufo.suddenMoveTimer = Math.floor(Math.random() * 120) + 60;
      }
      
      // Countdown timers
      ufo.directionChangeTimer--;
      ufo.suddenMoveTimer--;
      
      // Random direction changes
      if (ufo.directionChangeTimer <= 0) {
        // Sporadic direction change
        ufo.vx += (Math.random() - 0.5) * 2; // Random horizontal acceleration
        ufo.vy += (Math.random() - 0.5) * 1.5; // Random vertical acceleration
        
        // Clamp speeds to reasonable limits
        ufo.vx = Math.max(-4, Math.min(4, ufo.vx));
        ufo.vy = Math.max(-3, Math.min(3, ufo.vy));
        
        // Reset timer for next change
        ufo.directionChangeTimer = Math.floor(Math.random() * 60) + 30;
      }
      
      // Sudden jerky movements (sporadic behavior)
      if (ufo.suddenMoveTimer <= 0) {
        // Sudden burst of speed or direction change
        const burstDirection = Math.random() * Math.PI * 2;
        const burstSpeed = 5 + Math.random() * 5;
        ufo.vx = Math.cos(burstDirection) * burstSpeed;
        ufo.vy = Math.sin(burstDirection) * burstSpeed * 0.5;
        
        // Reset timer for next sudden move
        ufo.suddenMoveTimer = Math.floor(Math.random() * 120) + 60;
      }
      
      // Apply velocity with dampening (so UFO gradually slows down between bursts)
      ufo.vx *= 0.98;
      ufo.vy *= 0.98;
      
      ufo.x += ufo.vx;
      ufo.y += ufo.vy;
      ufo.wobble += 0.1; // Animation wobble
      
      // Reverse vertical direction at boundaries with some randomness
      if (ufo.y < 60) {
        ufo.vy = Math.abs(ufo.vy) * (0.8 + Math.random() * 0.4);
      } else if (ufo.y > 300) {
        ufo.vy = -Math.abs(ufo.vy) * (0.8 + Math.random() * 0.4);
      }
    });
    
    // Check collision with player
    const playerBounds = {
      x: gameData.current.playerX - PLAYER_WIDTH / 2,
      y: gameData.current.playerY - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT
    };
    
    // Check if player is currently in a death state or invincible - prevent deaths
    const now = Date.now();
    const isInDeathState = now < (gameData.current.deathEffectUntil || 0);
    const isInvincible = gameData.current.invincible && now < (gameData.current.invincibleUntil || 0);
    
    if (!isInDeathState && !isInvincible) {
      gameData.current.ufos.forEach(ufo => {
        if (!ufo) return;
        
        // Define beam cone dimensions (scaled by multipliers for level 7+)
        const beamMult = ufo.beamMultiplier || 1;
        const sizeMult = ufo.sizeMultiplier || 1;
        const beamTopY = ufo.y + 10 * sizeMult; // Start from bottom of UFO
        const beamBottomY = ufo.y + 10 * sizeMult + (LIFT_HEIGHT * beamMult); // Beam scaled by multiplier
        const beamTopWidth = 15 * sizeMult; // Narrow at top (scaled)
        const beamBottomWidth = 50 * sizeMult; // Wide at bottom (scaled)
        
        // Check if player is within the beam cone
        // Calculate beam width at player's Y position
        const beamHeight = beamBottomY - beamTopY;
        if (beamHeight > 0) {
          // Check if player's vertical span overlaps with beam
          const playerTop = playerBounds.y;
          const playerBottom = playerBounds.y + playerBounds.height;
          
          // Player must be within vertical range of beam
          if (playerBottom >= beamTopY && playerTop <= beamBottomY) {
            // Check horizontal overlap at multiple Y positions along the player's height
            // This ensures ANY part of the player touching the beam triggers death
            const playerLeft = playerBounds.x;
            const playerRight = playerBounds.x + playerBounds.width;
            
            let hitBeam = false;
            
            // Sample 5 points along the player's height to check for beam intersection
            for (let i = 0; i <= 4; i++) {
              const sampleY = playerTop + (playerBottom - playerTop) * (i / 4);
              
              // Only check if this Y is within the beam's vertical range
              if (sampleY >= beamTopY && sampleY <= beamBottomY) {
                const relativeY = sampleY - beamTopY;
                const beamWidthAtY = beamTopWidth + (beamBottomWidth - beamTopWidth) * (relativeY / beamHeight);
                
                const beamLeft = ufo.x - beamWidthAtY / 2;
                const beamRight = ufo.x + beamWidthAtY / 2;
                
                // Check if player's horizontal span overlaps with beam at this Y
                if (playerRight > beamLeft && playerLeft < beamRight) {
                  hitBeam = true;
                  break;
                }
              }
            }
            
            if (hitBeam) {
              // Player hit by UFO beam!
              console.log('Player caught in UFO beam!');
              playSound('death');
              playSplatSound();
              createGoreEffect();
              gameData.current.lives--;
              gameData.current.deathEffectUntil = now + 2000; // Prevent multiple deaths for 2 seconds
              
              if (gameData.current.lives <= 0) {
                setGameState(GAME_STATES.DEAD);
              } else {
                resetLevelAfterDeath();
              }
            }
          }
        }
      });
    }
    
    // Check if UFO beam hits any medpacks and destroy them
    if (gameData.current.medpacks && gameData.current.medpacks.length > 0) {
      gameData.current.ufos.forEach(ufo => {
        if (!ufo) return;
        
        // Use scaled beam dimensions
        const beamMult = ufo.beamMultiplier || 1;
        const sizeMult = ufo.sizeMultiplier || 1;
        const beamTopY = ufo.y + 10 * sizeMult;
        const beamBottomY = ufo.y + 10 * sizeMult + (LIFT_HEIGHT * beamMult);
        const beamTopWidth = 15 * sizeMult;
        const beamBottomWidth = 50 * sizeMult;
        const beamHeight = beamBottomY - beamTopY;
        
        gameData.current.medpacks.forEach(pack => {
          if (!pack || pack.collected) return;
          
          // Check if medpack is within beam cone
          const medpackCenterY = pack.y + 35; // Medpack center (balloon + box)
          const medpackCenterX = pack.x;
          
          if (beamHeight > 0 && medpackCenterY > beamTopY && medpackCenterY < beamBottomY) {
            const relativeY = medpackCenterY - beamTopY;
            const beamWidthAtMedpack = beamTopWidth + (beamBottomWidth - beamTopWidth) * (relativeY / beamHeight);
            
            const beamLeft = ufo.x - beamWidthAtMedpack / 2;
            const beamRight = ufo.x + beamWidthAtMedpack / 2;
            
            // Check if medpack is within beam
            if (medpackCenterX > beamLeft && medpackCenterX < beamRight) {
              // Medpack destroyed by UFO beam!
              pack.collected = true;
              playPopSound(); // Play pop sound when medpack is destroyed
              console.log('Medpack destroyed by UFO beam!');
            }
          }
        });
      });
    }
    
    // Remove UFOs that are off screen (check both horizontal and vertical bounds)
    // Use larger buffer to ensure UFOs are truly off screen before removal
    const previousUfoCount = gameData.current.ufos.length;
    const removalBuffer = 200; // Increased buffer for UFO removal
    gameData.current.ufos = gameData.current.ufos.filter(ufo => {
      if (!ufo) return false;
      
      const isOnScreen = ufo.x > -removalBuffer && 
                        ufo.x < CANVAS_WIDTH + removalBuffer &&
                        ufo.y > -removalBuffer && 
                        ufo.y < CANVAS_HEIGHT + removalBuffer;
      
      if (!isOnScreen) {
        console.log(`Removing UFO at position (${ufo.x.toFixed(1)}, ${ufo.y.toFixed(1)}) - off screen`);
      }
      
      return isOnScreen;
    });
    
    if (previousUfoCount > gameData.current.ufos.length) {
      console.log(`Removed ${previousUfoCount - gameData.current.ufos.length} UFO(s) that went off screen. Remaining: ${gameData.current.ufos.length}`);
    }
    
    // Play/stop UFO sound based on presence of UFOs on screen
    // Add extra check to ensure sound management is reliable
    if (ufoSoundRef.current) {
      const hasVisibleUFOs = Array.isArray(gameData.current.ufos) && gameData.current.ufos.some(ufo => {
        if (!ufo) return false;
        const { x, y } = ufo;
        return Number.isFinite(x) && Number.isFinite(y) && x > -40 && x < CANVAS_WIDTH + 40 && y > 0 && y < CANVAS_HEIGHT + 40;
      });
      const shouldPlaySound = hasVisibleUFOs && soundEnabled && gameState === GAME_STATES.PLAYING;
      const isCurrentlyPlaying = !ufoSoundRef.current.paused;

      if (shouldPlaySound && !isCurrentlyPlaying) {
        // UFOs present on screen - play sound if not already playing
        try {
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
          ufoSoundRef.current.play().then(() => {
            console.log('UFO sound started playing');
          }).catch(err => {
            console.error('Failed to play UFO sound:', err);
          });
        } catch (error) {
          console.error('Error playing UFO sound:', error);
        }
      } else if (!shouldPlaySound && isCurrentlyPlaying) {
        // No UFOs on screen or sound disabled - stop sound if playing
        ufoSoundRef.current.pause();
        ufoSoundRef.current.currentTime = 0;
        console.log('UFO sound stopped - no UFOs on screen or sound disabled');
      }
    }
  }, [gameState, spawnUFO, playSound, playSplatSound, resetLevelAfterDeath, soundEnabled, playPopSound]);

  const drawUFOs = useCallback((ctx) => {
    if (!gameData.current || gameData.current.level < 3) return;
    
    const ufos = gameData.current.ufos;
    if (!ufos || ufos.length === 0) return;
    
    ctx.save();
    
    ufos.forEach(ufo => {
      if (!ufo) return;
      
      const x = ufo.x;
      const sizeMult = ufo.sizeMultiplier || 1;
      const beamMult = ufo.beamMultiplier || 1;
      const y = ufo.y + Math.sin(ufo.wobble) * 3 * sizeMult; // Wobble effect (scaled)
      
      // Draw yellow cone beam FIRST (behind UFO) - scaled by multipliers
      const beamTopY = y + 10 * sizeMult;
      const beamBottomY = y + 10 * sizeMult + (LIFT_HEIGHT * beamMult); // Beam scaled by multiplier
      const beamTopWidth = 15 * sizeMult;
      const beamBottomWidth = 50 * sizeMult;
      
      // Pulsing effect for beam
      const pulseIntensity = 0.3 + Math.sin(ufo.wobble * 2) * 0.15;
      
      // Outer glow (wider, more transparent)
      const outerGradient = ctx.createLinearGradient(x, beamTopY, x, beamBottomY);
      outerGradient.addColorStop(0, `rgba(255, 255, 0, ${pulseIntensity * 0.3})`);
      outerGradient.addColorStop(1, `rgba(255, 255, 0, ${pulseIntensity * 0.1})`);
      
      ctx.fillStyle = outerGradient;
      ctx.beginPath();
      ctx.moveTo(x, beamTopY);
      ctx.lineTo(x - beamBottomWidth / 2 - 10, beamBottomY);
      ctx.lineTo(x + beamBottomWidth / 2 + 10, beamBottomY);
      ctx.closePath();
      ctx.fill();
      
      // Main beam (bright yellow cone)
      const beamGradient = ctx.createLinearGradient(x, beamTopY, x, beamBottomY);
      beamGradient.addColorStop(0, `rgba(255, 255, 100, ${pulseIntensity})`);
      beamGradient.addColorStop(1, `rgba(255, 255, 0, ${pulseIntensity * 0.4})`);
      
      ctx.fillStyle = beamGradient;
      ctx.beginPath();
      ctx.moveTo(x - beamTopWidth / 2, beamTopY);
      ctx.lineTo(x - beamBottomWidth / 2, beamBottomY);
      ctx.lineTo(x + beamBottomWidth / 2, beamBottomY);
      ctx.lineTo(x + beamTopWidth / 2, beamTopY);
      ctx.closePath();
      ctx.fill();
      
      // Bright center beam (concentrated light)
      const centerGradient = ctx.createLinearGradient(x, beamTopY, x, beamBottomY);
      centerGradient.addColorStop(0, `rgba(255, 255, 200, ${pulseIntensity * 0.8})`);
      centerGradient.addColorStop(1, `rgba(255, 255, 150, ${pulseIntensity * 0.3})`);
      
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.moveTo(x - beamTopWidth / 4, beamTopY);
      ctx.lineTo(x - beamBottomWidth / 4, beamBottomY);
      ctx.lineTo(x + beamBottomWidth / 4, beamBottomY);
      ctx.lineTo(x + beamTopWidth / 4, beamTopY);
      ctx.closePath();
      ctx.fill();
      
      // Draw UFO saucer (on top of beam) - scaled by size multiplier
      // Bottom dome (darker)
      ctx.fillStyle = '#444444';
      ctx.beginPath();
      ctx.ellipse(x, y + 5 * sizeMult, 18 * sizeMult, 8 * sizeMult, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Main body (silver/metallic)
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.ellipse(x, y, 20 * sizeMult, 6 * sizeMult, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Top dome (cockpit)
      ctx.fillStyle = '#666666';
      ctx.beginPath();
      ctx.ellipse(x, y - 6 * sizeMult, 10 * sizeMult, 8 * sizeMult, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Cockpit window (glowing)
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.ellipse(x, y - 6 * sizeMult, 6 * sizeMult, 5 * sizeMult, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Highlight on top
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x - 3 * sizeMult, y - 8 * sizeMult, 3 * sizeMult, 2 * sizeMult, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Edge lights (blinking)
      const blink = Math.floor(ufo.wobble * 2) % 2;
      if (blink) {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(x - 18 * sizeMult, y, 2 * sizeMult, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 18 * sizeMult, y, 2 * sizeMult, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    ctx.restore();
  }, []);

  // Draw medical packs with balloons
  const drawMedpacks = useCallback((ctx) => {
    const medpacks = gameData.current.medpacks;
    if (!medpacks || medpacks.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    medpacks.forEach(pack => {
      if (!pack || pack.collected) return;
      const x = pack.x;
      const y = pack.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // Draw balloon string
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 35);
      ctx.lineTo(x, y - 10);
      ctx.stroke();

      // Draw green balloon
      ctx.fillStyle = '#33ff33';
      ctx.beginPath();
      ctx.ellipse(x, y - 55, 15, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Balloon highlight
      ctx.fillStyle = '#66ff66';
      ctx.beginPath();
      ctx.ellipse(x - 5, y - 60, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Balloon knot
      ctx.fillStyle = '#00cc00';
      ctx.beginPath();
      ctx.ellipse(x, y - 37, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw medical pack box (white with red cross)
      const boxWidth = 20;
      const boxHeight = 16;
      
      // White box
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
      
      // Box border
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
      
      // Red cross
      ctx.fillStyle = '#ff0000';
      // Vertical bar
      ctx.fillRect(x - 2, y - 8, 4, 16);
      // Horizontal bar
      ctx.fillRect(x - 8, y - 2, 16, 4);
    });

    ctx.restore();
  }, []);

  // Draw dynamite balloons
  const drawDynamiteBalloons = useCallback((ctx) => {
    const dynamiteBalloons = gameData.current.dynamiteBalloons;
    if (!dynamiteBalloons || dynamiteBalloons.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    dynamiteBalloons.forEach(balloon => {
      if (!balloon || balloon.exploded) return;
      const x = balloon.x;
      const y = balloon.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // Draw balloon string
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 35);
      ctx.lineTo(x, y - 10);
      ctx.stroke();

      // Draw black balloon
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.ellipse(x, y - 55, 15, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Balloon highlight (dark gray)
      ctx.fillStyle = '#333333';
      ctx.beginPath();
      ctx.ellipse(x - 5, y - 60, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Balloon knot
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(x, y - 37, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw dynamite stick (red with black fuse)
      const dynamiteWidth = 16;
      const dynamiteHeight = 24;
      
      // Red dynamite body
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(x - dynamiteWidth / 2, y - dynamiteHeight / 2, dynamiteWidth, dynamiteHeight);
      
      // Dynamite border
      ctx.strokeStyle = '#880000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - dynamiteWidth / 2, y - dynamiteHeight / 2, dynamiteWidth, dynamiteHeight);
      
      // Yellow warning stripes
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x - dynamiteWidth / 2, y - 8, dynamiteWidth, 3);
      ctx.fillRect(x - dynamiteWidth / 2, y + 2, dynamiteWidth, 3);
      
      // Black fuse coming out the top
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - dynamiteHeight / 2);
      ctx.lineTo(x + 4, y - dynamiteHeight / 2 - 8);
      ctx.stroke();
      
      // Spark at fuse tip
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.arc(x + 4, y - dynamiteHeight / 2 - 8, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }, []);

  // Draw machine gun drops
  const drawMachineGunDrops = useCallback((ctx) => {
    const drops = gameData.current.machineGunDrops;
    if (!drops || drops.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    drops.forEach(drop => {
      if (!drop || drop.collected) return;
      const x = drop.x;
      const y = drop.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // Draw pink balloon above the machine gun
      const balloonY = y - 35;
      
      // Balloon string
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 16);
      ctx.lineTo(x, balloonY + 20);
      ctx.stroke();
      
      // Pink balloon
      ctx.fillStyle = '#ff69b4'; // Hot pink color
      ctx.beginPath();
      ctx.ellipse(x, balloonY, 12, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Balloon highlight
      ctx.fillStyle = 'rgba(255, 192, 203, 0.6)'; // Light pink highlight
      ctx.beginPath();
      ctx.ellipse(x - 4, balloonY - 5, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Balloon knot at bottom
      ctx.fillStyle = '#d14a8c'; // Darker pink for knot
      ctx.beginPath();
      ctx.arc(x, balloonY + 15, 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw machine gun icon (simplified rifle shape)
      // Gun body
      ctx.fillStyle = '#333333';
      ctx.fillRect(x - 15, y - 4, 30, 8);
      
      // Gun handle
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x - 8, y + 4, 8, 12);
      
      // Gun barrel
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x + 15, y - 2, 12, 4);
      
      // Trigger guard
      ctx.strokeStyle = '#555555';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x - 4, y + 8, 4, 0, Math.PI);
      ctx.stroke();
      
      // Orange glow/highlight (to make it stand out)
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 18, y - 7, 36, 24);
    });

    ctx.restore();
  }, []);

  // Draw bullets
  const drawBullets = useCallback((ctx) => {
    const bullets = gameData.current.bullets;
    if (!bullets || bullets.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    bullets.forEach(bullet => {
      if (!bullet || bullet.hit) return;
      const x = bullet.x;
      const y = bullet.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // Draw bullet as small black circle with yellow trail
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(x - bullet.vx * 0.5, y - bullet.vy * 0.5, 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // White center dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }, []);

  // Update medical packs (falling animation)
  const updateMedpacks = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const medpacks = gameData.current.medpacks;
    if (!medpacks) return;

    // Update positions with wind drift
    medpacks.forEach(pack => {
      if (!pack || pack.collected) return;
      
      // Initialize drift properties if not set (for old medpacks before wind was added)
      if (pack.vx === undefined) {
        pack.vx = (Math.random() - 0.5) * 2; // Initial horizontal drift -1 to +1
        pack.driftTimer = Math.floor(Math.random() * 60) + 30;
      }
      
      // Use individual random speed for each balloon (balloon effect)
      const speed = pack.speed || 2.4; // Fallback to 2.4 if speed not set (3x speed)
      pack.y += speed;
      
      // Apply horizontal wind drift
      pack.x += pack.vx;
      
      // Keep balloon on screen (bounce off edges with reduced velocity)
      if (pack.x < 60) {
        pack.x = 60;
        pack.vx = Math.abs(pack.vx) * 0.8; // Reverse to drift right, lose some energy
      } else if (pack.x > CANVAS_WIDTH - 60) {
        pack.x = CANVAS_WIDTH - 60;
        pack.vx = -Math.abs(pack.vx) * 0.8; // Reverse to drift left, lose some energy
      }
      
      // Randomly change drift direction (simulate wind gusts)
      pack.driftTimer--;
      if (pack.driftTimer <= 0) {
        // Strong wind gust - change drift direction and speed
        pack.vx = (Math.random() - 0.5) * 2.5; // New drift velocity -1.25 to +1.25
        pack.driftTimer = Math.floor(Math.random() * 90) + 20; // Next change in 20-110 frames
      }
    });

    // Remove medpacks that went off screen
    gameData.current.medpacks = medpacks.filter(pack => 
      !pack.collected && pack.y < CANVAS_HEIGHT + 100
    );

    // Spawn timer - only spawn if no medpacks exist (limit to 1 at a time)
    if (gameData.current.medpackSpawnTimer > 0) {
      gameData.current.medpackSpawnTimer--;
    } else {
      // Only spawn if no medpacks are currently on screen
      if (gameData.current.medpacks.length === 0) {
        // Spawn new medpack (every 600-900 frames, about 10-15 seconds at 60fps)
        const spawnInterval = 600 + Math.random() * 300;
        gameData.current.medpackSpawnTimer = spawnInterval;
        
        // Spawn at random x position
        const spawnX = 80 + Math.random() * (CANVAS_WIDTH - 160);
        // Randomize falling speed between 1.2 and 3.6 (3x speed - slower to faster than original)
        const fallSpeed = 1.2 + Math.random() * 2.4;
        // Initialize wind drift properties
        const initialDrift = (Math.random() - 0.5) * 2; // Random drift -1 to +1
        gameData.current.medpacks.push({
          x: spawnX,
          y: -70, // Start above screen
          collected: false,
          speed: fallSpeed,
          vx: initialDrift, // Horizontal wind velocity
          driftTimer: Math.floor(Math.random() * 60) + 30 // Change wind every 30-90 frames
        });
      } else {
        // Medpack already exists, reset timer
        const spawnInterval = 600 + Math.random() * 300;
        gameData.current.medpackSpawnTimer = spawnInterval;
      }
    }
    
    // Play/stop medic sound based on presence of medpacks
    if (medicSoundRef.current) {
      const hasActiveMedpacks = gameData.current.medpacks.some(pack => !pack.collected);
      if (hasActiveMedpacks && soundEnabled) {
        // Medpack present - play sound if not already playing
        if (medicSoundRef.current.paused) {
          try {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume();
            }
            medicSoundRef.current.play().then(() => {
              console.log('Medic sound playing');
            }).catch(err => {
              console.error('Failed to play medic sound:', err);
            });
          } catch (error) {
            console.error('Error playing medic sound:', error);
          }
        }
      } else {
        // No medpacks - stop sound if playing
        if (!medicSoundRef.current.paused) {
          medicSoundRef.current.pause();
          medicSoundRef.current.currentTime = 0;
        }
      }
    }
  }, [gameState, soundEnabled]);
  // Check medpack collision with player
  const checkMedpackCollision = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const medpacks = gameData.current.medpacks;
    if (!medpacks || medpacks.length === 0) return;

    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftX = getShaftXByIndex(currentIdx);
    const playerAbsX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
    const playerAbsY = gameData.current.playerY;

    medpacks.forEach(pack => {
      if (pack.collected) return;

      // Check collision (generous hitbox)
      const dx = Math.abs((playerAbsX + PLAYER_WIDTH / 2) - pack.x);
      const dy = Math.abs((playerAbsY + PLAYER_HEIGHT / 2) - pack.y);

      if (dx < 20 && dy < 25) {
        // Collected!
        pack.collected = true;
        gameData.current.lives++;
        
        // Play ting sound for collection
        playTingSound();
        
        console.log('Medical pack collected! Lives:', gameData.current.lives);
        
        // Create pop effect (small particles)
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          const speed = 2 + Math.random() * 2;
          gameData.current.bloodSplatters.push({
            x: pack.x,
            y: pack.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 2,
            alpha: 0.8,
            color: '#ff3333' // Red balloon color for pop effect
          });
        }
      }
    });
  }, [gameState, playTingSound]);

  // Update mushrooms (invincibility power-up, level 3+)
  const updateMushrooms = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    if (!gameData.current || gameData.current.level < 3) return; // Only spawn on level 3+
    
    // Update existing mushrooms (make them fall)
    gameData.current.mushrooms.forEach(mushroom => {
      if (!mushroom || mushroom.collected) return;
      mushroom.y += 2; // Fall speed
    });
    
    // Remove mushrooms that fell off screen
    gameData.current.mushrooms = gameData.current.mushrooms.filter(
      mushroom => mushroom.y < CANVAS_HEIGHT + 100
    );
    
    // Spawn timer - spawn mushrooms less frequently than medpacks (every 30-45 seconds)
    if (gameData.current.mushroomSpawnTimer > 0) {
      gameData.current.mushroomSpawnTimer--;
    } else {
      // Only spawn if no mushrooms are currently on screen (limit to 1 at a time)
      if (gameData.current.mushrooms.length === 0) {
        const spawnInterval = 1800 + Math.random() * 900; // 30-45 seconds at 60fps
        gameData.current.mushroomSpawnTimer = spawnInterval;
        
        // Spawn at random x position
        const spawnX = 80 + Math.random() * (CANVAS_WIDTH - 160);
        gameData.current.mushrooms.push({
          x: spawnX,
          y: -80,
          collected: false
        });
        
        console.log('Mushroom spawned at x =', spawnX);
      } else {
        // Mushroom already exists, reset timer
        const spawnInterval = 1800 + Math.random() * 900;
        gameData.current.mushroomSpawnTimer = spawnInterval;
      }
    }
    
    // Update invincibility state
    if (gameData.current.invincible) {
      const now = Date.now();
      if (now >= gameData.current.invincibleUntil) {
        gameData.current.invincible = false;
        console.log('Invincibility ended!');
      }
    }
  }, [gameState]);

  // Draw mushrooms with balloon
  const drawMushrooms = useCallback((ctx) => {
    const mushrooms = gameData.current.mushrooms;
    if (!mushrooms || mushrooms.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    mushrooms.forEach(mushroom => {
      if (!mushroom || mushroom.collected) return;
      const x = mushroom.x;
      const y = mushroom.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // Draw balloon string
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 35);
      ctx.lineTo(x, y - 10);
      ctx.stroke();

      // Draw red balloon (matching mushroom cap)
      ctx.fillStyle = '#dd0000';
      ctx.beginPath();
      ctx.ellipse(x, y - 55, 15, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // White dots on balloon (matching mushroom spots)
      ctx.fillStyle = '#ffffff';
      const balloonSpots = [
        { dx: -6, dy: -58, size: 3 },
        { dx: 3, dy: -62, size: 2.5 },
        { dx: -3, dy: -52, size: 2 },
        { dx: 6, dy: -56, size: 2.5 },
        { dx: 0, dy: -48, size: 2 }
      ];
      balloonSpots.forEach(spot => {
        ctx.beginPath();
        ctx.arc(x + spot.dx, y + spot.dy, spot.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Balloon knot
      ctx.fillStyle = '#aa0000';
      ctx.beginPath();
      ctx.ellipse(x, y - 37, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw mushroom (red cap with white spots)
      const mushroomSize = 18;
      
      // Mushroom stem (white)
      ctx.fillStyle = '#eeeeee';
      ctx.fillRect(x - 4, y - 6, 8, 12);
      
      // Stem shadow
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(x + 2, y - 6, 2, 12);
      
      // Mushroom cap (red)
      ctx.fillStyle = '#dd0000';
      ctx.beginPath();
      ctx.ellipse(x, y - 8, mushroomSize / 2, mushroomSize / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // White spots on cap
      ctx.fillStyle = '#ffffff';
      const spots = [
        { dx: -5, dy: -10, size: 3 },
        { dx: 2, dy: -12, size: 2.5 },
        { dx: -2, dy: -7, size: 2 },
        { dx: 5, dy: -9, size: 2.5 }
      ];
      spots.forEach(spot => {
        ctx.beginPath();
        ctx.arc(x + spot.dx, y + spot.dy, spot.size, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    ctx.restore();
  }, []);

  // Update meteors (falling from space with fire trail)
  const updateMeteors = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    if (!gameData.current) return;
    
    // Only spawn meteors after level 4 (level 5+)
    if (gameData.current.level < 5) {
      // Clear any existing meteors if level is too low
      if (gameData.current.meteors && gameData.current.meteors.length > 0) {
        gameData.current.meteors = [];
      }
      return;
    }
    
    const meteors = gameData.current.meteors || [];
    
    // Update existing meteors
    meteors.forEach(meteor => {
      if (!meteor) return;
      
      // Apply velocity
      meteor.y += meteor.vy;
      meteor.x += meteor.vx;
      
      // Update trail
      if (!meteor.trail) meteor.trail = [];
      
      // Add current position to trail
      meteor.trail.unshift({ x: meteor.x, y: meteor.y, alpha: 1.0 });
      
      // Keep trail length manageable and fade out
      meteor.trail = meteor.trail.slice(0, 15);
      meteor.trail.forEach((point, i) => {
        point.alpha = 1.0 - (i / 15);
      });
      
      // Increase speed as it falls (gravity effect)
      meteor.vy += 0.3;
    });
    
    // Remove meteors that went off screen
    gameData.current.meteors = meteors.filter(meteor => 
      meteor.y < CANVAS_HEIGHT + 50 && meteor.x > -50 && meteor.x < CANVAS_WIDTH + 50
    );
    
    // Spawn timer - spawn meteors occasionally (every 20-35 seconds)
    if (gameData.current.meteorSpawnTimer > 0) {
      gameData.current.meteorSpawnTimer--;
    } else {
      // Spawn new meteor (occasional use)
      const spawnInterval = 1200 + Math.random() * 900; // 20-35 seconds at 60fps
      gameData.current.meteorSpawnTimer = spawnInterval;
      
      // Spawn above screen at random x position
      const spawnX = 50 + Math.random() * (CANVAS_WIDTH - 100);
      const size = 8 + Math.random() * 8; // Random size 8-16
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8; // Mostly downward with some angle variance
      const speed = 6 + Math.random() * 4; // Initial speed 6-10
      
      gameData.current.meteors.push({
        x: spawnX,
        y: -30,
        vx: Math.cos(angle) * speed * 0.3, // Some horizontal movement
        vy: Math.abs(Math.sin(angle)) * speed, // Mostly downward
        size: size,
        trail: [],
        rotation: Math.random() * Math.PI * 2, // Random initial rotation
        rotationSpeed: (Math.random() - 0.5) * 0.3 // Rotation speed
      });
      
      console.log('🌠 Meteor spawned at x =', spawnX, 'size =', size);
    }
    
    // Always play meteor sound when meteors are on screen
    if (meteorSoundRef.current) {
      const hasVisibleMeteors = Array.isArray(gameData.current.meteors) && gameData.current.meteors.some(meteor => {
        if (!meteor) return false;
        const { x, y } = meteor;
        return Number.isFinite(x) && Number.isFinite(y) && x > -40 && x < CANVAS_WIDTH + 40 && y > -60 && y < CANVAS_HEIGHT + 40;
      });
      const isCurrentlyPlaying = !meteorSoundRef.current.paused;
      const shouldPlaySound = hasVisibleMeteors && soundEnabled && gameState === GAME_STATES.PLAYING;

      if (shouldPlaySound) {
        // Meteors present - ensure sound is playing
        if (!isCurrentlyPlaying) {
          try {
            // Resume audio context if suspended
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
              audioContextRef.current.resume();
            }
            
            // Reset volume to ensure it's audible
            meteorSoundRef.current.volume = 0.6;
            
            // Play the sound
            meteorSoundRef.current.play().then(() => {
              console.log('🌠 Meteor sound playing');
            }).catch(err => {
              console.error('Failed to play meteor sound:', err);
              // Try to reload and play again
              meteorSoundRef.current.load();
              setTimeout(() => {
                if (meteorSoundRef.current && gameData.current.meteors && gameData.current.meteors.length > 0) {
                  meteorSoundRef.current.play().catch(e => console.error('Retry failed:', e));
                }
              }, 100);
            });
          } catch (error) {
            console.error('Error playing meteor sound:', error);
          }
        } else {
          // Sound is playing - ensure volume is correct
          if (meteorSoundRef.current.volume !== 0.6) {
            meteorSoundRef.current.volume = 0.6;
          }
        }
      } else if (!shouldPlaySound && isCurrentlyPlaying) {
        // No meteors on screen or sound disabled - stop sound if playing
        meteorSoundRef.current.pause();
        meteorSoundRef.current.currentTime = 0;
        console.log('🌠 Meteor sound stopped - no meteors on screen or sound disabled');
      }
    }
  }, [gameState, soundEnabled]);

  // Draw meteors with fire trail
  const drawMeteors = useCallback((ctx) => {
    const meteors = gameData.current.meteors;
    if (!meteors || meteors.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    meteors.forEach(meteor => {
      if (!meteor) return;
      const x = meteor.x;
      const y = meteor.y;
      const size = meteor.size || 12;
      
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // Draw fire trail
      if (meteor.trail && meteor.trail.length > 0) {
        meteor.trail.forEach((point, i) => {
          if (i === 0) return; // Skip the first point (it's the meteor itself)
          
          const trailSize = size * (1 - i / meteor.trail.length) * 1.5;
          const alpha = point.alpha * 0.8;
          
          // Outer orange glow
          const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, trailSize * 1.5);
          gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha * 0.6})`);
          gradient.addColorStop(0.5, `rgba(255, 50, 0, ${alpha * 0.3})`);
          gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(point.x, point.y, trailSize * 1.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Inner yellow-white hot core
          const coreGradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, trailSize);
          coreGradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
          coreGradient.addColorStop(0.4, `rgba(255, 200, 0, ${alpha * 0.8})`);
          coreGradient.addColorStop(1, `rgba(255, 100, 0, 0)`);
          
          ctx.fillStyle = coreGradient;
          ctx.beginPath();
          ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      
      // Draw meteor rock with rotation
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(meteor.rotation || 0);
      
      // Outer glow (orange/red)
      const glowGradient = ctx.createRadialGradient(0, 0, size * 0.5, 0, 0, size * 2);
      glowGradient.addColorStop(0, 'rgba(255, 100, 0, 0.6)');
      glowGradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.3)');
      glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Meteor body (dark gray/brown rock)
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath();
      // Irregular rock shape
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const radius = size * (0.7 + Math.sin(i * 3) * 0.3);
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      
      // Rock details (lighter spots)
      ctx.fillStyle = '#5a4a3a';
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4 + 0.5;
        const px = Math.cos(angle) * size * 0.4;
        const py = Math.sin(angle) * size * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Hot edge (orange/red glow on the leading edge)
      const edgeGradient = ctx.createRadialGradient(0, -size * 0.5, 0, 0, -size * 0.5, size * 0.8);
      edgeGradient.addColorStop(0, 'rgba(255, 200, 0, 0.9)');
      edgeGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.5)');
      edgeGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
      
      ctx.fillStyle = edgeGradient;
      ctx.beginPath();
      ctx.arc(0, -size * 0.3, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      // Update rotation for next frame
      if (meteor.rotationSpeed) {
        meteor.rotation = (meteor.rotation || 0) + meteor.rotationSpeed;
      }
    });

    ctx.restore();
  }, []);

  // Check meteor collisions with player and medpacks
  const checkMeteorCollisions = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const meteors = gameData.current.meteors;
    if (!meteors || meteors.length === 0) return;

    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftX = getShaftXByIndex(currentIdx);
    const playerAbsX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
    const playerAbsY = gameData.current.playerY;

    meteors.forEach((meteor, meteorIdx) => {
      if (!meteor) return;
      
      // Check collision with player (unless invincible)
      if (!gameData.current.invincible) {
        const dx = Math.abs((playerAbsX + PLAYER_WIDTH / 2) - meteor.x);
        const dy = Math.abs((playerAbsY + PLAYER_HEIGHT / 2) - meteor.y);
        const hitRadius = meteor.size + Math.max(PLAYER_WIDTH, PLAYER_HEIGHT) / 2;

        if (dx < hitRadius && dy < hitRadius) {
          // Player hit by meteor - instant death!
          console.log('💥 Player hit by meteor!');
          
          // Create explosion effect at player position
          createGoreEffect();
          
          // Create additional fire/explosion particles at meteor impact
          for (let i = 0; i < 25; i++) {
            const angle = (Math.PI * 2 * i) / 25 + Math.random() * 0.2;
            const speed = 3 + Math.random() * 5;
            gameData.current.bloodSplatters.push({
              x: meteor.x,
              y: meteor.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 4 + Math.random() * 6,
              alpha: 1.0,
              color: i % 2 === 0 ? '#ff6600' : '#ffaa00' // Alternating orange and bright orange
            });
          }
          
          // Play death sound
          playSplatSound();
          
          // Remove the meteor
          meteors[meteorIdx] = null;
          
          // Kill player
          setTimeout(() => {
            if (gameData.current.lives > 1) {
              setGameState(GAME_STATES.DEAD);
            } else {
              resetLevelAfterDeath();
            }
          }, 100);
          
          return;
        }
      }
      
      // Check collision with medpacks
      const medpacks = gameData.current.medpacks;
      if (medpacks && medpacks.length > 0) {
        medpacks.forEach(pack => {
          if (pack.collected) return;
          
          const dx = Math.abs(pack.x - meteor.x);
          const dy = Math.abs(pack.y - meteor.y);
          const hitRadius = meteor.size + 20; // Medpack hitbox

          if (dx < hitRadius && dy < hitRadius) {
            // Medpack hit by meteor - destroy it!
            console.log('💥 Medpack destroyed by meteor!');
            pack.collected = true;
            
            // Create explosion particles
            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12;
              const speed = 3 + Math.random() * 3;
              gameData.current.bloodSplatters.push({
                x: pack.x,
                y: pack.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                alpha: 0.9,
                color: '#ff6600' // Orange fire color
              });
            }
            
            // Play pop sound
            playPopSound();
          }
        });
      }
    });
    
    // Remove destroyed meteors
    gameData.current.meteors = meteors.filter(m => m !== null);
  }, [gameState, playSplatSound, playPopSound, resetLevelAfterDeath, createGoreEffect, getShaftXByIndex]);

  // Draw cowboy hat balloons
  const drawCowboyHatBalloons = useCallback((ctx) => {
    const config = gameData.current.currentLevelConfig;
    if (!config || !config.hasCowboyHatBalloons) return;
    
    const hatBalloons = gameData.current.cowboyHatBalloons;
    if (!hatBalloons || hatBalloons.length === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    hatBalloons.forEach(balloon => {
      if (!balloon || balloon.collected) return;
      const x = balloon.x;
      const y = balloon.y;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      // Draw balloon string
      ctx.strokeStyle = '#999999';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 35);
      ctx.lineTo(x, y - 10);
      ctx.stroke();

      // Draw red balloon (cowboy theme)
      ctx.fillStyle = '#DC143C';
      ctx.beginPath();
      ctx.ellipse(x, y - 55, 15, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Balloon highlight
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.ellipse(x - 5, y - 60, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Balloon knot
      ctx.fillStyle = '#654321';
      ctx.beginPath();
      ctx.ellipse(x, y - 37, 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw cowboy hat
      const hatSize = 20;
      
      // Hat brim (dark brown)
      ctx.fillStyle = '#654321';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, hatSize / 1.5, hatSize / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Hat crown (lighter brown)
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x - 8, y - 15, 16, 13);
      
      // Hat crown top (rounded)
      ctx.beginPath();
      ctx.ellipse(x, y - 15, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Hat band (darker)
      ctx.fillStyle = '#654321';
      ctx.fillRect(x - 8, y - 8, 16, 3);
      
      // Hat band buckle (gold)
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x - 2, y - 7, 4, 2);
    });

    ctx.restore();
  }, []);

  // Check mushroom collision with player
  const checkMushroomCollision = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const mushrooms = gameData.current.mushrooms;
    if (!mushrooms || mushrooms.length === 0) return;

    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftX = getShaftXByIndex(currentIdx);
    const playerAbsX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
    const playerAbsY = gameData.current.playerY;

    mushrooms.forEach(mushroom => {
      if (mushroom.collected) return;

      // Check collision (generous hitbox)
      const dx = Math.abs((playerAbsX + PLAYER_WIDTH / 2) - mushroom.x);
      const dy = Math.abs((playerAbsY + PLAYER_HEIGHT / 2) - mushroom.y);

      if (dx < 20 && dy < 25) {
        // Collected mushroom!
        mushroom.collected = true;
        
        // Activate invincibility for 20 seconds
        const now = Date.now();
        gameData.current.invincible = true;
        gameData.current.invincibleUntil = now + 20000; // 20 seconds
        
        // Play ting sound for collection
        playTingSound();
        
        console.log('Mushroom collected! Invincible for 20 seconds!');
        
        // Create sparkle effect (golden particles)
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12;
          const speed = 2 + Math.random() * 3;
          gameData.current.bloodSplatters.push({
            x: mushroom.x,
            y: mushroom.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 2,
            alpha: 1.0,
            color: '#ffdd00' // Golden sparkle
          });
        }
      }
    });
  }, [gameState, playTingSound]);

  // Update cowboy hat balloons (unlocked after level 4)
  const updateCowboyHatBalloons = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const config = gameData.current.currentLevelConfig;
    if (!config || !config.hasCowboyHatBalloons) return;
    
    const hatBalloons = gameData.current.cowboyHatBalloons;
    if (!hatBalloons) return;

    // Update positions with wind drift
    hatBalloons.forEach(balloon => {
      if (!balloon || balloon.collected) return;
      
      // Initialize drift properties if not set
      if (balloon.vx === undefined) {
        balloon.vx = (Math.random() - 0.5) * 1.5; // Initial horizontal drift
        balloon.driftTimer = Math.floor(Math.random() * 60) + 30;
      }
      
      // Use configured fall speed
      const speed = config.cowboyHatBalloonSpeed || 1.5;
      balloon.y += speed;
      
      // Apply horizontal wind drift
      balloon.x += balloon.vx;
      
      // Keep balloon on screen (bounce off edges)
      if (balloon.x < 60) {
        balloon.x = 60;
        balloon.vx = Math.abs(balloon.vx) * 0.8;
      } else if (balloon.x > CANVAS_WIDTH - 60) {
        balloon.x = CANVAS_WIDTH - 60;
        balloon.vx = -Math.abs(balloon.vx) * 0.8;
      }
      
      // Randomly change drift direction
      balloon.driftTimer--;
      if (balloon.driftTimer <= 0) {
        balloon.vx = (Math.random() - 0.5) * 2.0;
        balloon.driftTimer = Math.floor(Math.random() * 90) + 20;
      }
    });

    // Remove balloons that went off screen
    gameData.current.cowboyHatBalloons = hatBalloons.filter(balloon => 
      !balloon.collected && balloon.y < CANVAS_HEIGHT + 100
    );

    // Spawn timer - only spawn if no hat balloons exist (limit to 1 at a time)
    if (gameData.current.cowboyHatSpawnTimer > 0) {
      gameData.current.cowboyHatSpawnTimer--;
    } else {
      // Only spawn if no hat balloons are currently on screen and player doesn't have hat
      if (gameData.current.cowboyHatBalloons.length === 0 && !gameData.current.hasCowboyHat) {
        const spawnRange = config.cowboyHatBalloonSpawnRange || [300, 600];
        const spawnInterval = spawnRange[0] + Math.random() * (spawnRange[1] - spawnRange[0]);
        gameData.current.cowboyHatSpawnTimer = spawnInterval;
        
        // Spawn at random x position
        const spawnX = 80 + Math.random() * (CANVAS_WIDTH - 160);
        const fallSpeed = config.cowboyHatBalloonSpeed || 1.5;
        const initialDrift = (Math.random() - 0.5) * 1.5;
        
        gameData.current.cowboyHatBalloons.push({
          x: spawnX,
          y: -70, // Start above screen
          collected: false,
          speed: fallSpeed,
          vx: initialDrift,
          driftTimer: Math.floor(Math.random() * 60) + 30
        });
      } else {
        // Reset timer if hat already exists or player has hat
        const spawnRange = config.cowboyHatBalloonSpawnRange || [300, 600];
        const spawnInterval = spawnRange[0] + Math.random() * (spawnRange[1] - spawnRange[0]);
        gameData.current.cowboyHatSpawnTimer = spawnInterval;
      }
    }
  }, [gameState]);

  // Check cowboy hat balloon collision with player
  const checkCowboyHatCollision = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const hatBalloons = gameData.current.cowboyHatBalloons;
    if (!hatBalloons || hatBalloons.length === 0) return;

    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftX = getShaftXByIndex(currentIdx);
    const playerAbsX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
    const playerAbsY = gameData.current.playerY;

    hatBalloons.forEach(balloon => {
      if (balloon.collected) return;

      // Check collision (generous hitbox)
      const dx = Math.abs((playerAbsX + PLAYER_WIDTH / 2) - balloon.x);
      const dy = Math.abs((playerAbsY + PLAYER_HEIGHT / 2) - balloon.y);

      if (dx < 20 && dy < 25) {
        // Collected cowboy hat!
        balloon.collected = true;
        gameData.current.hasCowboyHat = true;
        
        // Play ting sound for collection
        playTingSound();
        
        console.log('Cowboy hat collected! Yeehaw!');
        
        // Create sparkle effect (brown/tan particles for cowboy theme)
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * 2 * i) / 10;
          const speed = 2 + Math.random() * 3;
          gameData.current.bloodSplatters.push({
            x: balloon.x,
            y: balloon.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 2,
            alpha: 0.8,
            color: '#8B4513' // Brown cowboy color
          });
        }
      }
    });
  }, [gameState, playTingSound]);

  // Check machine gun drop collision
  const checkMachineGunCollision = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const drops = gameData.current.machineGunDrops;
    if (!drops) return;
    
    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftX = getShaftXByIndex(currentIdx);
    const playerAbsX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
    const playerAbsY = gameData.current.playerY;

    drops.forEach(drop => {
      if (drop.collected) return;

      // Check collision
      const dx = Math.abs((playerAbsX + PLAYER_WIDTH / 2) - drop.x);
      const dy = Math.abs((playerAbsY + PLAYER_HEIGHT / 2) - drop.y);

      if (dx < 25 && dy < 25) {
        // Collected!
        drop.collected = true;
        gameData.current.hasMachineGun = true;
        
        // Play ting sound for collection
        playTingSound();
        
        console.log('Machine gun collected!');
        
        // Create pop effect
        for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 * i) / 12;
          const speed = 2 + Math.random() * 3;
          gameData.current.bloodSplatters.push({
            x: drop.x,
            y: drop.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 2,
            alpha: 0.8,
            color: '#ffaa00' // Orange effect for gun pickup
          });
        }
      }
    });
  }, [gameState, playTingSound]);
  // Update machine gun drops (falling animation with drift)
  const updateMachineGunDrops = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const config = gameData.current.currentLevelConfig;
    if (!config || !config.hasMachineGunDrops) return;
    
    const drops = gameData.current.machineGunDrops;
    if (!drops) return;

    // Update positions with wind drift
    drops.forEach(drop => {
      if (!drop || drop.collected) return;
      
      // Initialize drift properties if not set
      if (drop.vx === undefined) {
        drop.vx = (Math.random() - 0.5) * 1.5; // Initial horizontal drift
        drop.driftTimer = Math.floor(Math.random() * 60) + 30; // Change direction every 30-90 frames
      }
      
      // Slower fall speed than dynamite (balloon effect)
      drop.y += 1.5;
      
      // Apply horizontal drift
      drop.x += drop.vx;
      
      // Keep drop on screen (bounce off edges)
      if (drop.x < 40) {
        drop.x = 40;
        drop.vx = Math.abs(drop.vx);
      } else if (drop.x > CANVAS_WIDTH - 40) {
        drop.x = CANVAS_WIDTH - 40;
        drop.vx = -Math.abs(drop.vx);
      }
      
      // Randomly change drift direction (simulate wind gusts)
      drop.driftTimer--;
      if (drop.driftTimer <= 0) {
        drop.vx = (Math.random() - 0.5) * 2;
        drop.driftTimer = Math.floor(Math.random() * 60) + 30;
      }
    });

    // Remove drops that went off screen
    gameData.current.machineGunDrops = drops.filter(drop => 
      !drop.collected && drop.y < CANVAS_HEIGHT + 100
    );

    // Spawn timer
    if (gameData.current.machineGunSpawnTimer > 0) {
      gameData.current.machineGunSpawnTimer--;
    } else {
      const maxDrops = config.machineGunDropCount || 2;
      const currentDrops = drops.filter(d => !d.collected).length;
      
      // Only spawn if we haven't reached max drops and haven't spawned max total
      if (currentDrops < maxDrops && (gameData.current.machineGunDropsSpawned || 0) < maxDrops) {
        // Spawn new machine gun drop
        const spawnX = 80 + Math.random() * (CANVAS_WIDTH - 160);
        gameData.current.machineGunDrops.push({
          x: spawnX,
          y: -70, // Start above screen
          vx: (Math.random() - 0.5) * 1.5,
          collected: false
        });
        gameData.current.machineGunDropsSpawned = (gameData.current.machineGunDropsSpawned || 0) + 1;
        
        // Set timer for next spawn (if we need more)
        if (gameData.current.machineGunDropsSpawned < maxDrops) {
          gameData.current.machineGunSpawnTimer = 600 + Math.random() * 400; // 10-17 seconds
        }
        
        console.log('Machine gun drop spawned!');
      }
    }
  }, [gameState]);

  // Calculate current gun aim angle (called when firing to get target direction)
  const calculateGunAimAngle = useCallback(() => {
    if (!gameData.current.hasMachineGun) return 0;
    
    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftX = getShaftXByIndex(currentIdx);
    const playerAbsX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
    const playerAbsY = gameData.current.playerY;
    const playerCenterX = playerAbsX + PLAYER_WIDTH / 2;
    const playerCenterY = playerAbsY + PLAYER_HEIGHT / 2;
    
    // Find nearest enemy to aim at (limit checks to 20 per type for performance)
    let targetX = null;
    let targetY = null;
    let minDistance = Infinity;
    
    // Check UFOs
    const ufos = gameData.current.ufos || [];
    for (let i = 0; i < Math.min(ufos.length, 20); i++) {
      const ufo = ufos[i];
      if (ufo && !ufo.isDead) {
        const dx = ufo.x - playerCenterX;
        const dy = ufo.y - playerCenterY;
        const dist = dx * dx + dy * dy; // Squared distance (faster, no sqrt needed)
        if (dist < minDistance) {
          minDistance = dist;
          targetX = ufo.x;
          targetY = ufo.y;
        }
      }
    }
    
    // Check balloon dogs
    const balloonDogs = gameData.current.balloonDogs || [];
    for (let i = 0; i < Math.min(balloonDogs.length, 20); i++) {
      const dog = balloonDogs[i];
      if (dog && !dog.isDead) {
        const dx = dog.x - playerCenterX;
        const dy = dog.y - playerCenterY;
        const dist = dx * dx + dy * dy;
        if (dist < minDistance) {
          minDistance = dist;
          targetX = dog.x;
          targetY = dog.y;
        }
      }
    }
    
    // Check flying toilets
    const flyingToilets = gameData.current.flyingToilets || [];
    for (let i = 0; i < Math.min(flyingToilets.length, 20); i++) {
      const toilet = flyingToilets[i];
      if (toilet && !toilet.isDead) {
        const dx = toilet.x - playerCenterX;
        const dy = toilet.y - playerCenterY;
        const dist = dx * dx + dy * dy;
        if (dist < minDistance) {
          minDistance = dist;
          targetX = toilet.x;
          targetY = toilet.y;
        }
      }
    }
    
    // Calculate base angle towards target
    if (targetX !== null && targetY !== null) {
      const dx = targetX - playerCenterX;
      const dy = targetY - playerCenterY;
      return Math.atan2(dy, dx);
    } else {
      // No target - use facing direction
      const facingDir = gameData.current.facingDir || 1;
      return facingDir > 0 ? 0 : Math.PI;
    }
  }, []);

  // Fire bullets from machine gun (called when player jumps)
  const fireMachineGun = useCallback(() => {
    if (!gameData.current.hasMachineGun) return;
    
    const config = gameData.current.currentLevelConfig;
    const bulletCount = config?.machineGunBulletsPerShot || 3;
    const bulletSpeed = config?.machineGunBulletSpeed || 8;
    
    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftX = getShaftXByIndex(currentIdx);
    const playerAbsX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
    const playerAbsY = gameData.current.playerY;
    const playerCenterX = playerAbsX + PLAYER_WIDTH / 2;
    const playerCenterY = playerAbsY + PLAYER_HEIGHT / 2;
    
    // Get current aim angle (this is cached via calculateGunAimAngle)
    const baseAngle = calculateGunAimAngle();
    
    // Cache aim angle for drawing (cricket bat aiming)
    gameData.current.gunAimAngle = baseAngle;
    
    // Fire bullets with slight spread around base angle
    for (let i = 0; i < bulletCount; i++) {
      const spreadAngle = (i - (bulletCount - 1) / 2) * 0.1; // Spread bullets slightly
      const finalAngle = baseAngle + spreadAngle;
      gameData.current.bullets.push({
        x: playerCenterX,
        y: playerCenterY,
        vx: bulletSpeed * Math.cos(finalAngle),
        vy: bulletSpeed * Math.sin(finalAngle),
        playerY: playerCenterY
      });
    }
    
    // Play gun sound
    playGunSound();
    console.log(`Fired ${bulletCount} bullets at angle ${(baseAngle * 180 / Math.PI).toFixed(1)}°`);
  }, [playGunSound, calculateGunAimAngle]);

  // Update bullets (movement and collision with balloon dogs)
  const updateBullets = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const bullets = gameData.current.bullets;
    if (!bullets || bullets.length === 0) return;
    
    // Move bullets
    bullets.forEach(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
    });
    
    // Check collision with balloon dogs
    const balloonDogs = gameData.current.balloonDogs || [];
    balloonDogs.forEach(dog => {
      if (!dog) return;
      
      bullets.forEach(bullet => {
        if (bullet.hit) return;
        
        const dx = bullet.x - dog.x;
        const dy = bullet.y - dog.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 30) {
          // Hit!
          bullet.hit = true;
          
          // Remove balloon dog
          dog.x = -9999; // Move offscreen to be filtered out
          
          // Create explosion effect
          for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 * i) / 15;
            const speed = 2 + Math.random() * 4;
            gameData.current.bloodSplatters.push({
              x: dog.x,
              y: dog.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 3 + Math.random() * 3,
              alpha: 0.9,
              color: '#b8ddff' // Blue balloon color
            });
          }
          
          // Play pop sound
          playPopSound();
          
          console.log('Bullet hit balloon dog!');
        }
      });
    });
    
    // Check collision with UFOs
    const ufos = gameData.current.ufos || [];
    ufos.forEach(ufo => {
      if (!ufo || ufo.isDead) return;
      
      bullets.forEach(bullet => {
        if (bullet.hit) return;
        
        const dx = bullet.x - ufo.x;
        const dy = bullet.y - ufo.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 30) {
          // Hit!
          bullet.hit = true;
          
          // Mark UFO as dead
          ufo.isDead = true;
          
          // Create explosion effect
          for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 2 + Math.random() * 5;
            gameData.current.bloodSplatters.push({
              x: ufo.x,
              y: ufo.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 4 + Math.random() * 4,
              alpha: 0.9,
              color: '#ffff00' // Yellow explosion for UFO
            });
          }
          
          // Play pop sound
          playPopSound();
          
          console.log('Bullet hit UFO!');
        }
      });
    });
    
    // Check collision with flying toilets
    const flyingToilets = gameData.current.flyingToilets || [];
    flyingToilets.forEach(toilet => {
      if (!toilet || toilet.isDead) return;
      
      bullets.forEach(bullet => {
        if (bullet.hit) return;
        
        const dx = bullet.x - toilet.x;
        const dy = bullet.y - toilet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 30) {
          // Hit!
          bullet.hit = true;
          
          // Mark flying toilet as dead
          toilet.isDead = true;
          
          // Create explosion effect
          for (let i = 0; i < 18; i++) {
            const angle = (Math.PI * 2 * i) / 18;
            const speed = 2 + Math.random() * 4;
            gameData.current.bloodSplatters.push({
              x: toilet.x,
              y: toilet.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 3 + Math.random() * 4,
              alpha: 0.9,
              color: '#ffffff' // White explosion for toilet
            });
          }
          
          // Play pop sound
          playPopSound();
          
          console.log('Bullet hit flying toilet!');
        }
      });
    });
    
    // Remove bullets that are off screen or hit something
    gameData.current.bullets = bullets.filter(b => 
      !b.hit && b.x > -50 && b.x < CANVAS_WIDTH + 50 && b.y > -50 && b.y < CANVAS_HEIGHT + 50
    );
  }, [gameState, playPopSound]);

  // Update dynamite balloons (falling animation with drift)
  const updateDynamiteBalloons = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    const dynamiteBalloons = gameData.current.dynamiteBalloons;
    if (!dynamiteBalloons) return;

    // Update positions with drifting breeze effect
    dynamiteBalloons.forEach(balloon => {
      if (!balloon || balloon.exploded) return;
      
      // Initialize drift properties if not set
      if (balloon.vx === undefined) {
        balloon.vx = (Math.random() - 0.5) * 1.5; // Initial horizontal drift
        balloon.driftTimer = Math.floor(Math.random() * 60) + 30; // Change direction every 30-90 frames
      }
      
      // Faster fall speed (balloon effect)
      balloon.y += 2.0; // Faster descent
      
      // Apply horizontal drift
      balloon.x += balloon.vx;
      
      // Keep balloon on screen (bounce off edges)
      if (balloon.x < 40) {
        balloon.x = 40;
        balloon.vx = Math.abs(balloon.vx); // Reverse to drift right
      } else if (balloon.x > CANVAS_WIDTH - 40) {
        balloon.x = CANVAS_WIDTH - 40;
        balloon.vx = -Math.abs(balloon.vx); // Reverse to drift left
      }
      
      // Randomly change drift direction (simulate wind gusts)
      balloon.driftTimer--;
      if (balloon.driftTimer <= 0) {
        // Change drift direction and speed
        balloon.vx = (Math.random() - 0.5) * 2; // New drift velocity -1 to +1
        balloon.driftTimer = Math.floor(Math.random() * 60) + 30; // Next change in 30-90 frames
      }
    });

    // Remove dynamite balloons that went off screen
    gameData.current.dynamiteBalloons = dynamiteBalloons.filter(balloon => 
      !balloon.exploded && balloon.y < CANVAS_HEIGHT + 100
    );

    // Spawn timer
    if (gameData.current.dynamiteBalloonSpawnTimer > 0) {
      gameData.current.dynamiteBalloonSpawnTimer--;
    } else {
      // Spawn new dynamite balloon (every 800-1200 frames, about 13-20 seconds at 60fps)
      const spawnInterval = 800 + Math.random() * 400;
      gameData.current.dynamiteBalloonSpawnTimer = spawnInterval;
      
      // Spawn at random x position
      const spawnX = 80 + Math.random() * (CANVAS_WIDTH - 160);
      gameData.current.dynamiteBalloons.push({
        x: spawnX,
        y: -70, // Start above screen
        vx: (Math.random() - 0.5) * 1.5, // Initial horizontal drift velocity
        driftTimer: Math.floor(Math.random() * 60) + 30, // Frames until drift change
        exploded: false
      });
    }
  }, [gameState]);

  // Check dynamite balloon collision with player
  const checkDynamiteBalloonCollision = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING) return;
    
    // Check if player is currently in a death state or invincible - prevent deaths
    const now = Date.now();
    const isInDeathState = now < (gameData.current.deathEffectUntil || 0);
    const isInvincible = gameData.current.invincible && now < (gameData.current.invincibleUntil || 0);
    if (isInDeathState || isInvincible) return;
    
    const dynamiteBalloons = gameData.current.dynamiteBalloons;
    if (!dynamiteBalloons || dynamiteBalloons.length === 0) return;

    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftX = getShaftXByIndex(currentIdx);
    const playerAbsX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
    const playerAbsY = gameData.current.playerY;

    dynamiteBalloons.forEach(balloon => {
      if (balloon.exploded) return;

      // Check collision (generous hitbox for dynamite)
      const dx = Math.abs((playerAbsX + PLAYER_WIDTH / 2) - balloon.x);
      const dy = Math.abs((playerAbsY + PLAYER_HEIGHT / 2) - balloon.y);

      if (dx < 20 && dy < 25) {
        // Hit dynamite - player dies!
        balloon.exploded = true;
        
        console.log('Player hit dynamite! Explosion!');
        
        // Create explosion effect (large burst of particles)
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 5;
          gameData.current.bloodSplatters.push({
            x: balloon.x,
            y: balloon.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2, // Upward bias for explosion
            size: 4 + Math.random() * 6,
            alpha: 1.0,
            color: Math.random() > 0.5 ? '#ff8800' : '#ffff00' // Orange and yellow explosion
          });
        }
        
        // Add smoke particles
        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 3;
          gameData.current.bloodSplatters.push({
            x: balloon.x,
            y: balloon.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 6 + Math.random() * 8,
            alpha: 0.6,
            color: '#333333' // Dark gray smoke
          });
        }
        
        // Play death sound
        playSound('death');
        playSplatSound(); // Play splat sound for dynamite death
        
        // Create gore effect
        createGoreEffect();
        
        // Lose a life
        gameData.current.lives--;
        gameData.current.deathEffectUntil = now + 2000; // Prevent multiple deaths for 2 seconds
        if (gameData.current.lives <= 0) {
          setGameState(GAME_STATES.DEAD);
        } else {
          setTimeout(() => { resetLevelAfterDeath(); primeBalloonDogs(); }, 1600);
        }
      }
    });
  }, [gameState, createGoreEffect, playSplatSound, playSound, resetLevelAfterDeath, primeBalloonDogs, setGameState]);

  // Helper: draw lift cable at specific shaft X and liftY
  const drawLiftCableAt = (ctx, shaftX, liftY) => {
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const cableX = liftX + LIFT_WIDTH / 2;
    const cableStartY = liftY;
    const cableEndY = 0;

    // Main cable
    ctx.strokeStyle = COLORS.LIGHT_GRAY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cableX, cableEndY);
    ctx.lineTo(cableX, cableStartY);
    ctx.stroke();

    // Segments
    ctx.strokeStyle = COLORS.DARK_GRAY;
    ctx.lineWidth = 1;
    const segmentLength = 20;
    for (let y = cableEndY; y < cableStartY; y += segmentLength) {
      ctx.beginPath();
      ctx.moveTo(cableX - 1, y);
      ctx.lineTo(cableX + 1, y);
      ctx.stroke();
    }

    // Attachments
    ctx.fillStyle = COLORS.GRAY;
    ctx.fillRect(cableX - 4, 0, 8, 8);
    ctx.fillRect(cableX - 3, liftY - 2, 6, 4);
  };
  // Helper: draw lift at specific shaft X and liftY
  const drawLiftAt = (ctx, shaftX, liftY, options = {}) => {
    // Handle side-lift extra doors based on lever triggers
    const { openLeft = false, openRight = false, theme = 'gray' } = options;
    const positions = getShaftPositions();
    const isLeftLift = (shaftX === positions.left);
    const isRightLift = (shaftX === positions.right);
    const isCenterLift = (!isLeftLift && !isRightLift);
    const actualOpenLeft = openLeft || (isLeftLift && gameData.current.leftLiftDoorLeftOpen) || (isCenterLift && gameData.current.centerDoorLeftOpen);
    const actualOpenRight = openRight || (isRightLift && gameData.current.rightLiftDoorRightOpen) || (isCenterLift && gameData.current.centerDoorRightOpen);
    const p = gameData.current.doorOpenProgress || {};
    const progressLeft = isLeftLift ? (p.leftLeft || 0) : isRightLift ? (p.rightLeft || 0) : (p.centerLeft || 0);
    const progressRight = isLeftLift ? (p.leftRight || 0) : isRightLift ? (p.rightRight || 0) : (p.centerRight || 0);
    const OPEN_MARGIN = 10; // pixels left at top/bottom when fully open
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;

    // Theme colors
    let wallColor = COLORS.LIGHT_GRAY;
    let floorColor = COLORS.GRAY;
    let ceilingColor = wallColor;
    if (theme === 'red') {
      wallColor = COLORS.RED;
      floorColor = COLORS.DARK_RED;
      ceilingColor = wallColor;
    } else if (theme === 'blue') {
      wallColor = COLORS.BLUE;
      floorColor = COLORS.BLUE;
      ceilingColor = wallColor;
    } else if (theme === 'white') {
      wallColor = COLORS.WHITE;
      floorColor = COLORS.WHITE;
      ceilingColor = wallColor;
    }

    // Lift floor
    ctx.fillStyle = floorColor;
    ctx.fillRect(liftX, liftY + LIFT_HEIGHT - 10, LIFT_WIDTH, 10);

    // Lift walls (with optional door gaps)
    ctx.fillStyle = wallColor;
    // Left wall with optional gap (animated)
    const drawAnimatedLeft = (progress) => {
      // Opening grows from center, leaving OPEN_MARGIN at top/bottom at full open
      const currentGap = (LIFT_HEIGHT - 2 * OPEN_MARGIN) * Math.max(0, Math.min(1, progress));
      const topHeight = Math.floor((LIFT_HEIGHT - currentGap) / 2);
      const bottomHeight = LIFT_HEIGHT - currentGap - topHeight;
      // Top segment
      ctx.fillRect(liftX, liftY, 10, topHeight);
      // Bottom segment
      const bottomStart = liftY + topHeight + currentGap;
      ctx.fillRect(liftX, bottomStart, 10, bottomHeight);
    };

    if (actualOpenLeft || progressLeft > 0) {
      drawAnimatedLeft(progressLeft);
    } else {
      ctx.fillRect(liftX, liftY, 10, LIFT_HEIGHT);
    }

    // Right wall with optional gap (animated)
    const drawAnimatedRight = (progress) => {
      const currentGap = (LIFT_HEIGHT - 2 * OPEN_MARGIN) * Math.max(0, Math.min(1, progress));
      const topHeight = Math.floor((LIFT_HEIGHT - currentGap) / 2);
      const bottomHeight = LIFT_HEIGHT - currentGap - topHeight;
      // Top segment
      ctx.fillRect(liftX + LIFT_WIDTH - 10, liftY, 10, topHeight);
      // Bottom segment
      const bottomStart = liftY + topHeight + currentGap;
      ctx.fillRect(liftX + LIFT_WIDTH - 10, bottomStart, 10, bottomHeight);
    };

    if (actualOpenRight || progressRight > 0) {
      drawAnimatedRight(progressRight);
    } else {
      ctx.fillRect(liftX + LIFT_WIDTH - 10, liftY, 10, LIFT_HEIGHT);
    }

    // Lift ceiling
    ctx.fillStyle = ceilingColor;
    ctx.fillRect(liftX, liftY, LIFT_WIDTH, 10);

    // Spikes hanging from ceiling (red, pointing down)
    {
      const interiorLeft = liftX + 10;
      const interiorRight = liftX + LIFT_WIDTH - 10;
      const spikeBaseY = liftY + 10; // bottom edge of ceiling
      const spikeWidth = 12;
      const spikeHeight = 12;
      for (let sx = interiorLeft + 2; sx < interiorRight - 2 - spikeWidth; sx += spikeWidth) {
        ctx.beginPath();
        ctx.moveTo(sx, spikeBaseY);
        ctx.lineTo(sx + spikeWidth / 2, spikeBaseY + spikeHeight);
        ctx.lineTo(sx + spikeWidth, spikeBaseY);
        ctx.closePath();
        ctx.fillStyle = COLORS.RED;
        ctx.fill();
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Rivets
    ctx.fillStyle = COLORS.DARK_GRAY;
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(liftX + 2, liftY + 20 + i * 20, 2, 2);
      ctx.fillRect(liftX + LIFT_WIDTH - 4, liftY + 20 + i * 20, 2, 2);
    }

    // Floor display (optional, keep for consistency)
    const currentFloor = calculateCurrentFloor();
    drawFloorDisplay(ctx, liftX + LIFT_WIDTH/2 - 15, liftY - 15, currentFloor);
  };

  // Draw levers inside the center lift (red on left-top inside, blue on right-top inside)
  const drawLevers = (ctx) => {
    // Get positions for all lifts
    const { center: shaftX, right: rightShaftX } = getShaftPositions();

    // Draw levers in center lift
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const liftY = gameData.current.liftY;

    // Red lever (left-top inside) - moved further down for easier reach
    const redX = liftX + 12;
    const redY = liftY + 44;
    ctx.fillStyle = gameData.current.redLeverTriggered ? '#990000' : '#ff0000';
    ctx.fillRect(redX, redY, 10, 6);
    // Mount
    ctx.fillStyle = COLORS.DARK_GRAY;
    ctx.fillRect(redX - 2, redY + 6, 14, 3);

    // Blue lever (right-top inside) - moved further down for easier reach
    const blueX = liftX + LIFT_WIDTH - 22;
    const blueY = liftY + 44;
    ctx.fillStyle = gameData.current.blueLeverTriggered ? '#000099' : '#0066ff';
    ctx.fillRect(blueX, blueY, 10, 6);
    // Mount
    ctx.fillStyle = COLORS.DARK_GRAY;
    ctx.fillRect(blueX - 2, blueY + 6, 14, 3);

    // Yellow lever removed from right lift
  };

  // Collision check helper
  const rectsIntersect = (a, b) => (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );

  // Check lever triggers based on player position
  const checkLeverTriggers = () => {
    // Get positions for all lifts
    const { center: shaftX, right: rightShaftX } = getShaftPositions();
    const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const liftY = gameData.current.liftY;
    const rightLiftX = rightShaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
    const rightLiftY = gameData.current.rightLiftY;

    const redLever = { x: liftX + 12, y: liftY + 44, w: 10, h: 6 };
    const blueLever = { x: liftX + LIFT_WIDTH - 22, y: liftY + 44, w: 10, h: 6 };
    // Yellow lever removed

    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftXForPlayer = getShaftXByIndex(currentIdx);
    const liftCenterXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
    const playerRect = {
      x: liftCenterXForPlayer + gameData.current.playerX,
      y: gameData.current.playerY,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT
    };

    if (!gameData.current.redLeverTriggered && rectsIntersect(playerRect, redLever)) {
      gameData.current.redLeverTriggered = true;
      // Center left door opens, and BOTH sides of left lift open
      gameData.current.centerDoorLeftOpen = true;
      gameData.current.leftLiftDoorRightOpen = true;
      gameData.current.leftLiftDoorLeftOpen = true;
      playDoorSound(); // Play door sliding sound
    }
    if (!gameData.current.blueLeverTriggered && rectsIntersect(playerRect, blueLever)) {
      gameData.current.blueLeverTriggered = true;
      // Center right door opens, and BOTH sides of right lift open
      gameData.current.centerDoorRightOpen = true;
      gameData.current.rightLiftDoorLeftOpen = true;
      gameData.current.rightLiftDoorRightOpen = true;
      playDoorSound(); // Play door sliding sound
    }
    // Yellow lever functionality removed
  };

  // Check if player is in a side lift that has stopped at bottom for win condition
  const checkSideLiftWinCondition = () => {
    const currentShaftIndex = gameData.current.currentShaftIndex || 0;
    
    // Check if player is in left lift (-1) and left lift has stopped at bottom
    if (currentShaftIndex === -1) {
      const leftBottom = gameData.current.leftLiftY + LIFT_HEIGHT;
      if (leftBottom >= CANVAS_HEIGHT) {
        return 'left';
      }
    }
    
    // Check if player is in right lift (1) and right lift has stopped at bottom
    if (currentShaftIndex === 1) {
      const rightBottom = gameData.current.rightLiftY + LIFT_HEIGHT;
      if (rightBottom >= CANVAS_HEIGHT) {
        return 'right';
      }
    }
    
    return null;
  };
  // Handle transferring player between lifts when doors are open and aligned
  const handleLiftTransfers = () => {
    const alignThresh = 30; // pixels
    const idx = gameData.current.currentShaftIndex || 0;

    const pos = getShaftPositions();
    const centerX = pos.center + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
    const leftX = pos.left + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
    const rightX = pos.right + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;

    // Player absolute X
    const currentCenterX = idx === -1 ? leftX : idx === 1 ? rightX : centerX;
    const absX = currentCenterX + gameData.current.playerX;

    const minRel = -( (LIFT_WIDTH - 20 - PLAYER_WIDTH) / 2 );
    const maxRel = ( (LIFT_WIDTH - 20 - PLAYER_WIDTH) / 2 );

    // Center to sides
    if (idx === 0) {
      // To left
      if (gameData.current.centerDoorLeftOpen && gameData.current.leftLiftDoorRightOpen && Math.abs(gameData.current.liftY - gameData.current.leftLiftY) <= alignThresh && gameData.current.playerX <= minRel - 2) {
        gameData.current.currentShaftIndex = -1;
        const newRel = absX - leftX;
        gameData.current.playerX = Math.max(minRel, Math.min(maxRel, newRel));
      }
      // To right
      if (gameData.current.centerDoorRightOpen && gameData.current.rightLiftDoorLeftOpen && Math.abs(gameData.current.liftY - gameData.current.rightLiftY) <= alignThresh && gameData.current.playerX >= maxRel + 2) {
        gameData.current.currentShaftIndex = 1;
        const newRel = absX - rightX;
        gameData.current.playerX = Math.max(minRel, Math.min(maxRel, newRel));
      }
    } else if (idx === -1) {
      // Left to center via right side
      if (gameData.current.centerDoorLeftOpen && gameData.current.leftLiftDoorRightOpen && Math.abs(gameData.current.liftY - gameData.current.leftLiftY) <= alignThresh && gameData.current.playerX >= maxRel + 2) {
        gameData.current.currentShaftIndex = 0;
        const newRel = absX - centerX;
        gameData.current.playerX = Math.max(minRel, Math.min(maxRel, newRel));
      }
    } else if (idx === 1) {
      // Right to center via left side
      if (gameData.current.centerDoorRightOpen && gameData.current.rightLiftDoorLeftOpen && Math.abs(gameData.current.liftY - gameData.current.rightLiftY) <= alignThresh && gameData.current.playerX <= minRel - 2) {
        gameData.current.currentShaftIndex = 0;
        const newRel = absX - centerX;
        gameData.current.playerX = Math.max(minRel, Math.min(maxRel, newRel));
      }
    }
  };
  // Draw platforms outside (gutters) and between lifts
  const drawPlatforms = (ctx) => {
    const { left: leftShaftX, center: centerShaftX, right: rightShaftX } = getShaftPositions();
    
    // Determine whether the middle lift should be moving (used to guarantee platform presence)
    const liftBottomY = gameData.current.liftY + LIFT_HEIGHT;
    const shouldMove = gameData.current.wrapModeEnabled ? true : (liftBottomY < CANVAS_HEIGHT);

    // Columns outside the lifts (gutters)
    const leftGutterCenter = Math.max(16, leftShaftX - 30);
    const rightGutterCenter = Math.min(CANVAS_WIDTH - 16, rightShaftX + SHAFT_WIDTH + 30);

    // Columns between the lifts (mid gaps)
    const midLeftCenter = leftShaftX + SHAFT_WIDTH + SHAFT_GAP / 2; // between left and center
    const midRightCenter = centerShaftX + SHAFT_WIDTH + SHAFT_GAP / 2; // between center and right

    // Platform sizes
    const OUT_PLATFORM_WIDTH = Math.floor(LIFT_WIDTH * 0.45);
    const MID_PLATFORM_WIDTH = Math.min(Math.floor(LIFT_WIDTH * 0.35), SHAFT_GAP - 20);
    const PLATFORM_HEIGHT = 10;

    const columns = [
      { cx: leftGutterCenter, w: OUT_PLATFORM_WIDTH, color: '#dd4444' },
      { cx: rightGutterCenter, w: OUT_PLATFORM_WIDTH, color: '#4488ff' },
      { cx: midLeftCenter, w: MID_PLATFORM_WIDTH, color: '#f0d000' },
      { cx: midRightCenter, w: MID_PLATFORM_WIDTH, color: '#f0d000' }
    ];

    const phases = gameData.current.platformSpawnPhases || [0, 1, 0, 1];
    const densities = gameData.current.platformSpawnDensity || [2, 2, 2, 2];

    // Track if we have at least one visible platform per column this frame
    const colHasVisible = [false, false, false, false];
    
    // Debug: Track platform visibility for platforms 3 and 4
    let platform3Visible = false;
    let platform4Visible = false;

    // Draw platforms per-column using density 2 or 3 (every second or third row)
    gameData.current.shaftLines.forEach((line, idx) => {
      columns.forEach((col, colIndex) => {
        const density = Math.max(1, densities[colIndex] || 2);
        if (((idx + (phases[colIndex] || 0)) % density) !== 0) return;

        const px = Math.round(col.cx - col.w / 2);
        const py = Math.round(line.y); // Static platforms - no offset calculation needed
        if (py < -PLATFORM_HEIGHT || py > CANVAS_HEIGHT + PLATFORM_HEIGHT) return;

        // Track visibility for platforms 3 and 4
        if (colIndex === 2) platform3Visible = true;
        if (colIndex === 3) platform4Visible = true;

        // Platform base
        ctx.fillStyle = col.color;
        ctx.fillRect(px, py, col.w, PLATFORM_HEIGHT);

        // Outline for visibility
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, col.w, PLATFORM_HEIGHT);

        // Small rivets/details
        ctx.fillStyle = COLORS.DARK_GRAY;
        ctx.fillRect(px + 6, py + 3, 2, 2);
        ctx.fillRect(px + col.w - 8, py + 3, 2, 2);

        // Level 4: Draw cherries on every 8th platform for column 0 (platform 1)
        if (gameData.current.level === 4 && colIndex === 0 && (idx % 8) === 0) {
          const platformId = `platform_${colIndex}_${idx}`;
          if (!gameData.current.platformCherriesCollected.has(platformId)) {
            // Draw cherry on platform
            const cherryX = px + Math.floor(col.w / 2) - 6;
            const cherryY = py - 12; // Above the platform
            drawGoldenKeyIcon(ctx, cherryX, cherryY);
            
            // Only check collision if cherry is visible on screen (optimization)
            if (cherryY >= -20 && cherryY <= CANVAS_HEIGHT + 20) {
              // Check for collision with player
              const currentIdx = gameData.current.currentShaftIndex || 0;
              const shaftXForPlayer = getShaftXByIndex(currentIdx);
              const liftCenterXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
              const playerRect = {
                x: liftCenterXForPlayer + gameData.current.playerX,
                y: gameData.current.playerY,
                w: PLAYER_WIDTH,
                h: PLAYER_HEIGHT
              };
              
              const cherryRect = { x: cherryX, y: cherryY, w: 12, h: 12 };
              if (rectsIntersect(playerRect, cherryRect)) {
                gameData.current.platformCherriesCollected.add(platformId);
                gameData.current.goldenKeys = (gameData.current.goldenKeys || 0) + 1;
                gameData.current.score += 100;
                playTingSound();
                console.log('Platform cherry collected! Score:', gameData.current.score, 'Total cherries:', gameData.current.goldenKeys);
              }
            }
          }
        }

        // Draw green apples (required for level progression)
        gameData.current.applesPlacements.forEach((apple, appleIdx) => {
          if (apple.platformIndex === `${colIndex}_${idx}` && !apple.collected) {
            const appleX = px + Math.floor(col.w / 2) - 6;
            const appleY = py - 14; // Above the platform
            drawGreenAppleIcon(ctx, appleX, appleY);
            
            // Only check collision if apple is visible on screen
            if (appleY >= -20 && appleY <= CANVAS_HEIGHT + 20) {
              const currentIdx = gameData.current.currentShaftIndex || 0;
              const shaftXForPlayer = getShaftXByIndex(currentIdx);
              const liftCenterXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
              const playerRect = {
                x: liftCenterXForPlayer + gameData.current.playerX,
                y: gameData.current.playerY,
                w: PLAYER_WIDTH,
                h: PLAYER_HEIGHT
              };
              
              const appleRect = { x: appleX, y: appleY, w: 12, h: 14 };
              if (rectsIntersect(playerRect, appleRect)) {
                apple.collected = true;
                gameData.current.applesCollected++;
                gameData.current.score += 150;
                playTingSound();
                console.log('🍏 Apple collected!', gameData.current.applesCollected, '/', gameData.current.requiredApplesPerLevel);
              }
            }
          }
        });

        // Draw yellow bananas (required for level progression)
        gameData.current.bananasPlacements.forEach((banana, bananaIdx) => {
          if (banana.platformIndex === `${colIndex}_${idx}` && !banana.collected) {
            const bananaX = px + Math.floor(col.w / 2) - 7;
            const bananaY = py - 12; // Above the platform
            drawYellowBananaIcon(ctx, bananaX, bananaY);
            
            // Only check collision if banana is visible on screen
            if (bananaY >= -20 && bananaY <= CANVAS_HEIGHT + 20) {
              const currentIdx = gameData.current.currentShaftIndex || 0;
              const shaftXForPlayer = getShaftXByIndex(currentIdx);
              const liftCenterXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
              const playerRect = {
                x: liftCenterXForPlayer + gameData.current.playerX,
                y: gameData.current.playerY,
                w: PLAYER_WIDTH,
                h: PLAYER_HEIGHT
              };
              
              const bananaRect = { x: bananaX, y: bananaY, w: 15, h: 12 };
              if (rectsIntersect(playerRect, bananaRect)) {
                banana.collected = true;
                gameData.current.bananasCollected++;
                gameData.current.score += 200;
                playTingSound();
                console.log('🍌 Banana collected!', gameData.current.bananasCollected, '/', gameData.current.requiredBananasPerLevel);
              }
            }
          }
        });

        if (py >= 0 && py <= CANVAS_HEIGHT) colHasVisible[colIndex] = true;
      });
    });

    // Guarantee presence while moving: if a column lacks a visible platform, draw a fallback
    if (shouldMove) {
      const fallbackYs = [Math.floor(CANVAS_HEIGHT * 0.2), Math.floor(CANVAS_HEIGHT * 0.8), Math.floor(CANVAS_HEIGHT * 0.35), Math.floor(CANVAS_HEIGHT * 0.65)];
      colHasVisible.forEach((has, i) => {
        if (has) return;
        const col = columns[i];
        const px = Math.floor(col.cx - col.w / 2);
        const py = fallbackYs[i];
        ctx.fillStyle = col.color;
        ctx.fillRect(px, py, col.w, PLATFORM_HEIGHT);
        ctx.strokeStyle = COLORS.BLACK;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, col.w, PLATFORM_HEIGHT);
        ctx.fillStyle = COLORS.DARK_GRAY;
        ctx.fillRect(px + 6, py + 3, 2, 2);
        ctx.fillRect(px + col.w - 8, py + 3, 2, 2);
      });
    }
    if (DEBUG_PLATFORMS && shouldMove) {
      // Log when we had to draw any fallback platforms this frame
    }
    
    // Debug: Log platform visibility summary every 300 frames (5 seconds)
    if (gameData.current.frameCount % 300 === 0) {
      console.log(`[PLATFORM DEBUG] Visibility summary:`, {
        frame: gameData.current.frameCount,
        platform3Visible,
        platform4Visible,
        densities: [densities[2], densities[3]],
        phases: [phases[2], phases[3]]
      });
    }
  };

  // Draw small flat platform caps on top of each moving column
  const drawColumnTopPlatforms = (ctx) => {
    const { left: leftShaftX, center: centerShaftX, right: rightShaftX } = getShaftPositions();
    const cols = [
      { x: leftShaftX, y: gameData.current.leftLiftY, color: '#cc3333' },
      { x: centerShaftX, y: gameData.current.liftY, color: '#dddddd' },
      { x: rightShaftX, y: gameData.current.rightLiftY, color: '#3366cc' }
    ];
    const pad = TOP_PLATFORM_PAD; // inset from shaft walls
    const w = LIFT_WIDTH - pad * 2;
    const h = TOP_PLATFORM_HEIGHT;
    cols.forEach(col => {
      const px = Math.round(col.x + (SHAFT_WIDTH - LIFT_WIDTH) / 2 + pad);
      const py = Math.round(col.y - h); // sit on top of the column
      // base
      ctx.fillStyle = col.color;
      ctx.fillRect(px, py, w, h);
      // outline
      ctx.strokeStyle = COLORS.BLACK;
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, w, h);
    });
  };

  // Draw background stars
  const drawStars = (ctx) => {
    gameData.current.stars.forEach(star => {
      star.twinkle += 2;
      const alpha = (Math.sin(star.twinkle * 0.1) + 1) * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
  };

  // Draw level-specific background
  const drawLevelBackground = (ctx) => {
    const currentLevel = gameData.current.level;
    // Use level-specific backgrounds (1-15), fallback to cycling if level > 15
    const backgroundLevel = currentLevel <= 15 ? currentLevel : ((currentLevel - 1) % 15) + 1;
    const backgroundImage = backgroundImagesRef.current[backgroundLevel];
    
    if (backgroundImage) {
      // Save the current globalAlpha
      const originalAlpha = ctx.globalAlpha;
      // Set 60% opacity - more visible backgrounds
      ctx.globalAlpha = 0.6;
      // Draw the background image to fill the entire canvas
      ctx.drawImage(backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // Restore the original globalAlpha
      ctx.globalAlpha = originalAlpha;
    } else {
      // Fallback to stars if background not loaded
      drawStars(ctx);
    }
  };

  // Draw blood splatters - enhanced for more dramatic gore
  const drawBloodSplatters = (ctx) => {
    gameData.current.bloodSplatters.forEach(splatter => {
      // Use custom color if provided, otherwise default to blood red
      const color = splatter.color || '#ff0000';
      // Convert hex to rgb for alpha support
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${splatter.alpha})`;
      
      // Draw larger, more visible blood drops
      ctx.fillRect(splatter.x, splatter.y, splatter.size, splatter.size);
      
      // Faster fade and no glow for reduced gore
      splatter.alpha -= 0.03;
      
      // Update blood splatter physics for more realistic movement
      if (splatter.vx || splatter.vy) {
        splatter.x += splatter.vx;
        splatter.y += splatter.vy;
        
        // Apply gravity to blood drops
        splatter.vy += 0.2;
        
        // Apply air resistance
        splatter.vx *= 0.98;
        splatter.vy *= 0.98;
      }
    });
    
    // Remove faded splatters
    gameData.current.bloodSplatters = gameData.current.bloodSplatters.filter(s => s.alpha > 0);
  };

  // Update body parts physics
  const updateBodyParts = () => {
    const env = gameData.current.deathEnv;
    const isLiftEnv = env && env.type === 'lift';
    const liftX = isLiftEnv ? (env.liftX || 0) : 0;
    const liftY = isLiftEnv ? (env.liftY || 0) : 0;
    
    gameData.current.bodyParts.forEach(part => {
      // Apply gravity (reduced for softer effect)
      part.vy += 0.2;
      
      // Update position
      part.x += part.vx;
      part.y += part.vy;
      
      // Bounce depending on death environment
      if (isLiftEnv) {
        // Bounce off lift walls
        if (part.x <= liftX + 10) {
          part.x = liftX + 10;
          part.vx = Math.abs(part.vx) * 0.7;
        }
        if (part.x + part.width >= liftX + LIFT_WIDTH - 10) {
          part.x = liftX + LIFT_WIDTH - 10 - part.width;
          part.vx = -Math.abs(part.vx) * 0.7;
        }
        // Bounce off lift floor
        if (part.y + part.height >= liftY + LIFT_HEIGHT - 10) {
          part.y = liftY + LIFT_HEIGHT - 10 - part.height;
          part.vy = -Math.abs(part.vy) * 0.3;
          part.vx *= 0.7;
        }
      } else {
        // Outside: only bounce at bottom of canvas, not within lift interior
        if (part.y + part.height >= CANVAS_HEIGHT) {
          part.y = CANVAS_HEIGHT - part.height;
          part.vy = -Math.abs(part.vy) * 0.3;
          part.vx *= 0.8;
        }
        // Optional: light screen-edge bounce
        if (part.x <= 0) {
          part.x = 0;
          part.vx = Math.abs(part.vx) * 0.6;
        }
        if (part.x + part.width >= CANVAS_WIDTH) {
          part.x = CANVAS_WIDTH - part.width;
          part.vx = -Math.abs(part.vx) * 0.6;
        }
      }
      
      // Add blood trail
      if (part.bloodTrail.length > 5) {
        part.bloodTrail.shift();
      }
      part.bloodTrail.push({
        x: part.x + part.width/2,
        y: part.y + part.height/2,
        alpha: 0.8
      });
      
      // Fade blood trail
      part.bloodTrail.forEach(blood => {
        blood.alpha -= 0.1;
      });
      part.bloodTrail = part.bloodTrail.filter(blood => blood.alpha > 0);
    });
  };

  // Handle jump
  const handleJump = useCallback(() => {
    if (gameState !== GAME_STATES.PLAYING || gameData.current.jumpCooldown > 0 || gameData.current.isJumping) return;
    
    const distanceToImpact = (CANVAS_HEIGHT - gameData.current.liftY);
    
    // Always allow the player to jump - no immediate death
    playSound('jump');

    // Fire machine gun if player has it
    fireMachineGun();

    // Provide grace frames if jumping off a platform or top-of-lift to avoid instant ceiling crush
    const startedFromPlatform = gameData.current.onOutsidePlatform || gameData.current.onTopOfLift;
    if (startedFromPlatform) {
      gameData.current.jumpGracePeriod = Math.max(gameData.current.jumpGracePeriod, 12);
    }

    gameData.current.isJumping = true;
    gameData.current.startedFromPlatformThisJump = !!startedFromPlatform;
    gameData.current.airTicks = 0;
    // Determine jump direction from input/velocity/facing (prioritize active input)
    let jd = 0;
    if (gameData.current.keys['ArrowLeft'] || gameData.current.keys['a']) jd = -1;
    else if (gameData.current.keys['ArrowRight'] || gameData.current.keys['d']) jd = 1;
    else if (Math.abs(gameData.current.playerVelocityX) > 1) jd = gameData.current.playerVelocityX > 0 ? 1 : -1;
    else jd = gameData.current.facingDir || 1;
    gameData.current.jumpDirection = jd;
    gameData.current.onOutsidePlatform = false; // leaving platform when jumping
    gameData.current.onTopOfLift = false; // leaving top cap when jumping
    gameData.current.outsidePlatformCol = -1;
    // Base vertical impulse with bonus if moving in a direction at takeoff
    const baseJumpVy = -6.5; // reduced jump height to avoid ceiling spikes
    const movingHoriz = (jd !== 0) && (Math.abs(gameData.current.playerVelocityX) > 0 || gameData.current.keys['ArrowLeft'] || gameData.current.keys['a'] || gameData.current.keys['ArrowRight'] || gameData.current.keys['d']);
    const bonusVy = movingHoriz ? -0.6 : 0; // reduced sideways jump bonus

    // Apply pending double-tap boost (from key handler)
    let vy = baseJumpVy + bonusVy;
    if (gameData.current.pendingDoubleJumpBoost) {
      vy *= 1.5;
      gameData.current.pendingDoubleJumpBoost = false;
      gameData.current.jumpBoostedThisAir = true;
    } else {
      gameData.current.jumpBoostedThisAir = false;
    }
    gameData.current.jumpVelocity = vy; // set vertical jump velocity

      // Give a horizontal impulse for a longer leap if moving sideways
      if (jd !== 0) {
        const hImpulse = 150; // px/s horizontal boost on jump for clearer arc
        gameData.current.playerVelocityX += jd * hImpulse;
        gameData.current.movementDirection = jd;
        gameData.current.facingDir = jd;
      }
    {
      // Preserve exact current Y at jump start (platform or cap)
      const currentFeet = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
      gameData.current.jumpStartFeetY = currentFeet;
    }
    gameData.current.bigFallTriggered = false;
    gameData.current.jumpStartTime = Date.now();
    gameData.current.jumpCooldown = 10; // Short cooldown to prevent spam jumping
  }, [gameState, getGroundPlayerYByIndex, playSound, fireMachineGun]);
  // Handle keyboard input
  const handleKeyDown = useCallback((event) => {
    const key = event.key;
    const lowerKey = typeof key === 'string' ? key.toLowerCase() : key;

    gameData.current.keys[key] = true;
    if (lowerKey && lowerKey !== key) {
      gameData.current.keys[lowerKey] = true;
    }

    // Prevent the browser from stealing focus/scrolling so horizontal movement stays responsive
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(lowerKey) || lowerKey === 'a' || lowerKey === 'd' || key === ' ') {
      event.preventDefault();
    }

    if (key === 'F5') {
      saveSnapshot();
      return;
    }
    if (key === 'F9') {
      const ok = loadSnapshot();
      if (ok) setGameState(GAME_STATES.PLAYING);
      return;
    }
    if (key === ' ' || key === 'ArrowUp') {
      // Ensure audio is allowed (first gesture)
      ensureAudioReady();
      const now = Date.now();
      const last = gameData.current.lastJumpTime || 0;
      const dt = now - last;
      gameData.current.lastJumpTime = now;

      if (gameState === GAME_STATES.PLAYING) {
        // Parachute system: Handle double-tap detection and parachute toggle
        if (gameData.current.parachuteActive) {
          // If parachute is active, remove it on any jump press
          gameData.current.parachuteActive = false;
          gameData.current.jumpTapCount = 0;
          // When parachute is removed, reset jump baseline to prevent immediate fall death
          gameData.current.jumpStartFeetY = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
          gameData.current.bigFallTriggered = false;
          console.log('🪂 Parachute removed - jump baseline reset');
        } else if (gameData.current.isJumping) {
          // Player is in air - check for horizontal movement jump or parachute
          const isMovingHorizontally = gameData.current.movementDirection !== 0 || 
                                       Math.abs(gameData.current.playerVelocityX || 0) > 10;
          
          if (isMovingHorizontally && gameData.current.jumpTapCount === 0) {
            // First jump press while moving horizontally - perform air jump
            const jumpDirection = gameData.current.movementDirection || 
                                (gameData.current.playerVelocityX > 0 ? 1 : -1);
            
            // Give upward velocity boost
            gameData.current.jumpVelocity = -8; // Strong upward impulse
            
            // Add horizontal boost in movement direction
            const horizontalBoost = 200; // px/s
            gameData.current.playerVelocityX += jumpDirection * horizontalBoost;
            gameData.current.facingDir = jumpDirection;
            
            gameData.current.jumpTapCount = 1;
            console.log('🚀 Air jump performed while moving horizontally');
            
          } else if (dt > 0 && dt <= 300) { // 300ms window for double-tap
            gameData.current.jumpTapCount++;
            if (gameData.current.jumpTapCount >= 2) {
              // Check if player is physically inside a lift cabin by checking horizontal position
              const currentIdx = gameData.current.currentShaftIndex || 0;
              const shaftX = getShaftXByIndex(currentIdx);
              const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
              const interiorLeft = liftX + 10; // 10px wall thickness
              const interiorRight = liftX + LIFT_WIDTH - 10;
              
              // Get player's absolute X position
              const playerAbsX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
              const playerCenterX = playerAbsX + PLAYER_WIDTH / 2;
              
              // Check if player center is within lift interior bounds
              const isInsideLift = (playerCenterX >= interiorLeft && playerCenterX <= interiorRight);
              
              if (isInsideLift) {
                // Cannot deploy parachute inside a lift
                console.log('🚫 Cannot deploy parachute inside a lift!');
                gameData.current.jumpTapCount = 0;
              } else {
                // Deploy parachute on double-tap
                gameData.current.parachuteActive = true;
                gameData.current.jumpTapCount = 0;
                // Reset fall distance when parachute is deployed to prevent death from long falls
                gameData.current.fallDistance = 0;
                gameData.current.bigFallTriggered = false;
                // Reset jump baseline to current position
                gameData.current.jumpStartFeetY = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
                playChuteSound(); // Play parachute deployment sound
                console.log('🪂 Parachute deployed - fall distance reset');
              }
            }
          } else {
            // Reset tap count if too much time passed
            gameData.current.jumpTapCount = 1;
          }
        } else {
          // Player is on ground - normal jump
          gameData.current.jumpTapCount = 0;
          handleJump();
        }
      } else if (gameState === GAME_STATES.MENU) {
        // Resume/create audio context on user interaction
        ensureAudioReady();
        setGameState(GAME_STATES.PLAYING);
        gameData.current.score = 0;
        gameData.current.level = 1;
        gameData.current.lives = 3;
        // Randomize platform spawn phases and densities for variety each new game (BEFORE fruit placement!)
        gameData.current.platformSpawnPhases = [
          Math.floor(Math.random() * 2),
          Math.floor(Math.random() * 2),
          Math.floor(Math.random() * 2),
          Math.floor(Math.random() * 2)
        ];
        gameData.current.platformSpawnDensity = [
          2 + Math.floor(Math.random() * 2),
          2 + Math.floor(Math.random() * 2),
          2 + Math.floor(Math.random() * 2),
          2 + Math.floor(Math.random() * 2)
        ];
        // Apply level 1 configuration
        applyLevelConfig(gameData.current, 1);
        initializeFruitPlacements(1);
        gameData.current.liftY = -LIFT_HEIGHT;
        gameData.current.leftLiftY = -LIFT_HEIGHT;
        gameData.current.rightLiftY = -LIFT_HEIGHT;
        gameData.current.centerLiftDir = 1;
        gameData.current.leftLiftDir = 1;
        gameData.current.rightLiftDir = 1;
        randomizeSideLiftSpeeds();
        gameData.current.fallDistance = 0;
        gameData.current.isJumping = false;
        gameData.current.playerY = getGroundPlayerYByIndex(0); // Start on ground for center column
        gameData.current.playerX = 0; // Start at center of cage
        gameData.current.playerVelocityX = 0; // No initial horizontal movement
        gameData.current.animationFrame = 0; // Reset animation
        gameData.current.animationTimer = 0; // Reset animation timer
        gameData.current.movementDirection = 0; // Reset movement direction
        gameData.current.bodyParts = [];
        gameData.current.bloodSplatters = [];
        gameData.current.deathAnimation = 0;
        gameData.current.perfectJump = false;
        gameData.current.jumpGracePeriod = 0;
        gameData.current.survivedImpact = false;
        gameData.current.hitCeiling = false;
        gameData.current.wasJumpingAtImpact = false;
        gameData.current.previousFloor = 30; // Reset floor tracking
        gameData.current.wrapModeEnabled = false;
        gameData.current.cycleIndex = 0;
        gameData.current.forceMaxSpeed = false;
        // Reset parachute for new game
        gameData.current.parachuteActive = false;
        gameData.current.jumpTapCount = 0;
        // Golden keys
        gameData.current.goldenKeys = 0;
        gameData.current.leftKeyCollected = false;
        gameData.current.centerKeyCollected = false;
        gameData.current.rightKeyCollected = false;
        gameData.current.platformCherriesCollected = new Set();
        // Reset levers and doors
        gameData.current.redLeverTriggered = false;
        logPlatformConfig();
        // Ensure platforms auto-move at level start
        gameData.current.blueLeverTriggered = false;
        gameData.current.yellowLeverTriggered = false;
        gameData.current.centerKeyCollected = false;
        gameData.current.centerDoorLeftOpen = false;
        gameData.current.centerDoorRightOpen = false;
        gameData.current.leftLiftDoorRightOpen = false;
        gameData.current.leftLiftDoorLeftOpen = false;
        gameData.current.rightLiftDoorLeftOpen = false;
        gameData.current.rightLiftDoorRightOpen = false;
        // Reset door animation progress
        gameData.current.doorOpenProgress = {
          centerLeft: 0,
          centerRight: 0,
          leftLeft: 0,
          leftRight: 0,
          rightLeft: 0,
          rightRight: 0
        };
        gameData.current.currentShaftIndex = 0;
        initializeShaftMarkers();
        // Ensure UFO sound is stopped when starting game
        if (ufoSoundRef.current) {
          ufoSoundRef.current.pause();
          ufoSoundRef.current.currentTime = 0;
        }
        playLevelSound(); // Play level sound at start of level 1
      } else if (gameState === GAME_STATES.PLAYING) {
        handleJump();
      } else if (gameState === GAME_STATES.DEAD) {
        setGameState(GAME_STATES.MENU);
      }
    }

    // Toggle stickman color between white and black
    if (event.key === 'c' || event.key === 'C') {
      gameData.current.stickmanColor = gameData.current.stickmanColor === 'white' ? 'black' : 'white';
    }
    
    // Dev hotkeys: 1-9 to jump to levels 1-9, 0 to cycle through levels 10-15, q-u for levels 11-15
    if (gameState === GAME_STATES.PLAYING && ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 'r', 't'].includes(event.key)) {
      let targetLevel;
      if (event.key === '0') {
        // Cycle through levels 10-15 with '0' key
        if (!gameData.current.zeroKeyCycleLevel || gameData.current.zeroKeyCycleLevel < 10 || gameData.current.zeroKeyCycleLevel > 15) {
          gameData.current.zeroKeyCycleLevel = 10; // Initialize to level 10
        }
        targetLevel = gameData.current.zeroKeyCycleLevel;
        // Increment for next press: 10->11->12->13->14->15->10
        gameData.current.zeroKeyCycleLevel = (gameData.current.zeroKeyCycleLevel % 15) + 1;
        if (gameData.current.zeroKeyCycleLevel < 10) {
          gameData.current.zeroKeyCycleLevel = 10; // Wrap back to 10
        }
      } else if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(event.key)) {
        targetLevel = parseInt(event.key);
      } else {
        // q=11, w=12, e=13, r=14, t=15
        const levelMap = { 'q': 11, 'w': 12, 'e': 13, 'r': 14, 't': 15 };
        targetLevel = levelMap[event.key];
      }
      console.log('DEV: Jumping to level', targetLevel);
      try {
        gameData.current.level = targetLevel;
      // Reset level state
      gameData.current.liftY = -LIFT_HEIGHT;
      gameData.current.leftLiftY = -LIFT_HEIGHT;
      gameData.current.rightLiftY = -LIFT_HEIGHT;
      gameData.current.centerLiftDir = 1;
      gameData.current.leftLiftDir = 1;
      gameData.current.rightLiftDir = 1;
      gameData.current.fallDistance = 0;
      gameData.current.isJumping = false;
      gameData.current.playerY = getGroundPlayerYByIndex(0);
      gameData.current.playerX = 0;
      gameData.current.playerVelocityX = 0;
      gameData.current.animationFrame = 0;
      gameData.current.animationTimer = 0;
      gameData.current.movementDirection = 0;
      gameData.current.bodyParts = [];
      gameData.current.bloodSplatters = [];
      gameData.current.onOutsidePlatform = false;
      gameData.current.outsidePlatformCol = -1;
      gameData.current.jumpDirection = 0;
      gameData.current.hitCeiling = false;
      gameData.current.jumpGracePeriod = 0;
      gameData.current.jumpCooldown = 0;
      gameData.current.previousFloor = 30;
      gameData.current.survivedImpact = false;
      gameData.current.wasJumpingAtImpact = false;
      gameData.current.redLeverTriggered = false;
      gameData.current.blueLeverTriggered = false;
      gameData.current.yellowLeverTriggered = false;
      gameData.current.centerDoorLeftOpen = false;
      gameData.current.centerDoorRightOpen = false;
      gameData.current.leftLiftDoorRightOpen = false;
      gameData.current.leftLiftDoorLeftOpen = false;
      gameData.current.rightLiftDoorLeftOpen = false;
      gameData.current.rightLiftDoorRightOpen = false;
      gameData.current.doorOpenProgress = {
        centerLeft: 0,
        centerRight: 0,
        leftLeft: 0,
        leftRight: 0,
        rightLeft: 0,
        rightRight: 0
      };
      gameData.current.currentShaftIndex = 0;
      gameData.current.platformCherriesCollected = new Set();
      gameData.current.goldenKeys = 0;
      
      // Apply level configuration for target level (this will set cherry collection states)
      applyLevelConfig(gameData.current, targetLevel);
      
      // Set platform spawn phases and density before initializing fruit placements
      gameData.current.platformSpawnPhases = [
        Math.floor(Math.random() * 2),
        Math.floor(Math.random() * 2),
        Math.floor(Math.random() * 2),
        Math.floor(Math.random() * 2)
      ];
      gameData.current.platformSpawnDensity = [
        2 + Math.floor(Math.random() * 2),
        2 + Math.floor(Math.random() * 2),
        2 + Math.floor(Math.random() * 2),
        2 + Math.floor(Math.random() * 2)
      ];
      
      // Initialize fruit placements for the target level
      console.log(`DEV: Initializing fruits for level ${targetLevel}`);
      initializeFruitPlacements(targetLevel);
      initializeShaftMarkers();
      logPlatformConfig();
      calculateDynamicSpeed();
      randomizeSideLiftSpeeds();
      } catch (error) {
        console.error('ERROR: Failed to switch to level', targetLevel, error);
        console.error('Error stack:', error.stack);
      }
    }
  }, [gameState, handleJump, initializeShaftMarkers, randomizeSideLiftSpeeds, saveSnapshot, loadSnapshot, initializeFruitPlacements, logPlatformConfig, calculateDynamicSpeed, playLevelSound, playChuteSound]);


  const handleKeyUp = useCallback((event) => {
    const key = event.key;
    const lowerKey = typeof key === 'string' ? key.toLowerCase() : key;

    gameData.current.keys[key] = false;
    if (lowerKey && lowerKey !== key) {
      gameData.current.keys[lowerKey] = false;
    }

    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(lowerKey) || lowerKey === 'a' || lowerKey === 'd' || key === ' ') {
      event.preventDefault();
    }
  }, []);

  // Handle dial interaction
  const handleDialClick = useCallback((e) => {
    const canvas = dialCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Calculate angle from center
    const dx = canvasX - centerX;
    const dy = canvasY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if click is within dial area
    if (distance < 50 && distance > 10) {
      let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (angle < -90) angle += 360;
      
      // Snap to nearest scale option
      let bestIndex = 0;
      let bestDiff = 360;
      
      SCALE_OPTIONS.forEach((_, index) => {
        const targetAngle = (index - 2) * 45;
        const diff = Math.abs(angle - targetAngle);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = index;
        }
      });
      
      // Set the new scale
      setUiScale(SCALE_OPTIONS[bestIndex]);
      playSound('lever'); // Use lever sound for dial click
      drawDialCanvas();
    }
  }, [setUiScale, drawDialCanvas, playSound]);
  
  const handleDialMouseMove = useCallback((e) => {
    const canvas = dialCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = canvasX - centerX;
    const dy = canvasY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Update hover state
    const wasHovering = dialAnimationRef.current.hoverState;
    dialAnimationRef.current.hoverState = distance < 33 && distance > 7; // Adjusted for smaller dial
    
    if (wasHovering !== dialAnimationRef.current.hoverState) {
      drawDialCanvas();
    }
    
    // Change cursor when hovering
    canvas.style.cursor = dialAnimationRef.current.hoverState ? 'pointer' : 'default';
  }, [drawDialCanvas]);

  // Handle touch controls for mobile controls canvas
const handleTouch = useCallback(async (event) => {
    event.preventDefault();
    await ensureAudioReady();
    
    if (gameState === GAME_STATES.MENU) {
      setGameState(GAME_STATES.PLAYING);
      gameData.current.score = 0;
      gameData.current.level = 1;
      // Apply level 1 configuration
      applyLevelConfig(gameData.current, 1);
      // Randomize platform spawn phases for variety
      gameData.current.platformSpawnPhases = [
        Math.floor(Math.random() * 2),
        Math.floor(Math.random() * 2),
        Math.floor(Math.random() * 2),
        Math.floor(Math.random() * 2)
      ];
      logPlatformConfig();
      // Ensure platforms auto-move at level start
      gameData.current.lives = 20;
      gameData.current.baseLiftSpeed = 2; // Will be recalculated based on level
      gameData.current.currentLiftSpeed = 2;
      gameData.current.liftY = -LIFT_HEIGHT;
      gameData.current.leftLiftY = -LIFT_HEIGHT;
      gameData.current.rightLiftY = -LIFT_HEIGHT;
      gameData.current.centerLiftDir = 1;
      gameData.current.leftLiftDir = 1;
      gameData.current.rightLiftDir = 1;
      randomizeSideLiftSpeeds();
      gameData.current.fallDistance = 0;
      gameData.current.isJumping = false;
        gameData.current.playerY = getGroundPlayerYByIndex(0); // Calculate relative to ground
      gameData.current.playerX = 0; // Start at center of cage
      gameData.current.playerVelocityX = 0; // No initial horizontal movement
      gameData.current.bodyParts = [];
      gameData.current.bloodSplatters = [];
      gameData.current.deathAnimation = 0;
      gameData.current.perfectJump = false;
      gameData.current.jumpGracePeriod = 0;
      gameData.current.survivedImpact = false;
      gameData.current.hitCeiling = false;
      gameData.current.wasJumpingAtImpact = false;
      gameData.current.previousFloor = 30; // Reset floor tracking
      gameData.current.wrapModeEnabled = false;
      gameData.current.cycleIndex = 0;
      gameData.current.forceMaxSpeed = false;
      // Reset parachute for new game
      gameData.current.parachuteActive = false;
      gameData.current.jumpTapCount = 0;
      // Golden keys
      gameData.current.goldenKeys = 0;
      gameData.current.leftKeyCollected = false;
      gameData.current.rightKeyCollected = false;
      // Reset levers and doors
      gameData.current.redLeverTriggered = false;
      gameData.current.blueLeverTriggered = false;
      gameData.current.centerDoorLeftOpen = false;
      gameData.current.centerDoorRightOpen = false;
      gameData.current.leftLiftDoorRightOpen = false;
      gameData.current.rightLiftDoorLeftOpen = false;
      gameData.current.currentShaftIndex = 0;
      initializeShaftMarkers();
      // Ensure UFO sound is stopped when starting game
      if (ufoSoundRef.current) {
        ufoSoundRef.current.pause();
        ufoSoundRef.current.currentTime = 0;
      }
    } else if (gameState === GAME_STATES.PLAYING) {
      // Handle touch-based movement and jumping
      const canvas = canvasRef.current;
      if (canvas && event.touches && event.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        // Scale touch coordinates to canvas coordinates
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const canvasX = touchX * scaleX;
        const canvasY = touchY * scaleY;
        
        // Determine action based on touch position
        const centerX = CANVAS_WIDTH / 2;
        const upperThird = CANVAS_HEIGHT / 3;
        
        if (canvasY < upperThird) {
          // Upper third: Jump
          handleJump();
        } else {
          // Lower two-thirds: Move left or right
          if (canvasX < centerX - 50) {
            // Left side: move left
            gameData.current.keys['ArrowLeft'] = true;
            gameData.current.keys['ArrowRight'] = false;
          } else if (canvasX > centerX + 50) {
            // Right side: move right
            gameData.current.keys['ArrowRight'] = true;
            gameData.current.keys['ArrowLeft'] = false;
          }
        }
      } else {
        // Simple tap for jump (fallback)
        handleJump();
      }
    } else if (gameState === GAME_STATES.DEAD) {
      setGameState(GAME_STATES.MENU);
    }
  }, [gameState, handleJump, initializeShaftMarkers, randomizeSideLiftSpeeds]);

  // Handle touch end to stop movement
  const handleTouchEnd = useCallback((event) => {
    event.preventDefault();
    // Stop horizontal movement when touch ends
    gameData.current.keys['ArrowLeft'] = false;
    gameData.current.keys['ArrowRight'] = false;
  }, []);

  // Handle touch move to prevent scrolling and maintain button states
  const handleControlsTouchMove = useCallback((event) => {
    event.preventDefault(); // Prevent scrolling while touching controls
    // Keep the current button states active during move
  }, []);

  // Handle touch controls for mobile controls canvas
  const handleControlsTouch = useCallback(async (event) => {
    event.preventDefault();
    const canvas = controlsCanvasRef.current;
    if (!canvas || !event.touches || event.touches.length === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = touchX * scaleX;
    const canvasY = touchY * scaleY;
    
    // Use same size multiplier as drawing code
    const device = detectDeviceType();
    const isMobileOrTablet = device.isMobile || device.isTablet;
    const sizeMultiplier = isMobileOrTablet ? 2 : 1;
    
    // Increase button hit areas for better mobile sensitivity
    const leftRadius = 35 * sizeMultiplier;  // Increased from 28 for better touch detection
    const rightRadius = 35 * sizeMultiplier; // Increased from 28 for better touch detection
    const jumpRadius = 45 * sizeMultiplier;  // Increased from 38 for better touch detection
    const spacing = 18 * sizeMultiplier;
    const centerX = canvas.width / 2;
    const buttonY = canvas.height / 2;

    const leftButtonX = centerX - (jumpRadius + spacing + leftRadius);
    const jumpButtonX = centerX;
    const rightButtonX = centerX + (jumpRadius + spacing + rightRadius);
    
    const distToLeft = Math.sqrt((canvasX - leftButtonX) ** 2 + (canvasY - buttonY) ** 2);
    const distToRight = Math.sqrt((canvasX - rightButtonX) ** 2 + (canvasY - buttonY) ** 2);
    const distToJump = Math.sqrt((canvasX - jumpButtonX) ** 2 + (canvasY - buttonY) ** 2);
    
    console.log('🎮 Controls Touch:', { canvasX, canvasY, distToLeft, distToRight, distToJump, leftRadius, rightRadius, jumpRadius });
    
    if (distToLeft <= leftRadius) {
      console.log('⬅️ LEFT button pressed');
      gameData.current.keys['ArrowLeft'] = true;
      gameData.current.keys['ArrowRight'] = false;
    } else if (distToRight <= rightRadius) {
      console.log('➡️ RIGHT button pressed');
      gameData.current.keys['ArrowRight'] = true;
      gameData.current.keys['ArrowLeft'] = false;
    } else if (distToJump <= jumpRadius) {
      console.log('🔴 JUMP button pressed');
      if (gameState === GAME_STATES.PLAYING) {
        // Implement parachute deployment logic (same as keyboard)
        await ensureAudioReady();
        const now = Date.now();
        const last = gameData.current.lastJumpTime || 0;
        const dt = now - last;
        gameData.current.lastJumpTime = now;
        
        // Parachute system: Handle double-tap detection and parachute toggle
        if (gameData.current.parachuteActive) {
          // If parachute is active, remove it on any jump press
          gameData.current.parachuteActive = false;
          gameData.current.jumpTapCount = 0;
          // When parachute is removed, reset jump baseline to prevent immediate fall death
          gameData.current.jumpStartFeetY = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
          gameData.current.bigFallTriggered = false;
          console.log('🪂 Parachute removed - jump baseline reset');
        } else if (gameData.current.isJumping) {
          // Player is in air - check for horizontal movement jump or parachute
          const isMovingHorizontally = gameData.current.movementDirection !== 0 || 
                                       Math.abs(gameData.current.playerVelocityX || 0) > 10;
          
          if (isMovingHorizontally && gameData.current.jumpTapCount === 0) {
            // First jump press while moving horizontally - perform air jump
            const jumpDirection = gameData.current.movementDirection || 
                                (gameData.current.playerVelocityX > 0 ? 1 : -1);
            
            // Give upward velocity boost
            gameData.current.jumpVelocity = -4.5;
            
            // Add horizontal boost in movement direction
            const horizontalBoost = 200; // px/s
            gameData.current.playerVelocityX += jumpDirection * horizontalBoost;
            gameData.current.facingDir = jumpDirection;
            
            gameData.current.jumpTapCount = 1;
            console.log('🚀 Air jump performed while moving horizontally');
            
          } else if (dt > 0 && dt <= 600) { // Increased to 600ms for better mobile double-tap detection
            gameData.current.jumpTapCount++;
            if (gameData.current.jumpTapCount >= 2) {
              // Check if player is physically inside a lift cabin by checking horizontal position
              const currentIdx = gameData.current.currentShaftIndex || 0;
              const shaftX = getShaftXByIndex(currentIdx);
              const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
              const interiorLeft = liftX + 10; // 10px wall thickness
              const interiorRight = liftX + LIFT_WIDTH - 10;
              const playerCenterX = gameData.current.playerX + PLAYER_WIDTH / 2;
              
              // Check if player center is within lift interior bounds
              const isInsideLift = (playerCenterX >= interiorLeft && playerCenterX <= interiorRight);
              
              if (isInsideLift) {
                // Cannot deploy parachute inside a lift
                console.log('🚫 Cannot deploy parachute inside a lift!');
                gameData.current.jumpTapCount = 0;
              } else {
                // Deploy parachute on double-tap
                gameData.current.parachuteActive = true;
                gameData.current.jumpTapCount = 0;
                // Reset fall distance when parachute is deployed to prevent death from long falls
                gameData.current.fallDistance = 0;
                gameData.current.bigFallTriggered = false;
                // Reset jump baseline to current position
                gameData.current.jumpStartFeetY = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
                playChuteSound(); // Play parachute deployment sound
                console.log('🪂 Parachute deployed - fall distance reset');
              }
            }
          } else {
            // Reset tap count if too much time passed
            gameData.current.jumpTapCount = 1;
          }
        } else {
          // Player is on ground - normal jump
          gameData.current.jumpTapCount = 0;
          handleJump();
        }
      }
    } else {
      console.log('❌ Touch outside button areas');
    }
  }, [gameState, handleJump, ensureAudioReady, playChuteSound, getShaftXByIndex]);

  const handleControlsTouchEnd = useCallback((event) => {
    event.preventDefault();
    gameData.current.keys['ArrowLeft'] = false;
    gameData.current.keys['ArrowRight'] = false;
  }, []);

  const handleControlsMouseDown = useCallback(async (event) => {
    event.preventDefault();
    const canvas = controlsCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = mouseX * scaleX;
    const canvasY = mouseY * scaleY;
    
    // Use same size multiplier as drawing code
    const device = detectDeviceType();
    const isMobileOrTablet = device.isMobile || device.isTablet;
    const sizeMultiplier = isMobileOrTablet ? 2 : 1;
    
    // Increase button hit areas for better mobile sensitivity (consistent with touch)
    const leftRadius = 35 * sizeMultiplier;  // Increased from 28 for better detection
    const rightRadius = 35 * sizeMultiplier; // Increased from 28 for better detection
    const jumpRadius = 45 * sizeMultiplier;  // Increased from 38 for better detection
    const spacing = 18 * sizeMultiplier;
    const centerX = canvas.width / 2;
    const buttonY = canvas.height / 2;

    const leftButtonX = centerX - (jumpRadius + spacing + leftRadius);
    const jumpButtonX = centerX;
    const rightButtonX = centerX + (jumpRadius + spacing + rightRadius);
    
    const distToLeft = Math.sqrt((canvasX - leftButtonX) ** 2 + (canvasY - buttonY) ** 2);
    const distToRight = Math.sqrt((canvasX - rightButtonX) ** 2 + (canvasY - buttonY) ** 2);
    const distToJump = Math.sqrt((canvasX - jumpButtonX) ** 2 + (canvasY - buttonY) ** 2);
    
    if (distToLeft <= leftRadius) {
      gameData.current.keys['ArrowLeft'] = true;
      gameData.current.keys['ArrowRight'] = false;
    } else if (distToRight <= rightRadius) {
      gameData.current.keys['ArrowRight'] = true;
      gameData.current.keys['ArrowLeft'] = false;
    } else if (distToJump <= jumpRadius) {
      if (gameState === GAME_STATES.PLAYING) {
        // Implement parachute deployment logic (same as keyboard and touch)
        ensureAudioReady();
        const now = Date.now();
        const last = gameData.current.lastJumpTime || 0;
        const dt = now - last;
        gameData.current.lastJumpTime = now;
        
        // Parachute system: Handle double-tap detection and parachute toggle
        if (gameData.current.parachuteActive) {
          // If parachute is active, remove it on any jump press
          gameData.current.parachuteActive = false;
          gameData.current.jumpTapCount = 0;
          // When parachute is removed, reset jump baseline to prevent immediate fall death
          gameData.current.jumpStartFeetY = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
          gameData.current.bigFallTriggered = false;
          console.log('🪂 Parachute removed - jump baseline reset');
        } else if (gameData.current.isJumping) {
          // Player is in air - check for horizontal movement jump or parachute
          const isMovingHorizontally = gameData.current.movementDirection !== 0 || 
                                       Math.abs(gameData.current.playerVelocityX || 0) > 10;
          
          if (isMovingHorizontally && gameData.current.jumpTapCount === 0) {
            // First jump press while moving horizontally - perform air jump
            const jumpDirection = gameData.current.movementDirection || 
                                (gameData.current.playerVelocityX > 0 ? 1 : -1);
            
            // Give upward velocity boost
            gameData.current.jumpVelocity = -4.5;
            
            // Add horizontal boost in movement direction
            const horizontalBoost = 200; // px/s
            gameData.current.playerVelocityX += jumpDirection * horizontalBoost;
            gameData.current.facingDir = jumpDirection;
            
            gameData.current.jumpTapCount = 1;
            console.log('🚀 Air jump performed while moving horizontally');
            
          } else if (dt > 0 && dt <= 600) { // Increased to 600ms for better mobile double-tap detection
            gameData.current.jumpTapCount++;
            if (gameData.current.jumpTapCount >= 2) {
              // Check if player is physically inside a lift cabin by checking horizontal position
              const currentIdx = gameData.current.currentShaftIndex || 0;
              const shaftX = getShaftXByIndex(currentIdx);
              const liftX = shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
              const interiorLeft = liftX + 10; // 10px wall thickness
              const interiorRight = liftX + LIFT_WIDTH - 10;
              const playerCenterX = gameData.current.playerX + PLAYER_WIDTH / 2;
              
              // Check if player center is within lift interior bounds
              const isInsideLift = (playerCenterX >= interiorLeft && playerCenterX <= interiorRight);
              
              if (isInsideLift) {
                // Cannot deploy parachute inside a lift
                console.log('🚫 Cannot deploy parachute inside a lift!');
                gameData.current.jumpTapCount = 0;
              } else {
                // Deploy parachute on double-tap
                gameData.current.parachuteActive = true;
                gameData.current.jumpTapCount = 0;
                // Reset fall distance when parachute is deployed to prevent death from long falls
                gameData.current.fallDistance = 0;
                gameData.current.bigFallTriggered = false;
                // Reset jump baseline to current position
                gameData.current.jumpStartFeetY = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
                playChuteSound(); // Play parachute deployment sound
                console.log('🪂 Parachute deployed - fall distance reset');
              }
            }
          } else {
            // Reset tap count if too much time passed
            gameData.current.jumpTapCount = 1;
          }
        } else {
          // Player is on ground - normal jump
          gameData.current.jumpTapCount = 0;
          handleJump();
        }
      }
    }
  }, [gameState, handleJump, ensureAudioReady, playChuteSound, getShaftXByIndex]);

  const handleControlsMouseUp = useCallback((event) => {
    event.preventDefault();
    gameData.current.keys['ArrowLeft'] = false;
    gameData.current.keys['ArrowRight'] = false;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS SYSTEM REWRITE
  // ═══════════════════════════════════════════════════════════════════════════
  // This physics system calculates exact locations of all game elements and
  // enforces realistic movement rules:
  //
  // 1. SOLID SURFACES: The stickman can only walk on:
  //    - Lift floors (inside lift cabins)
  //    - Lift top caps (small platforms on top of lifts)
  //    - Moving platforms (in gutters and gaps between lifts)
  //
  // 2. AUTOMATIC FALLING: The stickman automatically falls when:
  //    - Both feet are not fully supported by a surface
  //    - He walks/jumps off the edge of a platform
  //    - He steps into empty space
  //
  // 3. WALL COLLISION: The stickman cannot walk through:
  //    - Closed lift doors (left and right walls)
  //    - Walls block movement unless doors are open
  //
  // 4. REALISTIC PHYSICS:
  //    - Gravity always pulls the stickman down
  //    - Jumping gives upward velocity that gravity counters
  //    - Landing requires full foot support on a surface
  //    - No walking on air or floating
  // ═══════════════════════════════════════════════════════════════════════════
  
  // PHYSICS HELPERS: Calculate exact positions of all solid surfaces
  
  // Get all solid surfaces (floors and platforms) that the stickman can stand on
  const getAllSolidSurfaces = () => {
    const surfaces = [];
    const { left: leftShaftX, center: centerShaftX, right: rightShaftX } = getShaftPositions();
    
    // 1. Lift floors (inside each lift cabin)
    const lifts = [
      { idx: -1, shaftX: leftShaftX, topY: gameData.current.leftLiftY },
      { idx: 0, shaftX: centerShaftX, topY: gameData.current.liftY },
      { idx: 1, shaftX: rightShaftX, topY: gameData.current.rightLiftY }
    ];
    
    lifts.forEach(lift => {
      const liftX = lift.shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
      const floorTop = lift.topY + LIFT_HEIGHT - 10;
      const interiorLeft = liftX + 10;
      const interiorRight = liftX + LIFT_WIDTH - 10;
      surfaces.push({
        type: 'lift_floor',
        left: interiorLeft,
        right: interiorRight,
        top: floorTop,
        liftIndex: lift.idx
      });
    });
    
    // 2. Lift top caps (small platforms on top of each lift)
    lifts.forEach(lift => {
      const liftX = lift.shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
      const capLeft = liftX + TOP_PLATFORM_PAD;
      const capRight = capLeft + (LIFT_WIDTH - TOP_PLATFORM_PAD * 2);
      const capTop = lift.topY - TOP_PLATFORM_HEIGHT;
      surfaces.push({
        type: 'lift_cap',
        left: capLeft,
        right: capRight,
        top: capTop,
        liftIndex: lift.idx
      });
    });
    
    // 3. Moving platforms (outside gutters and mid gaps)
    const leftGutterCenter = Math.max(16, leftShaftX - 30);
    const rightGutterCenter = Math.min(CANVAS_WIDTH - 16, rightShaftX + SHAFT_WIDTH + 30);
    const midLeftCenter = leftShaftX + SHAFT_WIDTH + SHAFT_GAP / 2;
    const midRightCenter = centerShaftX + SHAFT_WIDTH + SHAFT_GAP / 2;
    const OUT_PLATFORM_WIDTH = Math.floor(LIFT_WIDTH * 0.45);
    const MID_PLATFORM_WIDTH = Math.min(Math.floor(LIFT_WIDTH * 0.35), SHAFT_GAP - 20);
    const PLATFORM_HEIGHT = 10;
    const phases = gameData.current.platformSpawnPhases || [0, 1, 0, 1];
    const densities = gameData.current.platformSpawnDensity || [2, 2, 2, 2];
    
    const columns = [
      { cx: leftGutterCenter, w: OUT_PLATFORM_WIDTH, col: 0 },
      { cx: rightGutterCenter, w: OUT_PLATFORM_WIDTH, col: 1 },
      { cx: midLeftCenter, w: MID_PLATFORM_WIDTH, col: 2 },
      { cx: midRightCenter, w: MID_PLATFORM_WIDTH, col: 3 }
    ];
    
    gameData.current.shaftLines.forEach((line, idx) => {
      columns.forEach(col => {
        const phase = phases[col.col] || 0;
        const density = Math.max(1, densities[col.col] || 2);
        if (((idx + phase) % density) !== 0) return;
        
        const px = Math.round(col.cx - col.w / 2);
        const py = Math.round(line.y); // Static platforms
        surfaces.push({
          type: 'platform',
          left: px,
          right: px + col.w,
          top: py,
          platformCol: col.col,
          lineIndex: idx
        });
      });
    });
    
    return surfaces;
  };
  
  // Get all walls (lift sides) that block horizontal movement
  const getAllWalls = () => {
    const walls = [];
    const { left: leftShaftX, center: centerShaftX, right: rightShaftX } = getShaftPositions();
    const alignThresh = 30;
    
    const lifts = [
      { idx: -1, shaftX: leftShaftX, topY: gameData.current.leftLiftY },
      { idx: 0, shaftX: centerShaftX, topY: gameData.current.liftY },
      { idx: 1, shaftX: rightShaftX, topY: gameData.current.rightLiftY }
    ];
    
    lifts.forEach(lift => {
      const liftX = lift.shaftX + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
      const liftBottom = lift.topY + LIFT_HEIGHT;
      
      // Check if doors are FULLY open (animation progress must be >= 0.9)
      const currentIdx = gameData.current.currentShaftIndex || 0;
      const doorProgress = gameData.current.doorOpenProgress || {};
      
      const leftDoorOpen = (
        (lift.idx === 0 && gameData.current.centerDoorLeftOpen && (doorProgress.centerLeft || 0) >= 0.9) ||
        (lift.idx === -1 && gameData.current.leftLiftDoorLeftOpen && (doorProgress.leftLeft || 0) >= 0.9) ||
        (lift.idx === 1 && gameData.current.rightLiftDoorLeftOpen && (doorProgress.rightLeft || 0) >= 0.9)
      );
      const rightDoorOpen = (
        (lift.idx === 0 && gameData.current.centerDoorRightOpen && (doorProgress.centerRight || 0) >= 0.9) ||
        (lift.idx === -1 && gameData.current.leftLiftDoorRightOpen && (doorProgress.leftRight || 0) >= 0.9) ||
        (lift.idx === 1 && gameData.current.rightLiftDoorRightOpen && (doorProgress.rightRight || 0) >= 0.9)
      );
      
      // Left wall (if door is not fully open)
      if (!leftDoorOpen) {
        walls.push({
          type: 'left_wall',
          x: liftX + 10,
          top: lift.topY,
          bottom: liftBottom,
          liftIndex: lift.idx
        });
      }
      
      // Right wall (if door is not fully open)
      if (!rightDoorOpen) {
        walls.push({
          type: 'right_wall',
          x: liftX + LIFT_WIDTH - 10,
          top: lift.topY,
          bottom: liftBottom,
          liftIndex: lift.idx
        });
      }
    });
    
    return walls;
  };
  
  // Check if player's feet are on solid ground
  const checkPlayerHasGroundSupport = () => {
    const surfaces = getAllSolidSurfaces();
    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftXForPlayer = getShaftXByIndex(currentIdx);
    const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
    const playerLeft = absPlayerCenterX - PLAYER_WIDTH / 2;
    const playerRight = absPlayerCenterX + PLAYER_WIDTH / 2;
    const feetY = gameData.current.playerY + PLAYER_HEIGHT;
    
    // Check each surface for support
    for (const surface of surfaces) {
      // Require significant foot support (platforms can tolerate a bit less due to motion)
      const overlapWidth = Math.min(playerRight, surface.right) - Math.max(playerLeft, surface.left);
      const requiredOverlap = surface.type === 'platform' ? (PLAYER_WIDTH * 0.5) : (PLAYER_WIDTH * 0.7);
      const feetFullyOnSurface = overlapWidth >= requiredOverlap;
      // Check vertical alignment (feet should be at or very close to the expected standing height over this surface)
      const expectedFeetY = surface.type === 'lift_floor'
        ? (surface.top - (FOOT_CLEARANCE + FLOOR_EXTRA_CLEARANCE))
        : (surface.top - FOOT_CLEARANCE);
      const tolerance = surface.type === 'platform' ? 6 : 3;
      const feetOnTop = Math.abs(feetY - expectedFeetY) <= tolerance;
      
      if (feetFullyOnSurface && feetOnTop) {
        // Found solid ground!
        if (surface.type === 'lift_floor') {
          // Only change shaft index if significantly different (prevent shaking from small fluctuations)
          if (surface.liftIndex !== currentIdx) {
            // Only switch shafts if the player has moved significantly
            const distanceFromCenter = Math.abs(gameData.current.playerX);
            if (distanceFromCenter > PLAYER_WIDTH) {
              gameData.current.currentShaftIndex = surface.liftIndex;
            }
          }
          gameData.current.onOutsidePlatform = false;
          gameData.current.onTopOfLift = false;
        } else if (surface.type === 'lift_cap') {
          // Only change shaft index if significantly different
          if (surface.liftIndex !== currentIdx) {
            const distanceFromCenter = Math.abs(gameData.current.playerX);
            if (distanceFromCenter > PLAYER_WIDTH) {
              gameData.current.currentShaftIndex = surface.liftIndex;
            }
          }
          gameData.current.onOutsidePlatform = false;
          gameData.current.onTopOfLift = true;
        } else if (surface.type === 'platform') {
          gameData.current.onOutsidePlatform = true;
          gameData.current.onTopOfLift = false;
          gameData.current.outsidePlatformCol = surface.platformCol;
          gameData.current.ridingPlatformLineIndex = surface.lineIndex;
          gameData.current.ridingPlatformCol = surface.platformCol;
          console.log(`Player landed on platform: lineIndex=${surface.lineIndex}, platformCol=${surface.platformCol}`);
        }
        return true;
      }
    }
    
    return false;
  };
  
  // Check if player will collide with a wall when moving horizontally
  const checkWallCollision = (newPlayerX) => {
    const walls = getAllWalls();
    const currentIdx = gameData.current.currentShaftIndex || 0;
    const shaftXForPlayer = getShaftXByIndex(currentIdx);
    const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + newPlayerX + PLAYER_WIDTH / 2;
    const playerLeft = absPlayerCenterX - PLAYER_WIDTH / 2;
    const playerRight = absPlayerCenterX + PLAYER_WIDTH / 2;
    const playerTop = gameData.current.playerY;
    const playerBottom = playerTop + PLAYER_HEIGHT;
    
    for (const wall of walls) {
      // Check walls for current lift AND adjacent lifts (to prevent going through closed doors)
      // Current lift walls
      const isCurrentLift = wall.liftIndex === currentIdx;
      
      // Adjacent lift walls (check if player is near the boundary and trying to enter)
      const isLeftAdjacentLift = (currentIdx === 0 && wall.liftIndex === -1); // In center, checking left lift
      const isRightAdjacentLift = (currentIdx === 0 && wall.liftIndex === 1); // In center, checking right lift
      const isCenterFromLeft = (currentIdx === -1 && wall.liftIndex === 0); // In left, checking center
      const isCenterFromRight = (currentIdx === 1 && wall.liftIndex === 0); // In right, checking center
      
      const shouldCheckWall = isCurrentLift || isLeftAdjacentLift || isRightAdjacentLift || 
                               isCenterFromLeft || isCenterFromRight;
      
      if (!shouldCheckWall) continue;
      
      // Check vertical overlap (is player at the same height as the wall?)
      const verticalOverlap = (playerBottom > wall.top && playerTop < wall.bottom);
      if (!verticalOverlap) continue;
      
      // Check horizontal collision
      if (wall.type === 'left_wall' && playerLeft <= wall.x) {
        return { collision: true, type: 'left', wallX: wall.x };
      }
      if (wall.type === 'right_wall' && playerRight >= wall.x) {
        return { collision: true, type: 'right', wallX: wall.x };
      }
    }
    
    return { collision: false };
  };
  
  // Smoothly animate door openings toward their target state each frame
  const updateDoorProgress = () => {
    const speed = 0.12; // opening speed per frame
    const p = gameData.current.doorOpenProgress;
    if (!p) return;
    const targets = {
      centerLeft: gameData.current.centerDoorLeftOpen ? 1 : 0,
      centerRight: gameData.current.centerDoorRightOpen ? 1 : 0,
      leftLeft: gameData.current.leftLiftDoorLeftOpen ? 1 : 0,
      leftRight: gameData.current.leftLiftDoorRightOpen ? 1 : 0,
      rightLeft: gameData.current.rightLiftDoorLeftOpen ? 1 : 0,
      rightRight: gameData.current.rightLiftDoorRightOpen ? 1 : 0
    };
    Object.keys(targets).forEach(k => {
      const t = targets[k];
      const v = p[k] || 0;
      if (v < t) p[k] = Math.min(t, v + speed);
      else if (v > t) p[k] = Math.max(t, v - speed);
    });
  };
  // Game loop
  const gameLoop = useCallback((currentTime) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Disable image smoothing for pixel-perfect rendering
    // Time delta in seconds (clamped for stability)
    const last = gameData.current.lastTime || currentTime;
    const dt = Math.min(0.033, Math.max(0, (currentTime - last) / 1000));
    gameData.current.lastTime = currentTime;
    
    // Clear canvas and draw background
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Update title canvas with current game state
    drawTitleCanvas();

    // Draw front overlay while in MENU
    if (gameState === GAME_STATES.MENU) {
      drawFrontCanvas();
    }
    
    // Update stats canvas with current game state
    drawStatsCanvas();
    
    // Update controls canvas
    drawControlsCanvas();
    
    // Draw level-specific background
    drawLevelBackground(ctx);
    
    // Draw moving platforms instead of shaft walls
    drawPlatforms(ctx);
    
    if (gameState === GAME_STATES.PLAYING) {
      // Increment debug frame counter (throttles logs)
      gameData.current.debugCounter = (gameData.current.debugCounter || 0) + 1;
      gameData.current.frameCount = (gameData.current.frameCount || 0) + 1;
      // Calculate dynamic speed based on position
      calculateDynamicSpeed();
      
      // Check if cage bottom has reached screen bottom
      const liftBottomY = gameData.current.liftY + LIFT_HEIGHT;
      const shouldMove = true;
      
      if (shouldMove) {
        // Gate ding sound: only play after the center lift has dropped 5 floors
        const currentFloorNow = calculateCurrentFloor();
        const floorsDropped = 30 - currentFloorNow; // starts at 30 at top
        
        // Ding sounds disabled
        // if (floorsDropped < 5 && gameData.current.liftMoving) {
        //   gameData.current.liftMoving = false;
        //   stopDingSound();
        //   console.log('Ding paused until 5 floors dropped');
        // }
        // if (!gameData.current.liftMoving && floorsDropped >= 5) {
        //   gameData.current.liftMoving = true;
        //   startDingSound();
        //   console.log('5 floors dropped - ding sound started');
        // }
        
        // Update center lift position using current dynamic speed and reverse at bounds
        {
          const dir = gameData.current.centerLiftDir || 1;
          gameData.current.liftY += dir * gameData.current.currentLiftSpeed;
          
          // Level2: Check if lift hit ground to activate crushing ceiling
          if (gameData.current.level === 2 && gameData.current.liftY + LIFT_HEIGHT >= CANVAS_HEIGHT && !gameData.current.crushingCeilingActive) {
            gameData.current.crushingCeilingActive = true;
            gameData.current.crushingCeilingY = gameData.current.liftY; // ceiling starts at lift top position
            gameData.current.crushingCeilingDir = 1; // ceiling continues down
            console.log('⚠️ Level2: Center lift hit ground, activating crushing ceiling');
            // playSound('alarm'); // Warning sound disabled
            
            // Check if player is inside center lift when ceiling starts descending
            const centerIdx = 1; // center lift index
            const currentIdx = gameData.current.currentShaftIndex || 0;
            if (currentIdx === centerIdx) {
              const shaftXForPlayer = getShaftXByIndex(centerIdx);
              const liftXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
              const interiorLeft = liftXForPlayer + 10;
              const interiorRight = liftXForPlayer + LIFT_WIDTH - 10;
              const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
              const playerTop = gameData.current.playerY;
              const playerBottom = gameData.current.playerY + PLAYER_HEIGHT;
              const ceilingBottom = gameData.current.crushingCeilingY + 10; // ceiling block height
              
              const insideHoriz = absPlayerCenterX >= interiorLeft && absPlayerCenterX <= interiorRight;
              const belowCeiling = playerTop > ceilingBottom; // player is below the ceiling when it starts
              
              if (insideHoriz && belowCeiling) {
                console.log('Level2: Player caught inside center lift when ceiling activated - immediate crush!');
                playSound('death');
                createGoreEffect();
                gameData.current.lives--;
                console.log(`Player crushed by activating ceiling! Lives remaining: ${gameData.current.lives}`);
                
                if (gameData.current.lives <= 0) {
                  setGameState(GAME_STATES.DEAD);
                } else {
                  setTimeout(() => {
                    // Restart level after crushing death
                    gameData.current.liftY = -LIFT_HEIGHT;
                    gameData.current.leftLiftY = -LIFT_HEIGHT;
                    gameData.current.rightLiftY = -LIFT_HEIGHT;
                    gameData.current.centerLiftDir = 1;
                    gameData.current.leftLiftDir = 1;
                    gameData.current.rightLiftDir = 1;
                    randomizeSideLiftSpeeds();
                    gameData.current.fallDistance = 0;
                    gameData.current.isJumping = false;
                    gameData.current.deathEnv = null;
                    const idxR = 0;
                    gameData.current.playerY = getGroundPlayerYByIndex(idxR);
                    gameData.current.playerX = 0;
                    gameData.current.playerVelocityX = 0;
                    gameData.current.animationFrame = 0;
                    gameData.current.animationTimer = 0;
                    gameData.current.movementDirection = 0;
                    gameData.current.bodyParts = [];
                    gameData.current.bloodSplatters = [];
                    gameData.current.onOutsidePlatform = false;
                    gameData.current.outsidePlatformCol = -1;
                    gameData.current.jumpDirection = 0;
                    gameData.current.hitCeiling = false;
                    gameData.current.jumpGracePeriod = 0;
                    gameData.current.jumpCooldown = 30;
                    gameData.current.previousFloor = 30;
                    gameData.current.survivedImpact = false;
                    gameData.current.wasJumpingAtImpact = false;
                    gameData.current.ridingPlatformLineIndex = -1;
                    gameData.current.ridingPlatformCol = -1;
                    gameData.current.onTopOfLift = false;
                    // Reset level-specific items
                    gameData.current.redLeverTriggered = false;
                    gameData.current.blueLeverTriggered = false;
                    gameData.current.yellowLeverTriggered = false;
                    gameData.current.centerDoorLeftOpen = false;
                    gameData.current.centerDoorRightOpen = false;
                    gameData.current.leftLiftDoorRightOpen = false;
                    gameData.current.leftLiftDoorLeftOpen = false;
                    gameData.current.rightLiftDoorLeftOpen = false;
                    gameData.current.rightLiftDoorRightOpen = false;
                    gameData.current.doorOpenProgress = {
                      centerLeft: 0,
                      centerRight: 0,
                      leftLeft: 0,
                      leftRight: 0,
                      rightLeft: 0,
                      rightRight: 0
                    };
                    gameData.current.currentShaftIndex = 0;
                    gameData.current.leftKeyCollected = false;
                    gameData.current.rightKeyCollected = false;
                    // Level2: Reset crushing ceiling state
                    gameData.current.crushingCeilingActive = false;
                    gameData.current.crushingCeilingY = 0;
                    gameData.current.crushingCeilingDir = 1;
                    // Reset platforms
                    initializeShaftMarkers();
                    console.log('DEBUG: Level restarted after ceiling crushing death');
                  }, 2000); // 2 second delay to show gore effects
                }
                return; // Exit early to prevent further processing
              }
            }
          }
          
          if (gameData.current.liftY + LIFT_HEIGHT >= CANVAS_HEIGHT) {
            gameData.current.liftY = CANVAS_HEIGHT - LIFT_HEIGHT;
            gameData.current.centerLiftDir = -1; // reverse upward
          } else if (gameData.current.liftY <= -LIFT_HEIGHT) {
            gameData.current.liftY = -LIFT_HEIGHT;
            gameData.current.centerLiftDir = 1; // reverse downward
          }
        }
        
        // Level2: Update crushing ceiling when active (center lift)
        if (gameData.current.level === 2 && gameData.current.crushingCeilingActive) {
          const ceilingDir = gameData.current.crushingCeilingDir;
          gameData.current.crushingCeilingY += ceilingDir * gameData.current.currentLiftSpeed;
          
          // Check for player collision with ceiling spikes (regardless of direction)
          const centerIdx = 1; // center lift index
          const currentIdx = gameData.current.currentShaftIndex || 0;
          if (currentIdx === centerIdx) {
            const shaftXForPlayer = getShaftXByIndex(centerIdx);
            const liftXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
            const interiorLeft = liftXForPlayer + 10;
            const interiorRight = liftXForPlayer + LIFT_WIDTH - 10;
            const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
            const playerTop = gameData.current.playerY;
            const playerBottom = gameData.current.playerY + PLAYER_HEIGHT;
            const ceilingBottom = gameData.current.crushingCeilingY + 10 + 12; // ceiling block + spike length
            
            const insideHoriz = absPlayerCenterX >= interiorLeft && absPlayerCenterX <= interiorRight;
            const crushedBySpikes = playerTop <= ceilingBottom && playerBottom >= gameData.current.crushingCeilingY;
            
            if (insideHoriz && crushedBySpikes) {
              console.log('Level2: Player hit center ceiling spikes!');
              playSound('death');
              createGoreEffect();
              gameData.current.lives--;
              if (gameData.current.lives <= 0) {
                setGameState(GAME_STATES.DEAD);
                return;
              }
            }
          }
          
          // Check if ceiling reached ground (crush phase complete)
          if (ceilingDir === 1 && gameData.current.crushingCeilingY + 10 >= CANVAS_HEIGHT) {
            gameData.current.crushingCeilingY = CANVAS_HEIGHT - 10;
            gameData.current.crushingCeilingDir = -1;
            console.log('Level2: Center ceiling reached ground, reversing upward');
          }
          // Check if ceiling returned to normal height
          else if (ceilingDir === -1 && gameData.current.crushingCeilingY <= gameData.current.liftY) {
            gameData.current.crushingCeilingActive = false;
            gameData.current.crushingCeilingY = gameData.current.liftY;
            console.log('Level2: Center ceiling returned to normal, deactivating');
          }
        }
        
        // Level2: Update left crushing ceiling when active
        if (gameData.current.level === 2 && gameData.current.leftCrushingCeilingActive) {
          const ceilingDir = gameData.current.leftCrushingCeilingDir;
          gameData.current.leftCrushingCeilingY += ceilingDir * gameData.current.leftLiftSpeed;
          
          // Check for player collision with ceiling spikes (regardless of direction)
          const leftIdx = 0; // left lift index
          const currentIdx = gameData.current.currentShaftIndex || 0;
          if (currentIdx === leftIdx) {
            const shaftXForPlayer = getShaftXByIndex(leftIdx);
            const liftXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
            const interiorLeft = liftXForPlayer + 10;
            const interiorRight = liftXForPlayer + LIFT_WIDTH - 10;
            const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
            const playerTop = gameData.current.playerY;
            const playerBottom = gameData.current.playerY + PLAYER_HEIGHT;
            const ceilingBottom = gameData.current.leftCrushingCeilingY + 10 + 12;
            
            const insideHoriz = absPlayerCenterX >= interiorLeft && absPlayerCenterX <= interiorRight;
            const crushedBySpikes = playerTop <= ceilingBottom && playerBottom >= gameData.current.leftCrushingCeilingY;
            
            if (insideHoriz && crushedBySpikes) {
              console.log('💀 Level2: Player CRUSHED by left ceiling spikes! Lives remaining:', gameData.current.lives - 1);
              playSound('death');
              createGoreEffect();
              gameData.current.lives--;
              if (gameData.current.lives <= 0) {
                setGameState(GAME_STATES.DEAD);
                return;
              }
            }
          }
          
          // Check if ceiling reached ground
          if (ceilingDir === 1 && gameData.current.leftCrushingCeilingY + 10 >= CANVAS_HEIGHT) {
            gameData.current.leftCrushingCeilingY = CANVAS_HEIGHT - 10;
            gameData.current.leftCrushingCeilingDir = -1;
            console.log('Level2: Left ceiling reached ground, reversing upward');
          }
          // Check if ceiling returned to normal height
          else if (ceilingDir === -1 && gameData.current.leftCrushingCeilingY <= gameData.current.leftLiftY) {
            gameData.current.leftCrushingCeilingActive = false;
            gameData.current.leftCrushingCeilingY = gameData.current.leftLiftY;
            console.log('Level2: Left ceiling returned to normal, deactivating');
          }
        }
        
        // Level2: Update right crushing ceiling when active
        if (gameData.current.level === 2 && gameData.current.rightCrushingCeilingActive) {
          const ceilingDir = gameData.current.rightCrushingCeilingDir;
          gameData.current.rightCrushingCeilingY += ceilingDir * gameData.current.rightLiftSpeed;
          
          // Check for player collision with ceiling spikes (regardless of direction)
          const rightIdx = 2; // right lift index
          const currentIdx = gameData.current.currentShaftIndex || 0;
          if (currentIdx === rightIdx) {
            const shaftXForPlayer = getShaftXByIndex(rightIdx);
            const liftXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
            const interiorLeft = liftXForPlayer + 10;
            const interiorRight = liftXForPlayer + LIFT_WIDTH - 10;
            const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
            const playerTop = gameData.current.playerY;
            const playerBottom = gameData.current.playerY + PLAYER_HEIGHT;
            const ceilingBottom = gameData.current.rightCrushingCeilingY + 10 + 12;
            
            const insideHoriz = absPlayerCenterX >= interiorLeft && absPlayerCenterX <= interiorRight;
            const crushedBySpikes = playerTop <= ceilingBottom && playerBottom >= gameData.current.rightCrushingCeilingY;
            
            if (insideHoriz && crushedBySpikes) {
              console.log('Level2: Player hit right ceiling spikes!');
              playSound('death');
              createGoreEffect();
              gameData.current.lives--;
              if (gameData.current.lives <= 0) {
                setGameState(GAME_STATES.DEAD);
                return;
              }
            }
          }
          
          // Check if ceiling reached ground
          if (ceilingDir === 1 && gameData.current.rightCrushingCeilingY + 10 >= CANVAS_HEIGHT) {
            gameData.current.rightCrushingCeilingY = CANVAS_HEIGHT - 10;
            gameData.current.rightCrushingCeilingDir = -1;
            console.log('Level2: Right ceiling reached ground, reversing upward');
          }
          // Check if ceiling returned to normal height
          else if (ceilingDir === -1 && gameData.current.rightCrushingCeilingY <= gameData.current.rightLiftY) {
            gameData.current.rightCrushingCeilingActive = false;
            gameData.current.rightCrushingCeilingY = gameData.current.rightLiftY;
            console.log('Level2: Right ceiling returned to normal, deactivating');
          }
        }
        // Only accumulate fall distance if parachute is not active
        if (!gameData.current.parachuteActive) {
          gameData.current.fallDistance += Math.abs(gameData.current.currentLiftSpeed);
        }

        // Update side (empty) lifts
        const leftBottom = gameData.current.leftLiftY + LIFT_HEIGHT;
        const rightBottom = gameData.current.rightLiftY + LIFT_HEIGHT;
        
        // Check for side lift win condition before updating positions
        const sideLiftWin = checkSideLiftWinCondition();
        if (sideLiftWin && !gameData.current.survivedImpact) {
          // Check if all required collectibles have been collected
          const levelConfig = gameData.current.currentLevelConfig || {};
          
          // Check cherries (if required by level)
          let allCherriesCollected = true;
          if (levelConfig.hasLeftCherry && !gameData.current.leftKeyCollected) allCherriesCollected = false;
          if (levelConfig.hasRightCherry && !gameData.current.rightKeyCollected) allCherriesCollected = false;
          if (levelConfig.hasCenterCherry && !gameData.current.centerKeyCollected) allCherriesCollected = false;
          
          // Check fruits
          const allApplesCollected = gameData.current.applesCollected >= gameData.current.requiredApplesPerLevel;
          const allBananasCollected = gameData.current.bananasCollected >= gameData.current.requiredBananasPerLevel;
          
          if (!allCherriesCollected || !allApplesCollected || !allBananasCollected) {
            // Can't advance yet - need to collect all required items!
            console.log('⚠️ Cannot complete level yet! Need to collect all required items first!');
            if (!allCherriesCollected) {
              console.log('🍒 Missing cherries:', 
                (levelConfig.hasLeftCherry && !gameData.current.leftKeyCollected ? 'Left ' : '') +
                (levelConfig.hasRightCherry && !gameData.current.rightKeyCollected ? 'Right ' : '') +
                (levelConfig.hasCenterCherry && !gameData.current.centerKeyCollected ? 'Center ' : '')
              );
            }
            console.log(`🍏 Apples: ${gameData.current.applesCollected}/${gameData.current.requiredApplesPerLevel}`);
            console.log(`🍌 Bananas: ${gameData.current.bananasCollected}/${gameData.current.requiredBananasPerLevel}`);
            // Don't advance level - player must collect all required items
            return;
          }
          
          // Player is in a side lift that has reached the bottom - WIN!
          console.log(`Player won level by riding ${sideLiftWin} lift to bottom!`);
          gameData.current.survivedImpact = true;
          
          // LEVEL COMPLETED - Player won by reaching bottom in side lift!
          stopAllSounds(); // Stop all ambient sounds when level completes
          playSound('levelUp');
          playLevelSound(); // Play level activation sound
          gameData.current.score += gameData.current.level * 100;
          
          if (gameData.current.level >= 3) {
            // Enter or continue wrap mode with alternating .1 cycles
            if (!gameData.current.wrapModeEnabled) {
              gameData.current.wrapModeEnabled = true;
              gameData.current.cycleIndex = 1; // 3.1
              gameData.current.forceMaxSpeed = true; // start at full speed
              // Keep level 3 config for 3.1
              applyLevelConfig(gameData.current, gameData.current.level);
            } else if (gameData.current.cycleIndex === 0) {
              gameData.current.cycleIndex = 1; // e.g., 4 -> 4.1
              gameData.current.forceMaxSpeed = true;
              // Keep current level config for .1 cycle
              applyLevelConfig(gameData.current, gameData.current.level);
            } else {
              // From .1 to next integer level
              gameData.current.cycleIndex = 0;
              gameData.current.level++;
              gameData.current.forceMaxSpeed = false;
            }
            
            // Randomize platform densities for new cycle (BEFORE fruit placement!)
            gameData.current.platformSpawnDensity = [
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2)
            ];
            
            // Apply level configuration and initialize fruits for integer levels
            if (gameData.current.cycleIndex === 0 && gameData.current.level >= 4) {
              applyLevelConfig(gameData.current, gameData.current.level);
              initializeFruitPlacements(gameData.current.level);
            }

            // Immediate wrap to top for continuous falling
            gameData.current.liftY = -LIFT_HEIGHT;
            gameData.current.leftLiftY = -LIFT_HEIGHT;
            gameData.current.rightLiftY = -LIFT_HEIGHT;
            gameData.current.centerLiftDir = 1;
            gameData.current.leftLiftDir = 1;
            gameData.current.rightLiftDir = 1;
            randomizeSideLiftSpeeds();
            gameData.current.fallDistance = 0;
            gameData.current.jumpCooldown = 30;
            gameData.current.hitCeiling = false; // Reset for next cycle
            gameData.current.survivedImpact = false;
            gameData.current.wasJumpingAtImpact = false;
            gameData.current.isJumping = false;
            gameData.current.jumpGracePeriod = 0;
            gameData.current.playerX = 0; // Reset horizontal position for next cycle
            gameData.current.playerVelocityX = 0; // Reset horizontal velocity for next cycle
            gameData.current.animationFrame = 0; // Reset animation for next cycle
            gameData.current.animationTimer = 0; // Reset animation timer for next cycle
            gameData.current.movementDirection = 0; // Reset movement direction for next cycle
            gameData.current.previousFloor = 30; // Reset floor tracking for next cycle
            
        // Reset levers and doors for new cycle
            gameData.current.redLeverTriggered = false;
            gameData.current.blueLeverTriggered = false;
            gameData.current.yellowLeverTriggered = false;
            gameData.current.centerDoorLeftOpen = false;
            gameData.current.centerDoorRightOpen = false;
            gameData.current.leftLiftDoorRightOpen = false;
            gameData.current.leftLiftDoorLeftOpen = false;
            gameData.current.rightLiftDoorLeftOpen = false;
            gameData.current.rightLiftDoorRightOpen = false;
            gameData.current.currentShaftIndex = 0;
            // Reset keys for new cycle
            gameData.current.leftKeyCollected = false;
            gameData.current.rightKeyCollected = false;
            
            // Reset shaft markers
            initializeShaftMarkers();
            logPlatformConfig();
            console.log('DEBUG: Wrap mode cycle started via side lift win. Level:', gameData.current.level, 'cycleIndex:', gameData.current.cycleIndex);
          } else {
            // Pre-wrap levels behave as before
            gameData.current.level++;
            console.log('Side lift win! Level completed! New level:', gameData.current.level);
            
            // Show level complete banner
            gameData.current.showLevelCompleteBanner = true;
            gameData.current.levelCompleteBannerLevel = gameData.current.level;
            gameData.current.levelCompleteBannerTimer = 90; // 90 frames (~1.5 seconds)
            
            // Randomize platform densities for new level (BEFORE fruit placement!)
            gameData.current.platformSpawnDensity = [
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2)
            ];
            
            // Apply level configuration
            applyLevelConfig(gameData.current, gameData.current.level);
            initializeFruitPlacements(gameData.current.level);

            // Start next level after a brief delay
            setTimeout(() => {
              gameData.current.liftY = -LIFT_HEIGHT;
              gameData.current.leftLiftY = -LIFT_HEIGHT;
              gameData.current.rightLiftY = -LIFT_HEIGHT;
              gameData.current.centerLiftDir = 1;
              gameData.current.leftLiftDir = 1;
              gameData.current.rightLiftDir = 1;
              randomizeSideLiftSpeeds();
              gameData.current.fallDistance = 0;
              gameData.current.jumpCooldown = 30;
              gameData.current.hitCeiling = false; // Reset for next level
              gameData.current.survivedImpact = false; // Reset for next level
              gameData.current.wasJumpingAtImpact = false; // Reset for next level
              gameData.current.isJumping = false;
              gameData.current.jumpGracePeriod = 0;
              gameData.current.playerX = 0; // Reset horizontal position for next level
              gameData.current.playerVelocityX = 0; // Reset horizontal velocity for next level
              gameData.current.animationFrame = 0; // Reset animation for next level
              gameData.current.animationTimer = 0; // Reset animation timer for next level
              gameData.current.movementDirection = 0; // Reset movement direction for next level
              gameData.current.previousFloor = 30; // Reset floor tracking for next level
              
              // Reset levers and doors for next level
              gameData.current.redLeverTriggered = false;
              gameData.current.blueLeverTriggered = false;
              gameData.current.centerDoorLeftOpen = false;
              gameData.current.centerDoorRightOpen = false;
              gameData.current.leftLiftDoorRightOpen = false;
              gameData.current.rightLiftDoorLeftOpen = false;
              gameData.current.currentShaftIndex = 0;
              // Reset keys for next level
              gameData.current.leftKeyCollected = false;
              gameData.current.rightKeyCollected = false;
              
              // Reset shaft markers
              initializeShaftMarkers();
              logPlatformConfig();
              console.log('DEBUG: Next level started successfully via side lift win');
            }, 1000); // 1 second delay before next level
          }
        }
        
        // Update left lift with directional movement and reverse at bounds
        {
          const dirL = gameData.current.leftLiftDir || 1;
          gameData.current.leftLiftY += dirL * gameData.current.leftLiftSpeed;
          
          // Level2: Check if left lift hit ground to activate crushing ceiling
          if (gameData.current.level === 2 && gameData.current.leftLiftY + LIFT_HEIGHT >= CANVAS_HEIGHT && !gameData.current.leftCrushingCeilingActive) {
            gameData.current.leftCrushingCeilingActive = true;
            gameData.current.leftCrushingCeilingY = gameData.current.leftLiftY;
            gameData.current.leftCrushingCeilingDir = 1;
            console.log('⚠️ Level2: Left lift hit ground, activating crushing ceiling');
            // playSound('alarm'); // Warning sound disabled
            
            // Check if player is inside left lift when ceiling starts descending
            const leftIdx = 0; // left lift index
            const currentIdx = gameData.current.currentShaftIndex || 0;
            if (currentIdx === leftIdx) {
              const shaftXForPlayer = getShaftXByIndex(leftIdx);
              const liftXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
              const interiorLeft = liftXForPlayer + 10;
              const interiorRight = liftXForPlayer + LIFT_WIDTH - 10;
              const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
              const playerTop = gameData.current.playerY;
              const ceilingBottom = gameData.current.leftCrushingCeilingY + 10;
              
              const insideHoriz = absPlayerCenterX >= interiorLeft && absPlayerCenterX <= interiorRight;
              const belowCeiling = playerTop > ceilingBottom;
              
              if (insideHoriz && belowCeiling) {
                console.log('Level2: Player caught inside left lift when ceiling activated!');
                playSound('death');
                createGoreEffect();
                gameData.current.lives--;
                if (gameData.current.lives <= 0) {
                  setGameState(GAME_STATES.DEAD);
                  return;
                }
                // Respawn logic will be handled by existing death timeout
              }
            }
          }
          
          if (gameData.current.leftLiftY + LIFT_HEIGHT >= CANVAS_HEIGHT) {
            gameData.current.leftLiftY = CANVAS_HEIGHT - LIFT_HEIGHT;
            gameData.current.leftLiftDir = -1;
          } else if (gameData.current.leftLiftY <= -LIFT_HEIGHT) {
            gameData.current.leftLiftY = -LIFT_HEIGHT;
            gameData.current.leftLiftDir = 1;
          }
        }
        // Update right lift with directional movement and reverse at bounds
        {
          const dirR = gameData.current.rightLiftDir || 1;
          gameData.current.rightLiftY += dirR * gameData.current.rightLiftSpeed;
          
          // Level2: Check if right lift hit ground to activate crushing ceiling
          if (gameData.current.level === 2 && gameData.current.rightLiftY + LIFT_HEIGHT >= CANVAS_HEIGHT && !gameData.current.rightCrushingCeilingActive) {
            gameData.current.rightCrushingCeilingActive = true;
            gameData.current.rightCrushingCeilingY = gameData.current.rightLiftY;
            gameData.current.rightCrushingCeilingDir = 1;
            console.log('⚠️ Level2: Right lift hit ground, activating crushing ceiling');
            // playSound('alarm'); // Warning sound disabled
            
            // Check if player is inside right lift when ceiling starts descending
            const rightIdx = 2; // right lift index
            const currentIdx = gameData.current.currentShaftIndex || 0;
            if (currentIdx === rightIdx) {
              const shaftXForPlayer = getShaftXByIndex(rightIdx);
              const liftXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
              const interiorLeft = liftXForPlayer + 10;
              const interiorRight = liftXForPlayer + LIFT_WIDTH - 10;
              const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
              const playerTop = gameData.current.playerY;
              const ceilingBottom = gameData.current.rightCrushingCeilingY + 10;
              
              const insideHoriz = absPlayerCenterX >= interiorLeft && absPlayerCenterX <= interiorRight;
              const belowCeiling = playerTop > ceilingBottom;
              
              if (insideHoriz && belowCeiling) {
                console.log('Level2: Player caught inside right lift when ceiling activated!');
                playSound('death');
                createGoreEffect();
                gameData.current.lives--;
                if (gameData.current.lives <= 0) {
                  setGameState(GAME_STATES.DEAD);
                  return;
                }
                // Respawn logic will be handled by existing death timeout
              }
            }
          }
          
          if (gameData.current.rightLiftY + LIFT_HEIGHT >= CANVAS_HEIGHT) {
            gameData.current.rightLiftY = CANVAS_HEIGHT - LIFT_HEIGHT;
            gameData.current.rightLiftDir = -1;
          } else if (gameData.current.rightLiftY <= -LIFT_HEIGHT) {
            gameData.current.rightLiftY = -LIFT_HEIGHT;
            gameData.current.rightLiftDir = 1;
          }
        }
        
        // Update shaft markers using current speed
        gameData.current.shaftMarkers.forEach(marker => {
          marker.y += gameData.current.currentLiftSpeed;
        });
        
        /* Platform scrolling handled unconditionally below for continuous flow */
      } else {
        // Ding sounds disabled
        // if (gameData.current.liftMoving) {
        //   gameData.current.liftMoving = false;
        //   stopDingSound();
        //   console.log('Lift stopped moving - ding sound stopped');
        // }
        
        // Cage has stopped at the bottom, clamp position
        gameData.current.liftY = CANVAS_HEIGHT - LIFT_HEIGHT;
        // Clamp side lifts as well
        gameData.current.leftLiftY = CANVAS_HEIGHT - LIFT_HEIGHT;
        gameData.current.rightLiftY = CANVAS_HEIGHT - LIFT_HEIGHT;
      }

      // Platform rows scroll with the lift movement for visual continuity
      {
        const platformScroll = Math.max(1, gameData.current.currentLiftSpeed || 0);
        const ROW_SCROLL = 1.5;
        gameData.current.shaftLines.forEach(line => {
          line.y -= platformScroll * ROW_SCROLL;
        });
      }
      // Wrap rows that move past the top/bottom to keep platforms continuous
      {
        const rowSpacing = 60; // must match initializeShaftMarkers
        
        // Safety check: ensure rowSpacing is positive to prevent infinite loops
        if (rowSpacing <= 0) {
          console.error('[PLATFORM GEN ERROR] Invalid rowSpacing:', rowSpacing);
          return; // Skip platform generation if rowSpacing is invalid
        }
        const count = Math.max(1, gameData.current.shaftLines.length);
        const totalSpan = rowSpacing * count;
        
        // Debug: Track wrapping behavior
        let wrappedCount = 0;
        let minY = Infinity;
        let maxY = -Infinity;
        
        // Mark platforms that have been wrapped in this frame to prevent double-wrapping
        const wrappedThisFrame = new Set();
        
        gameData.current.shaftLines.forEach((line, idxLine) => {
          minY = Math.min(minY, line.y);
          maxY = Math.max(maxY, line.y);
          
          // Only wrap if not already wrapped in this frame
          if (wrappedThisFrame.has(idxLine)) {
            return;
          }
          
          // Wrap from top to bottom: platform scrolled above screen
          if (line.y < -rowSpacing) {
            const oldY = line.y;
            line.y += totalSpan;
            wrappedCount++;
            wrappedThisFrame.add(idxLine);
            
            // If player is riding this platform line, wrap them with the platform
            if (gameData.current.onOutsidePlatform && gameData.current.ridingPlatformLineIndex === idxLine) {
              const oldPlayerY = gameData.current.playerY;
              // Calculate player's offset from platform BEFORE wrap
              const offsetFromPlatform = oldPlayerY - oldY;
              // Move player by same amount as platform to maintain relative position
              gameData.current.playerY += totalSpan;
              // Update jump baseline to prevent false big-fall detection
              if (gameData.current.jumpStartFeetY) {
                gameData.current.jumpStartFeetY += totalSpan;
              }
              // Reduced logging to prevent console spam
              if (gameData.current.frameCount % 60 === 0) {
                console.log(`🔄 Platform wrapped UP: player ${oldPlayerY} -> ${gameData.current.playerY}`);
              }
            }
          }
          // Wrap from bottom to top: platform scrolled below screen
          // Use a larger threshold to avoid immediate re-wrap
          else if (line.y > CANVAS_HEIGHT + rowSpacing && line.y < totalSpan * 0.9) {
            const oldY = line.y;
            line.y -= totalSpan;
            wrappedCount++;
            wrappedThisFrame.add(idxLine);
            
            // If player is riding this platform line, wrap them with the platform
            if (gameData.current.onOutsidePlatform && gameData.current.ridingPlatformLineIndex === idxLine) {
              const oldPlayerY = gameData.current.playerY;
              // Calculate player's offset from platform BEFORE wrap
              const offsetFromPlatform = oldPlayerY - oldY;
              // Move player by same amount as platform to maintain relative position
              gameData.current.playerY -= totalSpan;
              // Update jump baseline to prevent false big-fall detection
              if (gameData.current.jumpStartFeetY) {
                gameData.current.jumpStartFeetY -= totalSpan;
              }
              // Reduced logging to prevent console spam
              if (gameData.current.frameCount % 60 === 0) {
                console.log(`🔄 Platform wrapped DOWN: player ${oldPlayerY} -> ${gameData.current.playerY}`);
              }
            }
          }
        });
        
        // Debug: Log wrapping behavior every 60 frames
        if (DEBUG_PLATFORMS && gameData.current.frameCount % 60 === 0) {
          console.log(`[PLATFORM WRAP DEBUG] Frame ${gameData.current.frameCount}:`, {
            totalLines: gameData.current.shaftLines.length,
            wrappedCount,
            minY: minY.toFixed(2),
            maxY: maxY.toFixed(2),
            totalSpan,
            canvasHeight: CANVAS_HEIGHT,
            liftY: gameData.current.liftY
          });
        }
        
        // Dynamic platform generation: ensure we always have enough platforms
        // Only check every 10 frames for performance (platform generation is expensive)
        if (gameData.current.frameCount % 10 === 0) {
          // Add new platforms at the bottom when needed
          const bufferDistance = CANVAS_HEIGHT + 200; // Extra buffer beyond screen
          const furthestBottom = gameData.current.shaftLines.length > 0 
            ? Math.max(...gameData.current.shaftLines.map(line => line.y))
            : CANVAS_HEIGHT; // Default starting position if no platforms exist
          
          if (furthestBottom < bufferDistance) {
            const newPlatforms = [];
            let currentY = furthestBottom + rowSpacing;
            let platformCount = 0;
            const maxPlatformsPerFrame = 10; // Prevent infinite loops
            
            // Add platforms until we have enough buffer (with safety limit)
            while (currentY < bufferDistance && platformCount < maxPlatformsPerFrame) {
              newPlatforms.push({
                y: currentY,
                side: newPlatforms.length % 2, // keep property for compatibility
                length: 40 // not used, kept for compatibility
              });
              currentY += rowSpacing;
              platformCount++;
            }
            
            gameData.current.shaftLines.push(...newPlatforms);
            
            if (DEBUG_PLATFORMS) {
              console.log(`[PLATFORM GEN DEBUG] Added ${newPlatforms.length} new platforms at frame ${gameData.current.frameCount}`, {
                furthestBottom: furthestBottom.toFixed(1),
                bufferDistance,
                totalPlatforms: gameData.current.shaftLines.length
              });
            }
          }
        }
        
        // Remove platforms that are too far above the screen to save memory
        const maxDistanceAbove = -CANVAS_HEIGHT - 200; // Remove platforms far above screen
        const originalCount = gameData.current.shaftLines.length;
        gameData.current.shaftLines = gameData.current.shaftLines.filter(line => line.y > maxDistanceAbove);
        
        if (gameData.current.shaftLines.length < originalCount && DEBUG_PLATFORMS) {
          console.log(`[PLATFORM GEN DEBUG] Removed ${originalCount - gameData.current.shaftLines.length} old platforms at frame ${gameData.current.frameCount}`);
        }
      }
      
      // Update jump cooldown and grace period
      if (gameData.current.jumpCooldown > 0) {
        gameData.current.jumpCooldown--;
      }
      if (gameData.current.jumpGracePeriod > 0) {
        gameData.current.jumpGracePeriod--;
      }
      // Track air time during jump for safer big-fall detection
      if (gameData.current.isJumping) {
        gameData.current.airTicks = (gameData.current.airTicks || 0) + 1;
      } else {
        gameData.current.airTicks = 0;
      }
      
      // Handle horizontal movement (smooth, time-based)
      {
        let vx = gameData.current.playerVelocityX || 0; // px/s
        const left = gameData.current.keys['ArrowLeft'] || gameData.current.keys['a'] || gameData.current.keys['A'];
        const right = gameData.current.keys['ArrowRight'] || gameData.current.keys['d'] || gameData.current.keys['D'];

        // Debug logging for movement issues (throttled to prevent spam)
        if ((left || right) && gameData.current.frameCount % 30 === 0) {
          console.log('🎮 MOVEMENT DEBUG:', {
            frame: gameData.current.frameCount,
            left, right,
            onOutsidePlatform: gameData.current.onOutsidePlatform,
            onTopOfLift: gameData.current.onTopOfLift,
            vx: vx.toFixed(2),
            movementDirection: gameData.current.movementDirection,
            isJumping: gameData.current.isJumping
          });
        }

        // FIXED: Always allow movement when keys are pressed, regardless of platform state
        if (left && !right) {
          vx -= ACCEL_X * dt;
          gameData.current.movementDirection = -1;
          gameData.current.facingDir = -1;
        } else if (right && !left) {
          vx += ACCEL_X * dt;
          gameData.current.movementDirection = 1;
          gameData.current.facingDir = 1;
        } else {
          // Apply friction toward 0 when no input
          const friction = gameData.current.isJumping ? FRICTION_AIR : FRICTION_GROUND;
          if (vx > 0) vx = Math.max(0, vx - friction * dt);
          else if (vx < 0) vx = Math.min(0, vx + friction * dt);
          if (Math.abs(vx) < 1) {
            vx = 0;
            gameData.current.movementDirection = 0;
          }
          // Only restrict movement when on platform if velocity is very low and no keys pressed
          // This prevents the stickman from sliding off platforms but allows intentional movement
          if (gameData.current.onOutsidePlatform && !left && !right && Math.abs(vx) < 5) {
            if (gameData.current.frameCount % 60 === 0 && Math.abs(vx) > 0) {
              console.log('🛑 Platform movement restriction applied:', { vx: vx.toFixed(2), onOutsidePlatform: true });
            }
            vx = 0;
            gameData.current.movementDirection = 0;
          }
        }

        // Clamp max speed
        if (vx > MAX_SPEED_X) vx = MAX_SPEED_X;
        if (vx < -MAX_SPEED_X) vx = -MAX_SPEED_X;

        gameData.current.playerVelocityX = vx;
      }
      // Update animation with smooth timing and interpolation
      if (gameData.current.movementDirection !== 0) {
        // Animate when moving - use consistent frame timing for smooth animation
        gameData.current.animationTimer++;
        // Change frame every 8 ticks for 7.5fps animation (60fps / 8 = 7.5fps) - smoother timing
        if (gameData.current.animationTimer >= 8) { 
          gameData.current.animationFrame = (gameData.current.animationFrame + 1) % 4; // Cycle through 4 frames
          gameData.current.animationTimer = 0;
        }
        
        // Smooth movement direction transitions to prevent abrupt changes
        if (gameData.current.lastMovementDirection !== gameData.current.movementDirection) {
          gameData.current.movementTransitionTimer = 0;
        }
        gameData.current.lastMovementDirection = gameData.current.movementDirection;
        
        // Increment transition timer for smooth direction changes
        if (gameData.current.movementTransitionTimer < 3) {
          gameData.current.movementTransitionTimer++;
        }
      } else {
        // Smooth transition to idle - don't reset immediately
        if (gameData.current.animationTimer > 0) {
          gameData.current.animationTimer--;
        } else {
          gameData.current.animationFrame = 0;
        }
        gameData.current.movementTransitionTimer = 0;
      }
      // PHYSICS: Check for wall collisions BEFORE applying horizontal movement
      {
        const proposedNewX = gameData.current.playerX + (gameData.current.playerVelocityX || 0) * dt;
        const wallCheck = checkWallCollision(proposedNewX);
        
        if (wallCheck.collision) {
          // Hit a wall - stop movement completely (no bouncing)
          if (wallCheck.type === 'left') {
            // Moving left into left wall - stop all leftward velocity
            if (gameData.current.playerVelocityX < 0) {
              gameData.current.playerVelocityX = 0;
            }
            // Don't move at all if blocked
          } else if (wallCheck.type === 'right') {
            // Moving right into right wall - stop all rightward velocity
            if (gameData.current.playerVelocityX > 0) {
              gameData.current.playerVelocityX = 0;
            }
            // Don't move at all if blocked
          }
          // Keep current position - don't move into wall
        } else {
          // No wall collision - apply movement with smooth interpolation to prevent jumping
          const smoothingFactor = 0.8; // Higher = more responsive, lower = smoother
          gameData.current.playerX = gameData.current.playerX * (1 - smoothingFactor) + proposedNewX * smoothingFactor;
        }
      }
      // If riding a platform (outside or mid) and not jumping, stick exactly to its top
      if (!gameData.current.isJumping && gameData.current.onOutsidePlatform) {
        const lineIndex = gameData.current.ridingPlatformLineIndex;
        const rideCol = gameData.current.ridingPlatformCol >= 0 ? gameData.current.ridingPlatformCol : gameData.current.outsidePlatformCol;
        const lines = gameData.current.shaftLines;
        
        // Debug: Log riding state periodically
        if (gameData.current.frameCount % 30 === 0) {
          const platformY = lines && lineIndex >= 0 && lineIndex < lines.length ? lines[lineIndex].y : 'N/A';
          const playerTop = gameData.current.playerY;
          const playerBottom = gameData.current.playerY + PLAYER_HEIGHT;
          console.log(`[RIDING DEBUG] Frame ${gameData.current.frameCount}: lineIndex=${lineIndex}, platformY=${typeof platformY === 'number' ? platformY.toFixed(1) : platformY}, playerTop=${playerTop.toFixed(1)}, playerBottom=${playerBottom.toFixed(1)}, rideCol=${rideCol}, canvasHeight=${CANVAS_HEIGHT}`);
        }
        if (Array.isArray(lines) && lineIndex >= 0 && lineIndex < lines.length && rideCol >= 0) {
          // Being on a moving platform means not on top of a lift
          gameData.current.onTopOfLift = false;
          // Recompute platform geometry for the riding column
          const { left: leftShaftX, center: centerShaftX, right: rightShaftX } = getShaftPositions();
          const leftGutterCenter = Math.max(16, leftShaftX - 30);
          const rightGutterCenter = Math.min(CANVAS_WIDTH - 16, rightShaftX + SHAFT_WIDTH + 30);
          const midLeftCenter = leftShaftX + SHAFT_WIDTH + SHAFT_GAP / 2;
          const midRightCenter = centerShaftX + SHAFT_WIDTH + SHAFT_GAP / 2;
          const OUT_PLATFORM_WIDTH = Math.floor(LIFT_WIDTH * 0.45);
          const MID_PLATFORM_WIDTH = Math.min(Math.floor(LIFT_WIDTH * 0.35), SHAFT_GAP - 20);
          const colMeta = [
            { cx: leftGutterCenter, w: OUT_PLATFORM_WIDTH },
            { cx: rightGutterCenter, w: OUT_PLATFORM_WIDTH },
            { cx: midLeftCenter, w: MID_PLATFORM_WIDTH },
            { cx: midRightCenter, w: MID_PLATFORM_WIDTH }
          ];
          const colInfo = colMeta[Math.max(0, Math.min(colMeta.length - 1, rideCol))];
          const line = lines[lineIndex];
          const px = Math.round(colInfo.cx - colInfo.w / 2);
          const py = Math.round(line.y); // Static platforms
          const platTop = py;
          const platLeft = px;
          const platRight = px + colInfo.w;

          // Keep player glued to platform top
          gameData.current.playerY = platTop - PLAYER_HEIGHT - FOOT_CLEARANCE;

          // If player moves off the platform horizontally, drop them
          const shaftXForPlayer = getShaftXByIndex(gameData.current.currentShaftIndex || 0);
          const absPlayerX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2; // center
          const playerLeft = absPlayerX - PLAYER_WIDTH / 2;
          const playerRight = absPlayerX + PLAYER_WIDTH / 2;
          // Require near-full support with small tolerance to avoid jittery drops
          const eps = 2;
          const fullyOn = (playerLeft >= platLeft - eps && playerRight <= platRight + eps);
          if (!fullyOn) {
            if (DEBUG_RIDING && (gameData.current.debugCounter % DEBUG_THROTTLE === 0)) {
              console.log('RIDE_DROP', { frame: gameData.current.debugCounter, reason: 'off_edge', lineIndex, rideCol, platLeft, platRight, playerLeft, playerRight });
            }
            gameData.current.onOutsidePlatform = false;
            gameData.current.ridingPlatformLineIndex = -1;
            gameData.current.ridingPlatformCol = -1;
            // Begin falling
            gameData.current.isJumping = true;
            if (gameData.current.jumpVelocity < 0.1) gameData.current.jumpVelocity = 0.1;
          } else {
            // Maintain riding; refresh fall baseline
            {
              const feetNow = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
              gameData.current.jumpStartFeetY = feetNow;
              gameData.current.bigFallTriggered = false;
            }
            // Try stepping from platform onto a lift floor if horizontally inside and floor is available
            const positionsStep = getShaftPositions();
            const lifts = [
              { idx: -1, x: positionsStep.left, topY: gameData.current.leftLiftY },
              { idx: 0, x: positionsStep.center, topY: gameData.current.liftY },
              { idx: 1, x: positionsStep.right, topY: gameData.current.rightLiftY }
            ];
            for (const L of lifts) {
              const liftX = L.x + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
              const interiorLeft = liftX + 10;
              const interiorRight = liftX + LIFT_WIDTH - 10;
              const floorY = L.topY + LIFT_HEIGHT - 10;
              const withinInterior = absPlayerX >= interiorLeft && absPlayerX <= interiorRight;
              // If platform top is at or below the floor, allow a step; increased tolerance for Level 4
              const tolerance = gameData.current.level >= 4 ? 5 : 2;
              if (withinInterior && platTop >= floorY - tolerance) {
                gameData.current.currentShaftIndex = L.idx;
                gameData.current.onOutsidePlatform = false;
                gameData.current.onTopOfLift = false;
                gameData.current.ridingPlatformLineIndex = -1;
                gameData.current.ridingPlatformCol = -1;
                // Snap to the lift floor
                const groundY = getGroundPlayerYByIndex(L.idx);
                gameData.current.playerY = groundY;
                gameData.current.isJumping = false;
                gameData.current.jumpVelocity = 0;
                gameData.current.jumpGracePeriod = 6;
                break;
              }
            }
          }
        } else {
          // No valid platform to ride anymore -> stop riding and begin falling into the gap
          gameData.current.onOutsidePlatform = false;
          gameData.current.ridingPlatformLineIndex = -1;
          gameData.current.ridingPlatformCol = -1;
          if (!gameData.current.isJumping) {
            gameData.current.isJumping = true;
            if (gameData.current.jumpVelocity < 0.1) gameData.current.jumpVelocity = 0.1;
            gameData.current.jumpStartFeetY = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
            gameData.current.bigFallTriggered = false;
          }
        }
      }

      // If standing on a lift top-cap and not jumping, glue to cap and drop if walking off
      if (!gameData.current.isJumping && gameData.current.onTopOfLift) {
        const idxTop = gameData.current.currentShaftIndex || 0;
        const shaftXTop = getShaftXByIndex(idxTop);
        const liftXTop = shaftXTop + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
        const platLeft = liftXTop + TOP_PLATFORM_PAD;
        const platRight = platLeft + (LIFT_WIDTH - TOP_PLATFORM_PAD * 2);
        const platTop = getColumnTopYByIndex(idxTop) - TOP_PLATFORM_HEIGHT;

        // Keep player glued vertically to the cap
        gameData.current.playerY = platTop - PLAYER_HEIGHT - FOOT_CLEARANCE;

        // Check horizontal support: require feet fully over the cap (no half-foot on air)
        const absPlayerCenterX = shaftXTop + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
        const playerLeft = absPlayerCenterX - PLAYER_WIDTH / 2;
        const playerRight = absPlayerCenterX + PLAYER_WIDTH / 2;
        const epsTop = 2;
        const supported = (playerLeft >= platLeft - epsTop && playerRight <= platRight + epsTop);
        if (!supported) {
          gameData.current.onTopOfLift = false;
          gameData.current.isJumping = true;
          if (gameData.current.jumpVelocity < 0.1) gameData.current.jumpVelocity = 0.1;
          gameData.current.jumpStartFeetY = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
        }
      }

      // Check levers and possible transfers
      checkLeverTriggers();
      handleLiftTransfers();
      
      // Check if all cherries collected for the current level -> auto-complete level (config-driven)
      const levelConfig = gameData.current.currentLevelConfig || {};
      if (levelConfig.completionType === 'collectAllCherries') {
        // Dynamically check which cherries are required based on config
        let allCherriesCollected = true;
        if (levelConfig.hasLeftCherry && !gameData.current.leftKeyCollected) allCherriesCollected = false;
        if (levelConfig.hasRightCherry && !gameData.current.rightKeyCollected) allCherriesCollected = false;
        if (levelConfig.hasCenterCherry && !gameData.current.centerKeyCollected) allCherriesCollected = false;
        const allApplesCollected = gameData.current.applesCollected >= gameData.current.requiredApplesPerLevel;
        const allBananasCollected = gameData.current.bananasCollected >= gameData.current.requiredBananasPerLevel;
        
        if (allCherriesCollected && !gameData.current.survivedImpact) {
          // Check if all required fruits have been collected
          if (!allApplesCollected || !allBananasCollected) {
            console.log('⚠️ Cherries collected, but still need fruits to complete level!');
            console.log(`🍏 Apples: ${gameData.current.applesCollected}/${gameData.current.requiredApplesPerLevel}`);
            console.log(`🍌 Bananas: ${gameData.current.bananasCollected}/${gameData.current.requiredBananasPerLevel}`);
            // Don't advance level yet
          } else {
            console.log('All cherries collected! Level completed!');
            gameData.current.survivedImpact = true;
            stopAllSounds(); // Stop all ambient sounds when level completes
            playSound('levelUp');
            gameData.current.score += gameData.current.level * 100;
          
          // Advance to next level using same logic as side-lift win
          if (gameData.current.level >= 3) {
            if (!gameData.current.wrapModeEnabled) {
              gameData.current.wrapModeEnabled = true;
              gameData.current.cycleIndex = 1;
              gameData.current.forceMaxSpeed = true;
            } else if (gameData.current.cycleIndex === 0) {
              gameData.current.cycleIndex = 1;
              gameData.current.forceMaxSpeed = true;
            } else {
              gameData.current.cycleIndex = 0;
              gameData.current.level++;
              gameData.current.forceMaxSpeed = false;
            }
            // Randomize platform densities (BEFORE fruit placement!)
            gameData.current.platformSpawnDensity = [
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2)
            ];
            if (gameData.current.cycleIndex === 0 && gameData.current.level >= 4) {
              initializeFruitPlacements(gameData.current.level);
            }
            gameData.current.liftY = -LIFT_HEIGHT;
            gameData.current.leftLiftY = -LIFT_HEIGHT;
            gameData.current.rightLiftY = -LIFT_HEIGHT;
            gameData.current.centerLiftDir = 1;
            gameData.current.leftLiftDir = 1;
            gameData.current.rightLiftDir = 1;
            randomizeSideLiftSpeeds();
            gameData.current.fallDistance = 0;
            gameData.current.jumpCooldown = 30;
            gameData.current.hitCeiling = false;
            gameData.current.survivedImpact = false;
            gameData.current.wasJumpingAtImpact = false;
            gameData.current.isJumping = false;
            gameData.current.jumpGracePeriod = 0;
            gameData.current.playerX = 0;
            gameData.current.playerVelocityX = 0;
            gameData.current.animationFrame = 0;
            gameData.current.animationTimer = 0;
            gameData.current.movementDirection = 0;
            gameData.current.previousFloor = 30;
            gameData.current.redLeverTriggered = false;
            gameData.current.blueLeverTriggered = false;
            gameData.current.yellowLeverTriggered = false;
            gameData.current.centerDoorLeftOpen = false;
            gameData.current.centerDoorRightOpen = false;
            gameData.current.leftLiftDoorRightOpen = false;
            gameData.current.leftLiftDoorLeftOpen = false;
            gameData.current.rightLiftDoorLeftOpen = false;
            gameData.current.rightLiftDoorRightOpen = false;
            gameData.current.currentShaftIndex = 0;
            gameData.current.leftKeyCollected = false;
            gameData.current.rightKeyCollected = false;
            initializeShaftMarkers();
            logPlatformConfig();
            console.log('DEBUG: All cherries collected -> level advanced (wrap mode)');
          } else {
            gameData.current.level++;
            console.log('All cherries collected! Level completed! New level:', gameData.current.level);
            
            // Show level complete banner
            gameData.current.showLevelCompleteBanner = true;
            gameData.current.levelCompleteBannerLevel = gameData.current.level;
            gameData.current.levelCompleteBannerTimer = 90; // 90 frames (~1.5 seconds)
            
            // Randomize platform densities (BEFORE fruit placement!)
            gameData.current.platformSpawnDensity = [
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2),
              2 + Math.floor(Math.random() * 2)
            ];
            initializeFruitPlacements(gameData.current.level);
            setTimeout(() => {
              gameData.current.liftY = -LIFT_HEIGHT;
              gameData.current.leftLiftY = -LIFT_HEIGHT;
              gameData.current.rightLiftY = -LIFT_HEIGHT;
              gameData.current.centerLiftDir = 1;
              gameData.current.leftLiftDir = 1;
              gameData.current.rightLiftDir = 1;
              randomizeSideLiftSpeeds();
              gameData.current.fallDistance = 0;
              gameData.current.jumpCooldown = 30;
              gameData.current.hitCeiling = false;
              gameData.current.survivedImpact = false;
              gameData.current.wasJumpingAtImpact = false;
              gameData.current.isJumping = false;
              gameData.current.jumpGracePeriod = 0;
              gameData.current.playerX = 0;
              gameData.current.playerVelocityX = 0;
              gameData.current.animationFrame = 0;
              gameData.current.animationTimer = 0;
              gameData.current.movementDirection = 0;
              gameData.current.previousFloor = 30;
              gameData.current.redLeverTriggered = false;
              gameData.current.blueLeverTriggered = false;
              gameData.current.centerDoorLeftOpen = false;
              gameData.current.centerDoorRightOpen = false;
              gameData.current.leftLiftDoorRightOpen = false;
              gameData.current.rightLiftDoorLeftOpen = false;
              gameData.current.currentShaftIndex = 0;
              gameData.current.leftKeyCollected = false;
              gameData.current.rightKeyCollected = false;
              initializeShaftMarkers();
              logPlatformConfig();
              console.log('DEBUG: All cherries collected -> next level started');
            }, 1000);
          }
          }
        }
      }
      
      // Horizontal screen wrapping - player wraps from left to right and vice versa
      {
        const currentIdx = gameData.current.currentShaftIndex || 0;
        const shaftX = getShaftXByIndex(currentIdx);
        const playerAbsoluteX = shaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
        
        // Wrap around screen edges
        if (playerAbsoluteX < -PLAYER_WIDTH) {
          // Player went off left edge - wrap to right side
          const wrapX = CANVAS_WIDTH;
          gameData.current.playerX += wrapX;
        } else if (playerAbsoluteX > CANVAS_WIDTH) {
          // Player went off right edge - wrap to left side
          const wrapX = CANVAS_WIDTH;
          gameData.current.playerX -= wrapX;
        }
      }
      
      // Keep player glued to the surface when not jumping
      if (!gameData.current.isJumping) {
        const currentIdxGlue = gameData.current.currentShaftIndex || 0;
        if (gameData.current.onOutsidePlatform) {
          const li = gameData.current.ridingPlatformLineIndex;
          const col = gameData.current.ridingPlatformCol;
          if (li >= 0 && col >= 0) {
            const line = gameData.current.shaftLines[li];
            if (line) {
              const platTop = line.y; // Static platforms
              gameData.current.playerY = platTop - PLAYER_HEIGHT - FOOT_CLEARANCE;
            }
          }
        } else if (gameData.current.onTopOfLift) {
          const ly = getColumnTopYByIndex(currentIdxGlue);
          const platTop = ly - TOP_PLATFORM_HEIGHT;
          gameData.current.playerY = platTop - PLAYER_HEIGHT - FOOT_CLEARANCE;
        } else {
          // Inside lift floor
          const groundY = getGroundPlayerYByIndex(currentIdxGlue);
          gameData.current.playerY = groundY;
        }
      }
      
      // PHYSICS REWRITE: Calculate all solid surfaces and check for ground support
      // If not on solid ground, automatically start falling
      // EXCEPTION: If actively riding a platform, skip this check to prevent death during platform wrapping
      if (!gameData.current.isJumping) {
        // If riding a platform, trust that state and skip ground check (prevents wrap-around deaths)
        const activelyRidingPlatform = gameData.current.onOutsidePlatform && gameData.current.ridingPlatformLineIndex >= 0;
        
        if (!activelyRidingPlatform) {
          const hasSolidGround = checkPlayerHasGroundSupport();
          if (!hasSolidGround) {
            // No ground under feet - start falling immediately
            gameData.current.isJumping = true;
            gameData.current.onOutsidePlatform = false;
            gameData.current.onTopOfLift = false;
            gameData.current.ridingPlatformLineIndex = -1;
            gameData.current.ridingPlatformCol = -1;
            gameData.current.jumpVelocity = Math.max(0.5, gameData.current.jumpVelocity || 0.5);
            gameData.current.jumpStartFeetY = (gameData.current.playerY || 0) + PLAYER_HEIGHT;
            console.log('🎮 PHYSICS: No ground support detected - starting fall');
          }
        }
      }
      // Handle jump/fall physics
      if (gameData.current.isJumping) {
        // Apply gravity with device-specific and parachute modifications
        let gravity = GRAVITY;
        let terminalVelocity = TERMINAL_VELOCITY;
        
        // Reduce gravity by 10% on mobile devices for better control
        const device = detectDeviceType();
        if (device.isMobile) {
          gravity = GRAVITY * 0.9; // 10% reduction for mobile devices
          terminalVelocity = TERMINAL_VELOCITY * 0.9; // Also reduce terminal velocity slightly
          // Log once per game session for debugging
          if (!gameData.current.mobileGravityLogged) {
            console.log('📱 Mobile gravity reduction applied: gravity =', gravity.toFixed(3), 'terminal velocity =', terminalVelocity.toFixed(1));
            gameData.current.mobileGravityLogged = true;
          }
        }
        
        if (gameData.current.parachuteActive) {
          // Parachute reduces gravity and terminal velocity significantly
          gravity = gravity * 0.3; // Much slower fall acceleration (applies to already reduced mobile gravity)
          terminalVelocity = terminalVelocity * 0.4; // Much slower max fall speed
        }
        
        gameData.current.jumpVelocity = Math.min(terminalVelocity, gameData.current.jumpVelocity + gravity);
        
        // Apply vertical movement with slight smoothing to prevent jarring position changes
        const targetY = gameData.current.playerY + gameData.current.jumpVelocity;
        const verticalSmoothingFactor = 0.95; // Very light smoothing for vertical movement
        gameData.current.playerY = gameData.current.playerY * (1 - verticalSmoothingFactor) + targetY * verticalSmoothingFactor;
        
        // Wrap player around screen vertically in wrap mode
        if (gameData.current.wrapModeEnabled) {
          // Player went off the top of the screen - wrap to bottom
          if (gameData.current.playerY < -PLAYER_HEIGHT) {
            const oldY = gameData.current.playerY;
            const offset = oldY; // How far past 0 they went
            gameData.current.playerY = CANVAS_HEIGHT + offset; // Appear at bottom with same offset
            // Update jump baseline to prevent false big-fall detection
            if (gameData.current.jumpStartFeetY) {
              gameData.current.jumpStartFeetY = gameData.current.playerY + PLAYER_HEIGHT;
            }
            console.log(`🔄 Player wrapped from TOP to BOTTOM (jumping): ${oldY} -> ${gameData.current.playerY}`);
          }
          // Player went off the bottom of the screen - wrap to top
          else if (gameData.current.playerY > CANVAS_HEIGHT) {
            const oldY = gameData.current.playerY;
            const offset = oldY - CANVAS_HEIGHT; // How far past bottom they went
            gameData.current.playerY = offset; // Appear at top with same offset
            // Update jump baseline to prevent false big-fall detection
            if (gameData.current.jumpStartFeetY) {
              gameData.current.jumpStartFeetY = gameData.current.playerY + PLAYER_HEIGHT;
            }
            console.log(`🔄 Player wrapped from BOTTOM to TOP (jumping): ${oldY} -> ${gameData.current.playerY}`);
          }
        }
        
        // Check if player's head hit lift ceiling only when truly inside the cabin
        {
          const idxInside = gameData.current.currentShaftIndex || 0;
          const ly = getLiftYByIndex(idxInside);
          const shaftXForPlayer = getShaftXByIndex(idxInside);
          const liftXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - LIFT_WIDTH) / 2;
          const interiorLeft = liftXForPlayer + 10;
          const interiorRight = liftXForPlayer + LIFT_WIDTH - 10;
          const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
          const feetY = gameData.current.playerY + PLAYER_HEIGHT;
          const insideHoriz = absPlayerCenterX >= interiorLeft && absPlayerCenterX <= interiorRight;
          
          // Level2: Use crushing ceiling position if active, otherwise use lift ceiling
          const ceilingY = (gameData.current.level === 2 && gameData.current.crushingCeilingActive) 
            ? gameData.current.crushingCeilingY + 10 
            : ly + 10;
          const headCrossesCeiling = (gameData.current.playerY <= ceilingY && feetY >= ceilingY);

          // Check if player is invincible
          const now = Date.now();
          const isInvincible = gameData.current.invincible && now < (gameData.current.invincibleUntil || 0);
          const isInDeathState = now < (gameData.current.deathEffectUntil || 0);
          
          if (
            insideHoriz &&
            headCrossesCeiling &&
            !gameData.current.onOutsidePlatform &&
            !gameData.current.onTopOfLift &&
            gameData.current.jumpGracePeriod <= 0 &&
            !gameData.current.hitCeiling &&
            !isInvincible &&
            !isInDeathState
          ) {
            // Level2: Different message for crushing ceiling vs normal ceiling
            if (gameData.current.level === 2 && gameData.current.crushingCeilingActive && ceilingY === gameData.current.crushingCeilingY + 10) {
              console.log('DEBUG: Player crushed by ceiling spikes! Lives before:', gameData.current.lives);
            } else {
              console.log('DEBUG: Player hit ceiling! Lives before:', gameData.current.lives);
            }
            gameData.current.hitCeiling = true;
            playSound('death');
            // ALWAYS create gore effect when player dies
            createGoreEffect();
            
            // Lose a life
            gameData.current.lives--;
            gameData.current.deathEffectUntil = Date.now() + 2000; // Prevent multiple deaths for 2 seconds
            console.log(`Player died with GORE EXPLOSION! Lives remaining: ${gameData.current.lives}`);
            
            if (gameData.current.lives <= 0) {
              // Game over - no lives left
              console.log('GAME OVER - No lives remaining');
              setGameState(GAME_STATES.DEAD);
            } else {
              // Show gore effects for 2 seconds then respawn player
              console.log(`Player will respawn with ${gameData.current.lives} lives remaining`);
              console.log('DEBUG: Level progress will continue - lift position NOT reset');
              setTimeout(() => {
                console.log('DEBUG: Respawning player - restarting level attempt with', gameData.current.lives, 'lives');
                // Restart the level: reset lifts, player, and all level state
                gameData.current.liftY = -LIFT_HEIGHT;
                gameData.current.leftLiftY = -LIFT_HEIGHT;
                gameData.current.rightLiftY = -LIFT_HEIGHT;
                gameData.current.centerLiftDir = 1;
                gameData.current.leftLiftDir = 1;
                gameData.current.rightLiftDir = 1;
                randomizeSideLiftSpeeds();
                gameData.current.fallDistance = 0;
                gameData.current.isJumping = false;
                gameData.current.deathEnv = null;
                {
                  const idxR = 0; // always start in center
                  gameData.current.playerY = getGroundPlayerYByIndex(idxR);
                }
                gameData.current.playerX = 0;
                gameData.current.playerVelocityX = 0;
                gameData.current.animationFrame = 0;
                gameData.current.animationTimer = 0;
                gameData.current.movementDirection = 0;
                gameData.current.bodyParts = [];
                gameData.current.bloodSplatters = [];
                gameData.current.onOutsidePlatform = false;
                gameData.current.outsidePlatformCol = -1;
                gameData.current.jumpDirection = 0;
                gameData.current.hitCeiling = false;
                gameData.current.jumpGracePeriod = 0;
                gameData.current.jumpCooldown = 30;
                gameData.current.previousFloor = 30;
                gameData.current.survivedImpact = false;
                gameData.current.wasJumpingAtImpact = false;
                // Reset level-specific items: levers, doors, cherries
                gameData.current.redLeverTriggered = false;
                gameData.current.blueLeverTriggered = false;
                gameData.current.yellowLeverTriggered = false;
                gameData.current.centerDoorLeftOpen = false;
                gameData.current.centerDoorRightOpen = false;
                gameData.current.leftLiftDoorRightOpen = false;
                gameData.current.leftLiftDoorLeftOpen = false;
                gameData.current.rightLiftDoorLeftOpen = false;
                gameData.current.rightLiftDoorRightOpen = false;
                gameData.current.doorOpenProgress = {
                  centerLeft: 0,
                  centerRight: 0,
                  leftLeft: 0,
                  leftRight: 0,
                  rightLeft: 0,
                  rightRight: 0
                };
                gameData.current.currentShaftIndex = 0;
                gameData.current.leftKeyCollected = false;
                gameData.current.rightKeyCollected = false;
                // Level2: Reset crushing ceiling state
                gameData.current.crushingCeilingActive = false;
                gameData.current.crushingCeilingY = 0;
                gameData.current.crushingCeilingDir = 1;
                gameData.current.leftCrushingCeilingActive = false;
                gameData.current.leftCrushingCeilingY = 0;
                gameData.current.leftCrushingCeilingDir = 1;
                gameData.current.rightCrushingCeilingActive = false;
                gameData.current.rightCrushingCeilingY = 0;
                gameData.current.rightCrushingCeilingDir = 1;
                // Reset platforms
                initializeShaftMarkers();
                console.log('DEBUG: Level restarted after death');
              }, 2000); // 2 second delay to show gore effects
            }
          }
      
      }
        // DISABLED: Mid-air fall death - stickman should only die when LANDING on something after a long fall
        // If no platform to land on, he keeps falling until hitting the bottom of the screen
        // The landing death check below handles fall damage properly when he lands on a surface

        // PHYSICS REWRITE: Simplified landing detection using getAllSolidSurfaces()
        if (!gameData.current.bigFallTriggered) {
          const surfaces = getAllSolidSurfaces();
          const currentIdx = gameData.current.currentShaftIndex || 0;
          const shaftXForPlayer = getShaftXByIndex(currentIdx);
          const absPlayerCenterX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2;
          const playerLeft = absPlayerCenterX - PLAYER_WIDTH / 2;
          const playerRight = absPlayerCenterX + PLAYER_WIDTH / 2;
          const prevFeet = gameData.current.playerY + PLAYER_HEIGHT - gameData.current.jumpVelocity;
          const feet = gameData.current.playerY + PLAYER_HEIGHT;
          
          let landed = false;
          
          // Check all surfaces for landing
          for (const surface of surfaces) {
            if (landed) break;
            
            // Check if player's feet are crossing down through the surface or close to it
            const crossingDown = (prevFeet <= surface.top && feet >= surface.top);
            const nearSurface = Math.abs(feet - surface.top) <= 12; // increased tolerance for faster falls
            
            // Check horizontal overlap - at least 40% of player width must be over surface
            const overlapWidth = Math.min(playerRight, surface.right) - Math.max(playerLeft, surface.left);
            const hasOverlap = overlapWidth > 0;
            const hasSignificantOverlap = overlapWidth >= PLAYER_WIDTH * 0.4; // at least 40% overlap
            
            // Only land if crossing down or very near, and only when falling (not ascending)
            if (hasSignificantOverlap && (crossingDown || nearSurface) && gameData.current.jumpVelocity > -0.5) {
              // Check for big fall death (unless parachute or invincibility is active)
              const feetAtLanding = surface.top;
              const startFeet = (typeof gameData.current.jumpStartFeetY === 'number') ? gameData.current.jumpStartFeetY : feetAtLanding;
              const now = Date.now();
              const isInvincible = gameData.current.invincible && now < (gameData.current.invincibleUntil || 0);
              const isInDeathState = now < (gameData.current.deathEffectUntil || 0);
              
              if (!gameData.current.parachuteActive && !isInvincible && !isInDeathState && (feetAtLanding - startFeet >= BIG_FALL_DEATH_HEIGHT) && (gameData.current.airTicks || 0) >= 25) {
                // Fatal fall
                console.log('🎮 PHYSICS: Fatal fall detected - big fall death');
                playSplatSound(); // Play death splat sound
                createGoreEffect();
                gameData.current.lives--;
                gameData.current.bigFallTriggered = true;
                gameData.current.deathEffectUntil = Date.now() + 2000; // Prevent multiple deaths for 2 seconds
                if (gameData.current.lives <= 0) {
                  setGameState(GAME_STATES.DEAD);
                } else {
                  setTimeout(() => {
                    // Restart level after landing big-fall death
                    gameData.current.liftY = -LIFT_HEIGHT;
                    gameData.current.leftLiftY = -LIFT_HEIGHT;
                    gameData.current.rightLiftY = -LIFT_HEIGHT;
                    gameData.current.centerLiftDir = 1;
                    gameData.current.leftLiftDir = 1;
                    gameData.current.rightLiftDir = 1;
                    randomizeSideLiftSpeeds();
                    gameData.current.fallDistance = 0;
                    gameData.current.isJumping = false;
                    const idxR = 0;
                    gameData.current.playerY = getGroundPlayerYByIndex(idxR);
                    gameData.current.playerX = 0;
                    gameData.current.playerVelocityX = 0;
                    gameData.current.onOutsidePlatform = false;
                    gameData.current.onTopOfLift = false;
                    gameData.current.outsidePlatformCol = -1;
                    gameData.current.ridingPlatformLineIndex = -1;
                    gameData.current.ridingPlatformCol = -1;
                    gameData.current.jumpDirection = 0;
                    gameData.current.bigFallTriggered = false;
                    gameData.current.previousFloor = 30;
                    gameData.current.survivedImpact = false;
                    gameData.current.redLeverTriggered = false;
                    gameData.current.blueLeverTriggered = false;
                    gameData.current.yellowLeverTriggered = false;
                    gameData.current.centerDoorLeftOpen = false;
                    gameData.current.centerDoorRightOpen = false;
                    gameData.current.leftLiftDoorRightOpen = false;
                    gameData.current.leftLiftDoorLeftOpen = false;
                    gameData.current.rightLiftDoorLeftOpen = false;
                    gameData.current.rightLiftDoorRightOpen = false;
                    gameData.current.doorOpenProgress = {
                      centerLeft: 0,
                      centerRight: 0,
                      leftLeft: 0,
                      leftRight: 0,
                      rightLeft: 0,
                      rightRight: 0
                    };
                    gameData.current.currentShaftIndex = 0;
                    gameData.current.leftKeyCollected = false;
                    gameData.current.rightKeyCollected = false;
                    // Level2: Reset crushing ceiling state
                    gameData.current.crushingCeilingActive = false;
                    gameData.current.crushingCeilingY = 0;
                    gameData.current.crushingCeilingDir = 1;
                    gameData.current.leftCrushingCeilingActive = false;
                    gameData.current.leftCrushingCeilingY = 0;
                    gameData.current.leftCrushingCeilingDir = 1;
                    gameData.current.rightCrushingCeilingActive = false;
                    gameData.current.rightCrushingCeilingY = 0;
                    gameData.current.rightCrushingCeilingDir = 1;
                    initializeShaftMarkers();
                  }, 1200);
                }
                landed = true;
              } else {
                // Safe landing
                console.log('🎮 PHYSICS: Landed safely on', surface.type);
                gameData.current.isJumping = false;
                // Deactivate parachute on landing (player is no longer in the air)
                gameData.current.parachuteActive = false;
                gameData.current.jumpTapCount = 0; // Reset for next air jump
                {
                  const clearance = (surface.type === 'lift_floor') ? (FOOT_CLEARANCE + FLOOR_EXTRA_CLEARANCE) : FOOT_CLEARANCE;
                  gameData.current.playerY = surface.top - PLAYER_HEIGHT - clearance;
                }
                gameData.current.jumpVelocity = 0;
                gameData.current.jumpGracePeriod = 10;
                gameData.current.airTicks = 0;
                gameData.current.startedFromPlatformThisJump = false;
                
                // Update state based on surface type
                if (surface.type === 'lift_floor') {
                  // If changing shafts, recalculate playerX relative to the new shaft
                  if (surface.liftIndex !== currentIdx) {
                    const oldShaftX = getShaftXByIndex(currentIdx);
                    const oldAbsX = oldShaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
                    const newShaftX = getShaftXByIndex(surface.liftIndex);
                    const newRelX = oldAbsX - (newShaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2);
                    gameData.current.playerX = newRelX;
                  }
                  gameData.current.currentShaftIndex = surface.liftIndex;
                  gameData.current.onOutsidePlatform = false;
                  gameData.current.onTopOfLift = false;
                  gameData.current.ridingPlatformLineIndex = -1;
                  gameData.current.ridingPlatformCol = -1;
                } else if (surface.type === 'lift_cap') {
                  // If changing shafts, recalculate playerX relative to the new shaft
                  if (surface.liftIndex !== currentIdx) {
                    const oldShaftX = getShaftXByIndex(currentIdx);
                    const oldAbsX = oldShaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX;
                    const newShaftX = getShaftXByIndex(surface.liftIndex);
                    const newRelX = oldAbsX - (newShaftX + (SHAFT_WIDTH - PLAYER_WIDTH) / 2);
                    gameData.current.playerX = newRelX;
                  }
                  gameData.current.currentShaftIndex = surface.liftIndex;
                  gameData.current.onOutsidePlatform = false;
                  gameData.current.onTopOfLift = true;
                  gameData.current.ridingPlatformLineIndex = -1;
                  gameData.current.ridingPlatformCol = -1;
                } else if (surface.type === 'platform') {
                  gameData.current.onOutsidePlatform = true;
                  gameData.current.onTopOfLift = false;
                  gameData.current.outsidePlatformCol = surface.platformCol;
                  gameData.current.ridingPlatformLineIndex = surface.lineIndex;
                  gameData.current.ridingPlatformCol = surface.platformCol;
                  if (DEBUG_RIDING && (gameData.current.debugCounter % DEBUG_THROTTLE === 0)) {
                    console.log('RIDE_LAND', { frame: gameData.current.debugCounter, col: surface.platformCol, line: surface.lineIndex, feet: (gameData.current.playerY + PLAYER_HEIGHT) });
                  }
                }
                
                gameData.current.jumpDirection = 0;
                landed = true;
              }
            }
            
            // Check for underside bounce when ascending
            if (!landed && gameData.current.jumpVelocity < 0) {
              const head = gameData.current.playerY;
              const prevHead = head - gameData.current.jumpVelocity;
              const platBottom = surface.top + (surface.type === 'platform' ? 10 : 0);
              const crossingUpIntoBottom = (prevHead >= platBottom && head <= platBottom);
              
              if (hasOverlap && crossingUpIntoBottom) {
                console.log('🎮 PHYSICS: Bounced off underside of', surface.type);
                gameData.current.playerY = platBottom + 1;
                gameData.current.jumpVelocity = -gameData.current.jumpVelocity * 0.5;
                gameData.current.playerVelocityX *= 0.9;
              }
            }
          }
        }

        // If still falling and passed bottom, die immediately (fell into abyss) - but not in wrap mode
        if (!gameData.current.wrapModeEnabled && !gameData.current.bigFallTriggered && gameData.current.isJumping && (gameData.current.playerY + PLAYER_HEIGHT >= CANVAS_HEIGHT)) {
          // Always die when hitting bottom of screen - no exceptions
          const now = Date.now();
          const isInDeathState = now < (gameData.current.deathEffectUntil || 0);
          
          if (!isInDeathState) {
            // Fall death at bottom: clamp to floor before exploding
            gameData.current.playerY = CANVAS_HEIGHT - PLAYER_HEIGHT;
            console.log('🎮 PHYSICS: Fatal fall detected - fell off bottom of screen');
            playSplatSound(); // Play death splat sound
            createGoreEffect();
            gameData.current.lives--;
            gameData.current.bigFallTriggered = true;
            gameData.current.deathEffectUntil = Date.now() + 2000; // Prevent multiple deaths for 2 seconds
            if (gameData.current.lives <= 0) {
              setGameState(GAME_STATES.DEAD);
            } else {
              setTimeout(() => {
                // Restart level after abyss death
              gameData.current.liftY = -LIFT_HEIGHT;
              gameData.current.leftLiftY = -LIFT_HEIGHT;
              gameData.current.rightLiftY = -LIFT_HEIGHT;
              gameData.current.centerLiftDir = 1;
              gameData.current.leftLiftDir = 1;
              gameData.current.rightLiftDir = 1;
              randomizeSideLiftSpeeds();
              gameData.current.fallDistance = 0;
              gameData.current.isJumping = false;
              gameData.current.deathEnv = null;
              const idxR = 0;
              gameData.current.playerY = getGroundPlayerYByIndex(idxR);
              gameData.current.playerX = 0;
              gameData.current.playerVelocityX = 0;
              gameData.current.onOutsidePlatform = false;
              gameData.current.outsidePlatformCol = -1;
              gameData.current.jumpDirection = 0;
              gameData.current.previousFloor = 30;
              gameData.current.survivedImpact = false;
              gameData.current.redLeverTriggered = false;
              gameData.current.blueLeverTriggered = false;
              gameData.current.yellowLeverTriggered = false;
              gameData.current.centerDoorLeftOpen = false;
              gameData.current.centerDoorRightOpen = false;
              gameData.current.leftLiftDoorRightOpen = false;
              gameData.current.leftLiftDoorLeftOpen = false;
              gameData.current.rightLiftDoorLeftOpen = false;
              gameData.current.rightLiftDoorRightOpen = false;
              gameData.current.doorOpenProgress = {
                centerLeft: 0,
                centerRight: 0,
                leftLeft: 0,
                leftRight: 0,
                rightLeft: 0,
                rightRight: 0
              };
              gameData.current.currentShaftIndex = 0;
              gameData.current.leftKeyCollected = false;
              gameData.current.centerKeyCollected = false;
              gameData.current.rightKeyCollected = false;
              // Level2: Reset crushing ceiling state
              gameData.current.crushingCeilingActive = false;
              gameData.current.crushingCeilingY = 0;
              gameData.current.crushingCeilingDir = 1;
              gameData.current.leftCrushingCeilingActive = false;
              gameData.current.leftCrushingCeilingY = 0;
              gameData.current.leftCrushingCeilingDir = 1;
              gameData.current.rightCrushingCeilingActive = false;
              gameData.current.rightCrushingCeilingY = 0;
              gameData.current.rightCrushingCeilingDir = 1;
              initializeShaftMarkers();
            }, 1200);
            }
          }
        }
      }
      
      // Check for impact (bottom of lift hits bottom of screen)
      if (false && liftBottomY >= CANVAS_HEIGHT) {
        if (!gameData.current.survivedImpact) {
          // Determine if player is in the middle shaft and standing on its top platform cap
          const idxAtImpact = gameData.current.currentShaftIndex || 0;
          const inMiddle = (idxAtImpact === 0);

          // Check if player's feet are on the center top cap (safe)
          let onCenterTopCap = false;
          if (inMiddle) {
            const shaftXForPlayer = getShaftXByIndex(idxAtImpact);
            const absPlayerX = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2 + gameData.current.playerX + PLAYER_WIDTH / 2; // player center X
            const positions = getShaftPositions();
            const platLeft = positions.center + (SHAFT_WIDTH - LIFT_WIDTH) / 2 + TOP_PLATFORM_PAD;
            const platRight = platLeft + (LIFT_WIDTH - TOP_PLATFORM_PAD * 2);
            const platTop = gameData.current.liftY - TOP_PLATFORM_HEIGHT;
            const feet = gameData.current.playerY + PLAYER_HEIGHT;
            const withinX = absPlayerX >= platLeft && absPlayerX <= platRight;
            const standingOnTop = Math.abs(feet - platTop) <= 2; // small tolerance
            onCenterTopCap = withinX && standingOnTop;
          }

          if (inMiddle && !onCenterTopCap) {
            // Middle lift impact while inside -> explode
            playSound('impact');
            playSplatSound(); // Play death splat sound
            createGoreEffect();
            gameData.current.lives--;
            console.log(`Player exploded on middle lift impact! Lives remaining: ${gameData.current.lives}`);

            if (gameData.current.lives <= 0) {
              console.log('GAME OVER - No lives remaining');
              setGameState(GAME_STATES.DEAD);
            } else {
              console.log(`Player will respawn after middle impact with ${gameData.current.lives} lives remaining`);
              setTimeout(() => {
                // Reset player position but continue current level progress
                gameData.current.isJumping = false;
                {
                  const idxR = gameData.current.currentShaftIndex || 0;
                  gameData.current.playerY = getGroundPlayerYByIndex(idxR);
                }
                gameData.current.playerX = 0; // Reset horizontal position
                gameData.current.playerVelocityX = 0; // Reset horizontal velocity
                gameData.current.animationFrame = 0; // Reset animation
                gameData.current.animationTimer = 0; // Reset animation timer
                gameData.current.movementDirection = 0; // Reset movement direction
                gameData.current.bodyParts = [];
                gameData.current.bloodSplatters = [];
                gameData.current.onOutsidePlatform = false;
                gameData.current.outsidePlatformCol = -1;
                gameData.current.jumpDirection = 0;
                gameData.current.jumpGracePeriod = 0;
                gameData.current.jumpCooldown = 30; // Brief invincibility period
                // Note: Level progress, lift position, and speed are NOT reset
              }, 2000); // 2 second delay to show gore effects
            }
          } else {
            // Player is either in a side lift OR safely standing on center top cap -> survive and complete the level
            console.log('DEBUG: Player survived impact (side lift or safe center-top)');
            console.log('DEBUG: Lives before level completion:', gameData.current.lives);
            gameData.current.survivedImpact = true;
            
            // LEVEL COMPLETED - Player survived the cage hitting the floor!
            stopAllSounds(); // Stop all ambient sounds when level completes
            playSound('levelUp');
            playLevelSound(); // Play level activation sound
            gameData.current.score += gameData.current.level * 100;
            
            if (gameData.current.level >= 3) {
              // Enter or continue wrap mode with alternating .1 cycles
              if (!gameData.current.wrapModeEnabled) {
                gameData.current.wrapModeEnabled = true;
                gameData.current.cycleIndex = 1; // 3.1
                gameData.current.forceMaxSpeed = true; // start at full speed
                // Keep level 3 config for 3.1
                applyLevelConfig(gameData.current, gameData.current.level);
              } else if (gameData.current.cycleIndex === 0) {
                gameData.current.cycleIndex = 1; // e.g., 4 -> 4.1
                gameData.current.forceMaxSpeed = true;
                // Keep current level config for .1 cycle
                applyLevelConfig(gameData.current, gameData.current.level);
              } else {
                // From .1 to next integer level
                gameData.current.cycleIndex = 0;
                gameData.current.level++;
                gameData.current.forceMaxSpeed = false;
                // Apply level configuration for the new level
                applyLevelConfig(gameData.current, gameData.current.level);
              }

              // Immediate wrap to top for continuous falling
              gameData.current.liftY = -LIFT_HEIGHT;
              gameData.current.leftLiftY = -LIFT_HEIGHT;
              gameData.current.rightLiftY = -LIFT_HEIGHT;
              gameData.current.centerLiftDir = 1;
              gameData.current.leftLiftDir = 1;
              gameData.current.rightLiftDir = 1;
              randomizeSideLiftSpeeds();
              gameData.current.fallDistance = 0;
              gameData.current.jumpCooldown = 30;
              gameData.current.hitCeiling = false; // Reset for next cycle
              gameData.current.survivedImpact = false;
              gameData.current.wasJumpingAtImpact = false;
              gameData.current.isJumping = false;
              gameData.current.jumpGracePeriod = 0;
              gameData.current.playerX = 0; // Reset horizontal position for next cycle
              gameData.current.playerVelocityX = 0; // Reset horizontal velocity for next cycle
              gameData.current.animationFrame = 0; // Reset animation for next cycle
              gameData.current.animationTimer = 0; // Reset animation timer for next cycle
              gameData.current.movementDirection = 0; // Reset movement direction for next cycle
              gameData.current.previousFloor = 30; // Reset floor tracking for next cycle
              
      // Reset levers and doors for new cycle
      gameData.current.redLeverTriggered = false;
      gameData.current.blueLeverTriggered = false;
      gameData.current.yellowLeverTriggered = false;
      gameData.current.centerDoorLeftOpen = false;
      gameData.current.centerDoorRightOpen = false;
      gameData.current.leftLiftDoorRightOpen = false;
      gameData.current.leftLiftDoorLeftOpen = false;
      gameData.current.rightLiftDoorLeftOpen = false;
      gameData.current.rightLiftDoorRightOpen = false;
      // Reset door animation progress
      gameData.current.doorOpenProgress = {
        centerLeft: 0,
        centerRight: 0,
        leftLeft: 0,
        leftRight: 0,
        rightLeft: 0,
        rightRight: 0
      };
              gameData.current.currentShaftIndex = 0;
              // Reset keys for new cycle
              gameData.current.leftKeyCollected = false;
              gameData.current.centerKeyCollected = false;
              gameData.current.rightKeyCollected = false;
              
              // Reset shaft markers
              initializeShaftMarkers();
              // Ensure platforms auto-move at level start
              // Randomize platform densities for new cycle
              gameData.current.platformSpawnDensity = [
                2 + Math.floor(Math.random() * 2),
                2 + Math.floor(Math.random() * 2),
                2 + Math.floor(Math.random() * 2),
                2 + Math.floor(Math.random() * 2)
              ];
              logPlatformConfig();
              console.log('DEBUG: Wrap mode cycle started. Level:', gameData.current.level, 'cycleIndex:', gameData.current.cycleIndex);
            } else {
              // Pre-wrap levels behave as before
              gameData.current.level++;
              console.log('Level completed! New level:', gameData.current.level);
              console.log('DEBUG: Lives after level completion:', gameData.current.lives, '(should be unchanged)');
              
              // Show level complete banner
              gameData.current.showLevelCompleteBanner = true;
              gameData.current.levelCompleteBannerLevel = gameData.current.level;
              gameData.current.levelCompleteBannerTimer = 90; // 90 frames (~1.5 seconds)
              
              // Apply level configuration
              applyLevelConfig(gameData.current, gameData.current.level);

              // Start next level after a brief delay
              setTimeout(() => {
                gameData.current.liftY = -LIFT_HEIGHT;
                gameData.current.leftLiftY = -LIFT_HEIGHT;
                gameData.current.rightLiftY = -LIFT_HEIGHT;
                gameData.current.centerLiftDir = 1;
                gameData.current.leftLiftDir = 1;
                gameData.current.rightLiftDir = 1;
                randomizeSideLiftSpeeds();
                gameData.current.fallDistance = 0;
                gameData.current.jumpCooldown = 30;
                gameData.current.hitCeiling = false; // Reset for next level
                gameData.current.survivedImpact = false; // Reset for next level
                gameData.current.wasJumpingAtImpact = false; // Reset for next level
                gameData.current.isJumping = false;
                gameData.current.jumpGracePeriod = 0;
                gameData.current.playerX = 0; // Reset horizontal position for next level
                gameData.current.playerVelocityX = 0; // Reset horizontal velocity for next level
                gameData.current.animationFrame = 0; // Reset animation for next level
                gameData.current.animationTimer = 0; // Reset animation timer for next level
                gameData.current.movementDirection = 0; // Reset movement direction for next level
                gameData.current.previousFloor = 30; // Reset floor tracking for next level
                
                // Reset levers and doors for next level
                gameData.current.redLeverTriggered = false;
                gameData.current.blueLeverTriggered = false;
                gameData.current.yellowLeverTriggered = false;
                gameData.current.centerDoorLeftOpen = false;
                gameData.current.centerDoorRightOpen = false;
                gameData.current.leftLiftDoorRightOpen = false;
                gameData.current.leftLiftDoorLeftOpen = false;
                gameData.current.rightLiftDoorLeftOpen = false;
                gameData.current.rightLiftDoorRightOpen = false;
                // Reset door animation progress
                gameData.current.doorOpenProgress = {
                  centerLeft: 0,
                  centerRight: 0,
                  leftLeft: 0,
                  leftRight: 0,
                  rightLeft: 0,
                  rightRight: 0
                };
                gameData.current.currentShaftIndex = 0;
                // Reset keys for next level
                gameData.current.leftKeyCollected = false;
                gameData.current.rightKeyCollected = false;
                
                // Reset shaft markers
                initializeShaftMarkers();
                // Ensure platforms auto-move at level start
                // Randomize platform densities for new level
                gameData.current.platformSpawnDensity = [
                  2 + Math.floor(Math.random() * 2),
                  2 + Math.floor(Math.random() * 2),
                  2 + Math.floor(Math.random() * 2),
                  2 + Math.floor(Math.random() * 2)
                ];
                logPlatformConfig();
                console.log('DEBUG: Next level started successfully');
              }, 1000); // 1 second delay before next level
            }
          }
        }
        // If survivedImpact is true, player is safe and won't die from cage impacts
      }
      if (false && liftBottomY >= CANVAS_HEIGHT - 20) {
        // Cage is very close to bottom (within 20 pixels) - capture jumping state
        if (gameData.current.isJumping) {
          gameData.current.wasJumpingAtImpact = true;
        }
      }
      
      // Update animated door progress before drawing
      updateDoorProgress();

      // Update Level 2 balloon dog hazards - DISABLED
      // updateBalloonDogs();

      // Update medical packs
      updateMedpacks();
      checkMedpackCollision();

      // Update meteors (hazard from above)
      updateMeteors();
      checkMeteorCollisions();

      // Update mushrooms (invincibility power-up, level 3+)
      updateMushrooms();
      checkMushroomCollision();

      // Update cowboy hat balloons (unlocked after level 4)
      updateCowboyHatBalloons();
      checkCowboyHatCollision();
      
      // Update UFOs (level 3+)
      updateUFOs();

      // Update dynamite balloons
      updateDynamiteBalloons();
      checkDynamiteBalloonCollision();

      // Update machine gun bullets
      updateBullets();
      checkMachineGunCollision();
      
      // Cleanup: Limit particle effects to prevent performance issues
      if (gameData.current.bloodSplatters && gameData.current.bloodSplatters.length > 200) {
        gameData.current.bloodSplatters = gameData.current.bloodSplatters.slice(-200);
      }
      if (gameData.current.bodyParts && gameData.current.bodyParts.length > 50) {
        gameData.current.bodyParts = gameData.current.bodyParts.slice(-50);
      }
      if (gameData.current.bullets && gameData.current.bullets.length > 100) {
        gameData.current.bullets = gameData.current.bullets.slice(-100);
      }

      // Draw lift cables (left, center, right)
      const { left: leftShaftX, center: centerShaftX, right: rightShaftX } = getShaftPositions();
      drawLiftCableAt(ctx, leftShaftX, gameData.current.leftLiftY);
      drawLiftCable(ctx); // center
      drawLiftCableAt(ctx, rightShaftX, gameData.current.rightLiftY);
      
      // Draw lifts (left, center, right) with door states and themes (animated)
      // Level2: Draw left lift with crushing ceiling if active
      if (gameData.current.level === 2 && gameData.current.leftCrushingCeilingActive) {
        drawLiftAt(ctx, leftShaftX, gameData.current.leftLiftY, { openLeft: gameData.current.leftLiftDoorLeftOpen, openRight: gameData.current.leftLiftDoorRightOpen, theme: 'red' });
        drawCrushingCeiling(ctx, leftShaftX, gameData.current.leftCrushingCeilingY);
      } else {
        drawLiftAt(ctx, leftShaftX, gameData.current.leftLiftY, { openLeft: gameData.current.leftLiftDoorLeftOpen, openRight: gameData.current.leftLiftDoorRightOpen, theme: 'red' });
      }
      
      // Level2: Draw center lift with crushing ceiling if active
      if (gameData.current.level === 2 && gameData.current.crushingCeilingActive) {
        drawLiftAt(ctx, centerShaftX, gameData.current.liftY, { openLeft: gameData.current.centerDoorLeftOpen, openRight: gameData.current.centerDoorRightOpen, theme: 'white' });
        drawCrushingCeiling(ctx, centerShaftX, gameData.current.crushingCeilingY);
      } else {
        drawLiftAt(ctx, centerShaftX, gameData.current.liftY, { openLeft: gameData.current.centerDoorLeftOpen, openRight: gameData.current.centerDoorRightOpen, theme: 'white' });
      }
      
      // Level2: Draw right lift with crushing ceiling if active
      if (gameData.current.level === 2 && gameData.current.rightCrushingCeilingActive) {
        drawLiftAt(ctx, rightShaftX, gameData.current.rightLiftY, { openLeft: gameData.current.rightLiftDoorLeftOpen, openRight: gameData.current.rightLiftDoorRightOpen, theme: 'blue' });
        drawCrushingCeiling(ctx, rightShaftX, gameData.current.rightCrushingCeilingY);
      } else {
        drawLiftAt(ctx, rightShaftX, gameData.current.rightLiftY, { openLeft: gameData.current.rightLiftDoorLeftOpen, openRight: gameData.current.rightLiftDoorRightOpen, theme: 'blue' });
      }

      // Draw cherries based on level configuration
      const config = gameData.current.currentLevelConfig || {};
      if (config.hasLeftCherry) {
        drawGoldenKeyLeft(ctx);
      }
      if (config.hasRightCherry) {
        drawGoldenKeyRight(ctx);
      }
      if (config.hasCenterCherry) {
        drawGoldenKeyCenter(ctx);
      }
      
      // Draw center levers on top
      drawLevers(ctx);

      // Draw small top platforms on columns so the player can stand/jump on them
      drawColumnTopPlatforms(ctx);

      // Draw hovering balloon dogs for Level 2 - DISABLED
      // drawBalloonDogs(ctx);
      
      // Draw UFOs (level 3+)
      drawUFOs(ctx);

      // Draw medical packs
      drawMedpacks(ctx);

      // Draw meteors (hazard from above)
      drawMeteors(ctx);

      // Draw mushrooms (invincibility power-up)
      drawMushrooms(ctx);

      // Draw cowboy hat balloons (unlocked after level 4)
      drawCowboyHatBalloons(ctx);

      // Draw dynamite balloons
      drawDynamiteBalloons(ctx);

      // Draw machine gun drops
      drawMachineGunDrops(ctx);

      // Draw bullets
      drawBullets(ctx);

      // Draw player (positioned to stand on current ground)
      const currentIdx = gameData.current.currentShaftIndex || 0;
      const shaftXForPlayer = getShaftXByIndex(currentIdx);
      const liftCenterXForPlayer = shaftXForPlayer + (SHAFT_WIDTH - PLAYER_WIDTH) / 2;
      const playerX = liftCenterXForPlayer + gameData.current.playerX; // Add horizontal offset
      
      // Calculate player Y to stand on ground (lift floor or top platform)
      let playerY;
      if (gameData.current.isJumping) {
        // Use stored jump position during jump
        playerY = gameData.current.playerY;
      } else if (gameData.current.onOutsidePlatform) {
        // Riding moving platform block keeps Y synced already
        playerY = gameData.current.playerY;
      } else if (gameData.current.onTopOfLift) {
        // Recompute exact Y to stay glued to the lift's top-cap
        const ly = getColumnTopYByIndex(currentIdx);
        const platTop = ly - TOP_PLATFORM_HEIGHT;
        playerY = platTop - PLAYER_HEIGHT - FOOT_CLEARANCE;
        gameData.current.playerY = playerY;
      } else {
        // Snap to current lift floor
        const groundY = getGroundPlayerYByIndex(currentIdx);
        playerY = groundY;
        gameData.current.playerY = playerY;
      }
      
      // Show death gore explosion effects or normal player
      if (Date.now() < gameData.current.deathEffectUntil) {
        // Show death gore effects - ONLY gore explosion, no stickman
        updateBodyParts();
        drawBloodSplatters(ctx);
        // Draw flying body parts
        gameData.current.bodyParts.forEach(part => {
          ctx.fillStyle = part.color;
          ctx.fillRect(part.x, part.y, part.width, part.height);
          
          // Add blood trail
          if (part.bloodTrail) {
            part.bloodTrail.forEach(blood => {
              ctx.fillStyle = `rgba(255, 0, 0, ${blood.alpha})`;
              ctx.fillRect(blood.x, blood.y, 2, 2);
            });
          }
        });
      } else {
        drawPlayer(ctx, playerX, playerY);
      }
      
      // Draw speed blur effect at higher levels (optional)
      if (ENABLE_SPEED_LINES && gameData.current.level > 3) {
        ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
        for (let i = 0; i < gameData.current.level - 3; i++) {
          ctx.fillRect(0, Math.random() * CANVAS_HEIGHT, CANVAS_WIDTH, 2);
        }
      }
      
      // Draw level complete banner if active
      if (gameData.current.showLevelCompleteBanner && gameData.current.levelCompleteBannerTimer > 0) {
        drawLevelCompleteBanner(ctx, gameData.current.levelCompleteBannerLevel);
        gameData.current.levelCompleteBannerTimer--;
        
        if (gameData.current.levelCompleteBannerTimer <= 0) {
          gameData.current.showLevelCompleteBanner = false;
        }
      }
      
    }
    
    if (gameState === GAME_STATES.DEAD) {
      // Draw lift cables (left, center, right)
      const { left: leftShaftX, center: centerShaftX, right: rightShaftX } = getShaftPositions();
      drawLiftCableAt(ctx, leftShaftX, gameData.current.leftLiftY);
      drawLiftCable(ctx); // center
      drawLiftCableAt(ctx, rightShaftX, gameData.current.rightLiftY);
      
      // Update animated door progress before drawing
      updateDoorProgress();
      
      // Draw lifts (left, center, right) with door states and themes (animated)
      drawLiftAt(ctx, leftShaftX, gameData.current.leftLiftY, { openLeft: gameData.current.leftLiftDoorLeftOpen, openRight: gameData.current.leftLiftDoorRightOpen, theme: 'red' });
      drawLiftAt(ctx, centerShaftX, gameData.current.liftY, { openLeft: gameData.current.centerDoorLeftOpen, openRight: gameData.current.centerDoorRightOpen, theme: 'white' });
      drawLiftAt(ctx, rightShaftX, gameData.current.rightLiftY, { openLeft: gameData.current.rightLiftDoorLeftOpen, openRight: gameData.current.rightLiftDoorRightOpen, theme: 'blue' });

      // Draw cherries based on level configuration (also visible on death screen)
      const deathConfig = gameData.current.currentLevelConfig || {};
      if (deathConfig.hasLeftCherry) {
        drawGoldenKeyLeft(ctx);
      }
      if (deathConfig.hasRightCherry) {
        drawGoldenKeyRight(ctx);
      }
      if (deathConfig.hasCenterCherry) {
        drawGoldenKeyCenter(ctx);
      }
      
      // Draw center levers
      drawLevers(ctx);

      // Show balloon dogs on death screen as well - DISABLED
      // drawBalloonDogs(ctx);
      
      // Show UFOs on death screen as well
      drawUFOs(ctx);

      // Show medical packs on death screen as well
      drawMedpacks(ctx);

      // Show meteors on death screen as well
      drawMeteors(ctx);

      // Show mushrooms on death screen as well
      drawMushrooms(ctx);

      // Show cowboy hat balloons on death screen as well
      drawCowboyHatBalloons(ctx);

      // Show dynamite balloons on death screen as well
      drawDynamiteBalloons(ctx);

      // Update and draw gore - ONLY gore, no stickman
      updateBodyParts();
      
      drawBloodSplatters(ctx);
      
      // Draw flying body parts
      gameData.current.bodyParts.forEach(part => {
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, part.width, part.height);
        
        // Add blood trail
        if (part.bloodTrail) {
          part.bloodTrail.forEach(blood => {
            ctx.fillStyle = `rgba(255, 0, 0, ${blood.alpha})`;
            ctx.fillRect(blood.x, blood.y, 2, 2);
          });
        }
      });
      
      gameData.current.deathAnimation++;
      
      // Draw "GAME OVER" text
      if (gameData.current.deathAnimation > 60) {
        drawPixelText(ctx, 'GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80, 6, COLORS.RED);
        const levelLabelGO = (gameData.current.wrapModeEnabled && gameData.current.level >= 3 && gameData.current.cycleIndex === 1)
          ? `${gameData.current.level}.1`
          : `${gameData.current.level}`;
        drawPixelText(ctx, `REACHED LEVEL ${levelLabelGO}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30, 3, COLORS.YELLOW);
        drawPixelText(ctx, `FINAL SCORE: ${gameData.current.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 3, COLORS.WHITE);
        drawPixelText(ctx, 'PRESS SPACE TO RESTART', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40, 3, COLORS.GREEN);
      }
    }
    
    // Title screen now handles PRESS START on title canvas
    
    // Update high score
    if (gameData.current.score > gameData.current.highScore) {
      gameData.current.highScore = gameData.current.score;
      localStorage.setItem('liftyHighScore', gameData.current.highScore.toString());
    }
    // Throttled auto-save every ~1s (only while playing)
    if (gameState === GAME_STATES.PLAYING) {
      const now = performance.now();
      if (!gameData.current.lastAutoSaveAt || now - gameData.current.lastAutoSaveAt > 1000) {
        saveSnapshot();
        gameData.current.lastAutoSaveAt = now;
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, drawPlatforms, drawLift, drawLiftCable, drawLevelBackground, calculateDynamicSpeed, handleJump, drawStatsCanvas, drawFrontCanvas, drawTitleCanvas, updateBalloonDogs, drawBalloonDogs, updateUFOs, drawUFOs, updateMedpacks, drawMedpacks, checkMedpackCollision, updateMushrooms, drawMushrooms, checkMushroomCollision, updateCowboyHatBalloons, drawCowboyHatBalloons, checkCowboyHatCollision, updateDynamiteBalloons, drawDynamiteBalloons, checkDynamiteBalloonCollision]);
  // Helper to start the game from MENU (shared for front overlay click)
  const startGameNow = useCallback(async () => {
    await ensureAudioReady();
    setGameState(GAME_STATES.PLAYING);
    gameData.current.score = 0;
    gameData.current.level = 1;
    gameData.current.lives = 3;
    // Ensure platform densities are set (in case not already initialized)
    if (!gameData.current.platformSpawnDensity || gameData.current.platformSpawnDensity.length === 0) {
      gameData.current.platformSpawnPhases = [0, 1, 0, 1];
      gameData.current.platformSpawnDensity = [2, 2, 2, 2];
    }
    // Apply level 1 configuration
    applyLevelConfig(gameData.current, 1);
    gameData.current.liftY = -LIFT_HEIGHT;
    gameData.current.leftLiftY = -LIFT_HEIGHT;
    gameData.current.rightLiftY = -LIFT_HEIGHT;
    gameData.current.centerLiftDir = 1;
    gameData.current.leftLiftDir = 1;
    gameData.current.rightLiftDir = 1;
    randomizeSideLiftSpeeds();
    gameData.current.fallDistance = 0;
    gameData.current.isJumping = false;
    gameData.current.playerY = getGroundPlayerYByIndex(0);
    gameData.current.playerX = 0;
    gameData.current.playerVelocityX = 0;
    gameData.current.animationFrame = 0;
    gameData.current.animationTimer = 0;
    gameData.current.movementDirection = 0;
    gameData.current.bodyParts = [];
    gameData.current.bloodSplatters = [];
    gameData.current.deathAnimation = 0;
    gameData.current.perfectJump = false;
    gameData.current.jumpGracePeriod = 0;
    gameData.current.survivedImpact = false;
    gameData.current.hitCeiling = false;
    // Initialize medpack system
    gameData.current.medpacks = [];
    gameData.current.medpackSpawnTimer = 300 + Math.random() * 300; // First spawn in 5-10 seconds
    // Initialize meteor system (hazard from above, level 5+)
    gameData.current.meteors = [];
    gameData.current.meteorSpawnTimer = 1200 + Math.random() * 900; // First spawn in 20-35 seconds (occasional)
    // Initialize mushroom system (invincibility power-up, level 3+)
    gameData.current.mushrooms = [];
    gameData.current.mushroomSpawnTimer = 1800 + Math.random() * 900; // First spawn in 30-45 seconds
    gameData.current.invincible = false;
    gameData.current.invincibleUntil = 0;
    // Initialize cowboy hat system (unlocked after level 4)
    gameData.current.cowboyHatBalloons = [];
    gameData.current.cowboyHatSpawnTimer = 600 + Math.random() * 600; // First spawn in 10-20 seconds
    gameData.current.hasCowboyHat = false;
    // Initialize dynamite balloon system
    gameData.current.dynamiteBalloons = [];
    gameData.current.dynamiteBalloonSpawnTimer = 400 + Math.random() * 400; // First spawn in 7-13 seconds
    // Initialize fruit collection system
    initializeFruitPlacements(1); // Start with level 1
    gameData.current.wasJumpingAtImpact = false;
    gameData.current.previousFloor = 30;
    gameData.current.wrapModeEnabled = false;
    gameData.current.cycleIndex = 0;
    gameData.current.forceMaxSpeed = false;
    gameData.current.goldenKeys = 0;
    gameData.current.leftKeyCollected = false;
    gameData.current.centerKeyCollected = false;
    gameData.current.rightKeyCollected = false;
    initializeShaftMarkers();
    // Ensure UFO sound is stopped when starting game
    if (ufoSoundRef.current) {
      ufoSoundRef.current.pause();
      ufoSoundRef.current.currentTime = 0;
    }
  }, []);

  // Initialize game
useEffect(() => {
    // Log device detection info for debugging
    const device = detectDeviceType();
    const screenInfo = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      isPortrait: window.innerHeight > window.innerWidth
    };
    console.log('🎮 Lifty Game - Device Detection:', {
      type: device.isMobile ? 'Mobile' : device.isTablet ? 'Tablet' : 'Desktop',
      ...device,
      screen: screenInfo,
      autoScale: uiScale,
      userAgent: navigator.userAgent
    });
    
    console.log('🎮 Controls Available:');
    if (device.isDesktop) {
      console.log('  ⌨️ Keyboard: Arrow Keys (←/→) to move, SPACE/↑ to jump');
      console.log('  🖱️ Mouse: Click the on-screen buttons below the game');
    } else {
      console.log('  👆 Touch: Tap the buttons below the game canvas');
      console.log('  🔵 Left/Right buttons: Move horizontally');
      console.log('  🔴 Center JUMP button: Jump');
    }
    console.log('  📊 Stats Bar: Click/tap to see detailed stats');
    
    // Do not initialize AudioContext here to satisfy autoplay policies
    initializeStickmanSprite();
    initializeBackgroundImages();
    initializeDingSound(); // Initialize ding sound for lift movement
    initializeTingSound(); // Initialize ting sound for key collection
    initializeLevelSound(); // Initialize level activation sound
    initializeDoorSound(); // Initialize door sliding sound
    initializeSplatSound(); // Initialize death splat sound
    initializeOxySound(); // Initialize oxy sound for sound toggle
    initializeUfoSound(); // Initialize UFO ambient sound
    initializeMedicSound(); // Initialize medic balloon sound
    initializePopSound(); // Initialize pop sound for medic balloon destruction
    initializeGunSound(); // Initialize machine gun sound
    initializeChuteSound(); // Initialize parachute deployment sound
    initializeMeteorSound(); // Initialize meteor ambient sound
    initializeTitleImage();
    initializeShaftMarkers();
    
    // Start game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Add touch event listeners for mobile
    const canvas = canvasRef.current;
    const controlsCanvas = controlsCanvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouch, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      canvas.addEventListener('click', handleTouch);
    }

    // Front overlay click/touch to start
    const frontCanvas = frontCanvasRef.current;
    if (frontCanvas) {
      const startHandler = () => { if (gameState === GAME_STATES.MENU) startGameNow(); };
      frontCanvas.addEventListener('click', startHandler);
      frontCanvas.addEventListener('touchstart', startHandler, { passive: false });
    }
    
    // Add event listeners for controls canvas
    if (controlsCanvas) {
      controlsCanvas.addEventListener('touchstart', handleControlsTouch, { passive: false });
      controlsCanvas.addEventListener('touchmove', handleControlsTouchMove, { passive: false });
      controlsCanvas.addEventListener('touchend', handleControlsTouchEnd, { passive: false });
      controlsCanvas.addEventListener('mousedown', handleControlsMouseDown);
      controlsCanvas.addEventListener('mouseup', handleControlsMouseUp);
    }
    
    // Add event listeners for dial canvas
    const dialCanvas = dialCanvasRef.current;
    if (dialCanvas) {
      dialCanvas.addEventListener('click', handleDialClick);
      dialCanvas.addEventListener('mousemove', handleDialMouseMove);
      dialCanvas.addEventListener('touchstart', handleDialClick, { passive: false });
      // Initialize dial position based on current scale
      const index = SCALE_OPTIONS.indexOf(uiScale);
      if (index !== -1) {
        dialAnimationRef.current.targetAngle = (index - 2) * 45;
        dialAnimationRef.current.currentAngle = (index - 2) * 45;
      }
      drawDialCanvas();
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouch);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('click', handleTouch);
      }
      
      if (controlsCanvas) {
        controlsCanvas.removeEventListener('touchstart', handleControlsTouch);
        controlsCanvas.removeEventListener('touchmove', handleControlsTouchMove);
        controlsCanvas.removeEventListener('touchend', handleControlsTouchEnd);
        controlsCanvas.removeEventListener('mousedown', handleControlsMouseDown);
        controlsCanvas.removeEventListener('mouseup', handleControlsMouseUp);
      }
      if (dialCanvas) {
        dialCanvas.removeEventListener('click', handleDialClick);
        dialCanvas.removeEventListener('mousemove', handleDialMouseMove);
        dialCanvas.removeEventListener('touchstart', handleDialClick);
      }
      if (frontCanvas) {
        // Remove overlay listeners
        frontCanvas.replaceWith(frontCanvas); // no-op to detach listeners safely if needed
      }
    };
  }, [gameLoop, handleKeyDown, handleKeyUp, handleTouch, handleTouchEnd, handleControlsTouch, handleControlsTouchMove, handleControlsTouchEnd, handleControlsMouseDown, handleControlsMouseUp, handleDialClick, handleDialMouseMove, drawDialCanvas, uiScale, initializeShaftMarkers, initializeStickmanSprite, initializeBackgroundImages, initializeDingSound, initializeTingSound, initializeLevelSound, initializeDoorSound, initializeSplatSound, initializeOxySound, initializeUfoSound, initializeMedicSound, initializePopSound, initializeGunSound, initializeChuteSound, initializeMeteorSound, initializeTitleImage]);

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: deviceInfo.isMobile || deviceInfo.isTablet ? '10px' : '20px', 
      maxWidth: '100%',
      width: '100%',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      {/* Dial Control */}
      <div style={{ margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <canvas
          ref={dialCanvasRef}
          width={80}
          height={80}
          style={{
            imageRendering: 'pixelated',
            border: '2px solid #222',
            borderRadius: '6px',
            backgroundColor: '#1a1a1a',
            boxShadow: '0 3px 6px rgba(0,0,0,0.5)',
            cursor: 'pointer'
          }}
        />
      </div>

      {/* Scaled content wrapper (only canvases are scaled) */}
      <div style={{ 
        position: 'relative', 
        display: 'inline-block', 
        transform: `scale(${uiScale})`, 
        transformOrigin: 'top center',
        width: '100%',
        maxWidth: `${CANVAS_WIDTH}px`
      }}>
      {/* Title canvas - shows game title and logo (only during menu) */}
      <canvas
        ref={titleCanvasRef}
        width={680}
        height={120}
        style={{
          imageRendering: 'pixelated',
          display: gameState === GAME_STATES.MENU ? 'block' : 'none',
          margin: '0 auto 10px auto',
          width: '100%',
          maxWidth: '680px',
          height: 'auto',
          backgroundColor: 'transparent'
        }}
      />
      {/* Stats canvas - shows level, lives, keys, score */}
      <canvas
        ref={statsCanvasRef}
        width={680}
        height={60}
        onClick={handleStatsClick}
        style={{
          imageRendering: 'pixelated',
          display: 'block',
          margin: deviceInfo.isMobile || deviceInfo.isTablet ? '0 auto' : '-20px auto 0 auto',
          width: '100%',
          maxWidth: '680px',
          height: 'auto',
          cursor: 'pointer'
        }}
      />
      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          imageRendering: 'pixelated',
          display: 'block',
          margin: '0 auto',
          border: deviceInfo.isMobile || deviceInfo.isTablet ? '4px solid #000' : '8px solid #000',
          width: '100%',
          maxWidth: `${CANVAS_WIDTH}px`,
          height: 'auto',
          boxSizing: 'border-box'
        }}
      />
      {/* Mobile controls canvas */}
      <canvas
        ref={controlsCanvasRef}
        width={680}
        height={240}
        style={{
          imageRendering: 'pixelated',
          display: 'block',
          margin: deviceInfo.isMobile || deviceInfo.isTablet ? '5px auto 10px auto' : '0 auto 0 auto',
          backgroundColor: 'transparent',
          width: '100%',
          maxWidth: '680px',
          height: 'auto',
          pointerEvents: 'auto',
          touchAction: 'none',
          cursor: 'pointer',
          boxSizing: 'border-box'
        }}
      />
        {/* Front overlay canvas (covers all until start) */}
        <canvas
          ref={frontCanvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: gameState === GAME_STATES.MENU ? 'block' : 'none',
            pointerEvents: gameState === GAME_STATES.MENU ? 'auto' : 'none',
            imageRendering: 'pixelated',
            width: '100%',
            height: '100%'
          }}
        />
      </div>
    </div>
  );
};

export default LiftyGame;