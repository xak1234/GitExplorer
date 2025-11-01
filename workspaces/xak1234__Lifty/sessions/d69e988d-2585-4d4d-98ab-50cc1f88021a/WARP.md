# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Lifty** is a retro-style pixel-art React Canvas horror game where players control a stick figure inside a falling elevator lift. The objective is to survive by jumping at the perfect moment to avoid being crushed, with progressive difficulty across levels.

## Development Commands

### Core Development
```bash
# Start development server (runs on http://localhost:3000)
npm start
# or
npm run dev

# Build for production
npm run build

# Build for render deployment (with CI=false)
npm run build:render

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Eject from Create React App (irreversible)
npm run eject
```

### Package Management
```bash
# Install dependencies
npm install

# Install new dependency
npm install <package-name>

# Install dev dependency
npm install --save-dev <package-name>

# Update dependencies
npm update
```

### Testing Commands
```bash
# Run specific test file
npm test -- App.test.js

# Run tests with coverage
npm test -- --coverage

# Run tests in non-interactive mode
npm test -- --watchAll=false
```

## Architecture Overview

### Project Structure
- **Monolithic React Component**: Single main game component (`LiftyGame.js`) containing all game logic
- **Canvas-Based Rendering**: Uses HTML5 Canvas with pixel-perfect rendering for retro aesthetic
- **Real-Time Game Loop**: `requestAnimationFrame` for 60fps gameplay with physics simulation
- **Asset Management**: Images and audio loaded via public folder with error handling

### Core Game Components

#### Main Game Component (`src/components/LiftyGame.js`)
- **~1,700 lines** - Contains entire game engine, physics, rendering, and state management
- **Game States**: `MENU`, `PLAYING`, `DEAD` with transitions
- **Physics System**: Custom gravity, collision detection, and jump mechanics
- **Audio System**: Web Audio API for retro sound effects + HTML5 Audio for background sounds
- **Animation System**: Sprite-based character animation with frame timing

#### Key Game Systems
- **Dynamic Speed**: Progressive difficulty with exponential acceleration based on fall distance
- **Gore System**: Realistic physics for detached body parts and blood splatter effects
- **Asset Loading**: Background images, sprite sheets, and audio with fallback handling
- **Input System**: Keyboard controls + mobile touch support with on-screen buttons
- **Persistence**: High score storage via localStorage

### Technical Details

#### Canvas Configuration
- **Main Canvas**: 680×750px with pixelated rendering
- **Title Canvas**: Overlay for UI elements and game state display
- **Controls Canvas**: Mobile touch controls overlay
- **Rendering**: `imageSmoothingEnabled: false` for pixel-perfect graphics

#### Asset Structure
```
public/
├── images/           # Background images for different levels
│   ├── back.jpg     # Title screen background
│   ├── lift1.jpg    # Level 1 background
│   ├── lift2.jpg    # Level 2 background
│   └── ...
├── sound/
│   └── ding.mp3     # Floor indicator sound
└── stickman.png     # Player sprite sheet
```

#### Game Constants
- **Canvas**: 680×750px (reduced from original 800×700 for mobile)
- **Player**: 28×72px sprite with 4-frame walk animation
- **Lift**: 100×150px with 225px wide shaft
- **Physics**: Custom gravity system with jump velocity and ceiling collision

### State Management Pattern
The game uses a single `useRef` object (`gameData.current`) to store all mutable game state, avoiding React re-renders during the game loop. Key state includes:
- **Game Progress**: score, level, lives, highScore
- **Physics**: playerY, playerX, liftY, jumpVelocity, isJumping  
- **Animation**: animationFrame, deathAnimation, bloodSplatters
- **Timing**: jumpStartTime, jumpCooldown, perfectJumpWindow

### Performance Considerations
- **Game Loop**: Uses `requestAnimationFrame` to maintain smooth 60fps
- **Asset Preloading**: All images and audio loaded on component mount with error handling
- **Memory Management**: Canvas cleared and redrawn each frame, temporary objects cleaned up
- **Mobile Optimization**: Reduced canvas size and touch controls for mobile devices

## Game Rules Integration

### Idle State Behavior  
**Important**: If the game is left at the welcome screen for 20 seconds without user interaction, play `pacvid.mp4` until the user interacts. This is a requirement that needs implementation - the video file should be placed in the public folder and integrated into the menu state logic.

### Implementation Pattern for Idle Video
```javascript
// In LiftyGame component, add idle timer logic:
const idleTimerRef = useRef(null);
const videoRef = useRef(null);

// Reset idle timer on user interaction
const resetIdleTimer = () => {
  if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  idleTimerRef.current = setTimeout(() => {
    if (gameState === GAME_STATES.MENU) {
      // Play pacvid.mp4
    }
  }, 20000);
};
```

## Development Tips

### Debugging Game State
- Game state is logged to console during development
- Use browser DevTools to inspect canvas rendering
- Audio loading status logged to console with success/error messages
- Lives display includes debug logging for UI positioning

### Mobile Testing
- Touch controls available on mobile devices
- Test on various screen sizes - canvas scales appropriately
- Audio requires user interaction to start (Web Audio API limitation)

### Asset Management
- Images loaded with error handling and fallback behavior
- Audio files support both Web Audio (effects) and HTML5 Audio (background)
- All assets should be placed in `public/` folder for proper loading

### Performance Debugging
- Monitor frame rate in browser DevTools Performance tab
- Check for memory leaks during extended play sessions
- Audio context initialized on first user interaction to comply with browser policies

## Node.js Version
This project requires Node.js ≥16.0.0 (configured in `.nvmrc` as 18.18.0). Use `nvm use` to switch to the correct version.

## Browser Compatibility
- Modern browsers with Canvas and Web Audio API support
- Mobile Safari and Chrome for touch controls
- Pixelated rendering may vary across browsers but fallbacks are handled

## Testing Strategy
- Basic component rendering tests included
- Canvas element presence verification
- Manual testing required for game mechanics, physics, and audio
- Cross-browser testing recommended for audio and rendering consistency