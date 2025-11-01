# Lifty - Pixel Horror Game

A retro-style pixel-art React Canvas game where you control a stick man inside a falling lift. Survive by jumping at the perfect moment!

## 🎮 How to Play

- **Objective**: Survive the falling lift by jumping at the right time
- **Controls**: 
  - `SPACEBAR` or `UP ARROW` to jump
  - **Mobile**: Tap the screen to jump
  - Time your jump perfectly as the lift approaches the bottom
- **Timing**:
  - Jump too early = Hit the ceiling and die
  - Jump too late = Get crushed and die  
  - Perfect timing = Survive and advance to the next level

## 🎯 Game Features

- **Progressive Difficulty**: Lift falls faster each level
- **Gore Mode**: Always enabled - see realistic death animations with detaching limbs and blood splatters
- **Pixel Art Style**: Authentic 1980s arcade aesthetic
- **Visual Effects**: 
  - Moving shaft markers to simulate motion
  - Speed blur effects at higher levels
  - Background stars for space-shaft atmosphere
  - Monsters lining the shaft walls
- **Audio Effects**: Retro 8-bit style sound effects for jumps, deaths, and level progression
- **Mobile Support**: Touch controls for mobile devices
- **Score System**: Points awarded based on level completion
- **High Score**: Automatically saved to browser storage

## 🚀 Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd lifty-game
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser and go to `http://localhost:3000`

## 🎨 Technical Details

- **Framework**: React 18
- **Rendering**: HTML5 Canvas with pixel-perfect rendering
- **Game Loop**: Uses `requestAnimationFrame()` for smooth 60fps gameplay
- **Physics**: Custom gravity and collision detection
- **Art Style**: 32x32 pixel sprites with consistent retro color palette
- **Audio**: Web Audio API for retro sound effects

## 🎪 Game Mechanics

### Timing System
- **Impact Zone**: Yellow highlighted area where perfect jumps should occur
- **Perfect Jump Window**: 30 frames of optimal timing
- **Jump Cooldown**: Prevents spam jumping

### Gore System
- Realistic physics for detached body parts
- Blood splatter effects with particle trails
- Bouncing limbs inside the lift compartment
- Fading blood trails for dramatic effect

### Difficulty Progression
- Lift speed increases by 0.5 units per level
- Speed blur effects intensify at higher levels
- Score multiplier increases with level

## 🛠️ Development

The game is built with modern React patterns:
- Functional components with hooks
- `useRef` for game state management
- `useCallback` for performance optimization
- Canvas 2D context for pixel-perfect rendering

### File Structure
```
src/
├── components/
│   └── LiftyGame.js    # Main game component
├── App.js              # React app entry point
└── index.js           # DOM rendering
```

## 🎮 Controls Summary

| Key | Action |
|-----|--------|
| `SPACE` | Jump / Start Game / Restart |
| `UP ARROW` | Jump / Start Game / Restart |
| `TAP SCREEN` | Jump / Start Game / Restart (Mobile) |

## 🏆 Scoring

- Base score per level: `Level × 100 points`
- Bonus points for consecutive perfect jumps
- High score automatically saved locally

---

**Enjoy the terror of the falling lift! Can you survive longer than 10 levels?** 🎯
