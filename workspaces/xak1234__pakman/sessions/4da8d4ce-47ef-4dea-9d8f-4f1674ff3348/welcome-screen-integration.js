// Integration code for adding mobile instructions popup to WelcomeScreen
// This shows how to modify the existing WelcomeScreen component in index.html

// 1. First, add the MobileInstructionsPopup component code to the script section (before WelcomeScreen):

function MobileInstructionsPopup({ isOpen, onClose }) {
  const [currentSection, setCurrentSection] = useState(0);

  if (!isOpen) return null;

  const sections = [
    {
      title: "🎮 Getting Started",
      content: React.createElement('div', { className: "space-y-4" },
        React.createElement('div', { className: "bg-blue-900/30 rounded-lg p-3 border border-blue-400/30" },
          React.createElement('h4', { className: "font-bold text-blue-300 mb-2" }, "Choose Your Mode:"),
          React.createElement('ul', { className: "text-sm space-y-2" },
            React.createElement('li', { className: "flex items-center gap-2" },
              React.createElement('span', { className: "text-blue-400" }, "🎨"),
              React.createElement('span', null, 
                React.createElement('strong', null, "Design Levels"), " - Create custom Pac-Man levels"
              )
            ),
            React.createElement('li', { className: "flex items-center gap-2" },
              React.createElement('span', { className: "text-green-400" }, "🎮"),
              React.createElement('span', null,
                React.createElement('strong', null, "Play Levels"), " - Play saved levels"
              )
            ),
            React.createElement('li', { className: "flex items-center gap-2" },
              React.createElement('span', { className: "text-purple-400" }, "🌐"),
              React.createElement('span', null,
                React.createElement('strong', null, "Multiplayer"), " - Play with up to 4 players"
              )
            )
          )
        ),
        React.createElement('p', { className: "text-gray-300 text-sm" },
          "Start with ", React.createElement('strong', null, "Play Levels"), " to try the built-in levels, or jump into ", React.createElement('strong', null, "Design"), " to create your own!"
        )
      )
    },
    {
      title: "🕹️ Mobile Controls",
      content: React.createElement('div', { className: "space-y-4" },
        React.createElement('div', { className: "bg-green-900/30 rounded-lg p-3 border border-green-400/30" },
          React.createElement('h4', { className: "font-bold text-green-300 mb-2" }, "Movement Controls:"),
          React.createElement('ul', { className: "text-sm space-y-1" },
            React.createElement('li', null, "• Use the ", React.createElement('strong', null, "directional pad"), " at the bottom"),
            React.createElement('li', null, "• Tap arrow buttons: ", React.createElement('strong', null, "↑ ← ↓ →")),
            React.createElement('li', null, "• Swipe gestures also work")
          )
        ),
        React.createElement('div', { className: "bg-yellow-900/30 rounded-lg p-3 border border-yellow-400/30" },
          React.createElement('h4', { className: "font-bold text-yellow-300 mb-2" }, "Action Buttons:"),
          React.createElement('ul', { className: "text-sm space-y-1" },
            React.createElement('li', null, "• ", React.createElement('strong', null, "⏸/▶ Pause"), " - Pause/resume game"),
            React.createElement('li', null, "• Center dot shows your direction")
          )
        ),
        React.createElement('div', { className: "bg-purple-900/30 rounded-lg p-3 border border-purple-400/30" },
          React.createElement('h4', { className: "font-bold text-purple-300 mb-2" }, "Customization:"),
          React.createElement('p', { className: "text-sm" },
            React.createElement('strong', null, "Drag the controls"), " using corner handles to reposition them perfectly for your thumbs!"
          )
        )
      )
    },
    {
      title: "🎯 Game Objectives",
      content: React.createElement('div', { className: "space-y-4" },
        React.createElement('div', { className: "bg-blue-900/30 rounded-lg p-3 border border-blue-400/30" },
          React.createElement('h4', { className: "font-bold text-blue-300 mb-2" }, "Single Player:"),
          React.createElement('ul', { className: "text-sm space-y-1" },
            React.createElement('li', null, "• Eat all white pellets to complete level"),
            React.createElement('li', null, "• Avoid ghosts (unless power mode active)"),
            React.createElement('li', null, "• Collect power pellets to turn ghosts blue"),
            React.createElement('li', null, "• Eat blue ghosts for bonus points!")
          )
        ),
        React.createElement('div', { className: "bg-purple-900/30 rounded-lg p-3 border border-purple-400/30" },
          React.createElement('h4', { className: "font-bold text-purple-300 mb-2" }, "Multiplayer (up to 4 players):"),
          React.createElement('ul', { className: "text-sm space-y-1" },
            React.createElement('li', null, "• 🏆 ", React.createElement('strong', null, "Competitive"), ": Race to collect most pellets"),
            React.createElement('li', null, "• Each player has different colored Pac-Man"),
            React.createElement('li', null, "• Real-time counter shows who's leading")
          )
        )
      )
    },
    {
      title: "🍒 Special Items & Ghosts",
      content: React.createElement('div', { className: "space-y-4" },
        React.createElement('div', { className: "bg-red-900/30 rounded-lg p-3 border border-red-400/30" },
          React.createElement('h4', { className: "font-bold text-red-300 mb-2" }, "Special Items:"),
          React.createElement('ul', { className: "text-sm space-y-1" },
            React.createElement('li', null, "• ", React.createElement('strong', null, "🟡 Power Pellets"), " - Make ghosts vulnerable"),
            React.createElement('li', null, "• ", React.createElement('strong', null, "🍒 Cherries"), " - Activate \"Hunt Mode\""),
            React.createElement('li', null, "• ", React.createElement('strong', null, "💖 Extra Lives"), " - Gain additional life"),
            React.createElement('li', null, "• ", React.createElement('strong', null, "🌀 Portals"), " - Teleport between pairs")
          )
        ),
        React.createElement('div', { className: "bg-gray-900/30 rounded-lg p-3 border border-gray-400/30" },
          React.createElement('h4', { className: "font-bold text-gray-300 mb-2" }, "Ghost Behavior:"),
          React.createElement('ul', { className: "text-sm space-y-1" },
            React.createElement('li', null, "• ", React.createElement('strong', null, "Normal Ghosts"), ": Chase you with smart AI"),
            React.createElement('li', null, "• ", React.createElement('strong', null, "Blue Ghosts"), ": Flee from you (eat for points!)"),
            React.createElement('li', null, "• ", React.createElement('strong', null, "Black Ghosts"), ": Move through black tiles"),
            React.createElement('li', null, "• ", React.createElement('strong', null, "Ghost Doors"), ": Only ghosts can pass (cyan)")
          )
        )
      )
    },
    {
      title: "📱 Mobile Tips & Designer",
      content: React.createElement('div', { className: "space-y-4" },
        React.createElement('div', { className: "bg-green-900/30 rounded-lg p-3 border border-green-400/30" },
          React.createElement('h4', { className: "font-bold text-green-300 mb-2" }, "Mobile Tips:"),
          React.createElement('ul', { className: "text-sm space-y-1" },
            React.createElement('li', null, "• Board auto-scales to fit your screen"),
            React.createElement('li', null, "• Pan/scroll for large levels"),
            React.createElement('li', null, "• Drag stats panel to preferred position"),
            React.createElement('li', null, "• Use landscape mode for better visibility")
          )
        ),
        React.createElement('div', { className: "bg-orange-900/30 rounded-lg p-3 border border-orange-400/30" },
          React.createElement('h4', { className: "font-bold text-orange-300 mb-2" }, "Level Designer:"),
          React.createElement('ul', { className: "text-sm space-y-1" },
            React.createElement('li', null, "• Tap tools, then tap grid to place"),
            React.createElement('li', null, "• Use ", React.createElement('strong', null, "Mirror Mode"), " for symmetry"),
            React.createElement('li', null, "• Required: Pac Spawn 🟡 & Ghost Spawn 👻"),
            React.createElement('li', null, "• Choose from 8 wall colors"),
            React.createElement('li', null, "• Levels auto-save as you create")
          )
        )
      )
    },
    {
      title: "🌐 Multiplayer & Scoring",
      content: React.createElement('div', { className: "space-y-4" },
        React.createElement('div', { className: "bg-purple-900/30 rounded-lg p-3 border border-purple-400/30" },
          React.createElement('h4', { className: "font-bold text-purple-300 mb-2" }, "Multiplayer Setup:"),
          React.createElement('div', { className: "text-sm space-y-2" },
            React.createElement('div', null,
              React.createElement('strong', null, "Hosting:"), " Tap \"🏠 Multiplayer\" → Select players → Share code → Start"
            ),
            React.createElement('div', null,
              React.createElement('strong', null, "Joining:"), " Tap \"🔍 Multiplayer Games\" → Find game → Join"
            )
          )
        ),
        React.createElement('div', { className: "bg-yellow-900/30 rounded-lg p-3 border border-yellow-400/30" },
          React.createElement('h4', { className: "font-bold text-yellow-300 mb-2" }, "Scoring System:"),
          React.createElement('ul', { className: "text-sm space-y-1" },
            React.createElement('li', null, "• Pellets: ", React.createElement('strong', null, "10 points")),
            React.createElement('li', null, "• Power Pellets: ", React.createElement('strong', null, "50 points")),
            React.createElement('li', null, "• Frightened Ghosts: ", React.createElement('strong', null, "200 points")),
            React.createElement('li', null, "• Cherries: ", React.createElement('strong', null, "100 points"))
          )
        )
      )
    }
  ];

  const nextSection = () => {
    setCurrentSection((prev) => (prev + 1) % sections.length);
  };

  const prevSection = () => {
    setCurrentSection((prev) => (prev - 1 + sections.length) % sections.length);
  };

  return React.createElement('div', { 
    className: "fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" 
  },
    React.createElement('div', { 
      className: "bg-black/90 backdrop-blur rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden border border-yellow-400/30 shadow-2xl" 
    },
      // Header
      React.createElement('div', { className: "bg-gradient-to-r from-yellow-600 to-orange-600 p-4 text-center" },
        React.createElement('div', { className: "flex items-center justify-between" },
          React.createElement('button', {
            onClick: onClose,
            className: "text-white hover:text-yellow-200 text-xl font-bold",
            'aria-label': "Close instructions"
          }, "×"),
          React.createElement('h2', { className: "text-lg font-bold text-white" }, "How to Play"),
          React.createElement('div', { className: "w-6" }) // Spacer
        ),
        React.createElement('div', { className: "text-sm text-yellow-100 mt-1" }, "PAKmaster Mobile Guide")
      ),

      // Progress indicator
      React.createElement('div', { className: "flex justify-center py-2 bg-black/50" },
        ...sections.map((_, index) => 
          React.createElement('button', {
            key: index,
            onClick: () => setCurrentSection(index),
            className: `w-2 h-2 rounded-full mx-1 transition-colors ${
              index === currentSection ? 'bg-yellow-400' : 'bg-gray-600'
            }`
          })
        )
      ),

      // Content
      React.createElement('div', { className: "p-4 overflow-y-auto max-h-96" },
        React.createElement('h3', { className: "text-xl font-bold text-yellow-300 mb-4 text-center" },
          sections[currentSection].title
        ),
        React.createElement('div', { className: "text-white" },
          sections[currentSection].content
        )
      ),

      // Navigation
      React.createElement('div', { className: "flex justify-between items-center p-4 bg-black/50 border-t border-gray-700" },
        React.createElement('button', {
          onClick: prevSection,
          disabled: currentSection === 0,
          className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors"
        }, "← Prev"),
        
        React.createElement('span', { className: "text-gray-300 text-sm" },
          `${currentSection + 1} of ${sections.length}`
        ),
        
        currentSection === sections.length - 1 ? 
          React.createElement('button', {
            onClick: onClose,
            className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors"
          }, "Got it! ✓") :
          React.createElement('button', {
            onClick: nextSection,
            className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors"
          }, "Next →")
      )
    )
  );
}

// 2. Then modify the WelcomeScreen component to include the instructions popup:

function WelcomeScreen({ onSelectMode, onHostMultiplayer, onBrowseGames, savedLevels, showGameOver }) {
  const soundtrackRef = useRef(null);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  
  // Add state for instructions popup
  const [showInstructions, setShowInstructions] = useState(false);

  // ... existing useEffect code for audio ...

  return (
    <>
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: 'url(./assets/images/back.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Game Over overlay when returning to welcome */}
        {showGameOver && (
          <div className="fixed inset-0 flex items-center justify-center z-[10000] bg-black/30">
            <img
              src="assets/images/gameover.png"
              alt="Game Over"
              className="max-w-[60vw] max-h-[60vh] object-contain"
              style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 12px rgba(255,0,0,0.8))' }}
            />
          </div>
        )}

        <div className="max-w-md w-full bg-black/40 backdrop-blur rounded-3xl p-8 text-center relative">
          {/* Music toggle icon (top-right) */}
          <button
            className={`absolute top-2 right-2 z-10 text-xl px-2 py-1 rounded-full ${soundMuted ? 'text-gray-300' : 'text-yellow-300'} bg-black/60 hover:bg-black/80`}
            title={soundMuted ? 'Enable music' : 'Mute music'}
            onClick={() => {
              const next = !soundMuted;
              setSoundMuted(next);
              const a = soundtrackRef.current;
              if (a) {
                a.muted = next;
                if (!next) {
                  a.play().catch(() => {});
                }
              }
            }}
          >
            {soundMuted ? '🔇' : '♪'}
          </button>

          {/* ADD: Instructions button (top-left) */}
          <button
            className="absolute top-2 left-2 z-10 text-xl px-2 py-1 rounded-full text-blue-300 bg-black/60 hover:bg-black/80"
            title="How to Play (Mobile Instructions)"
            onClick={() => setShowInstructions(true)}
          >
            ❓
          </button>

          {/* Chase sequence: Blue frightened ghost -> Pacman -> Red ghost */}
          <div className="ghost-edge-character"></div>
          <div className="pacman-edge-character"></div>
          <div className="red-ghost-edge-character"></div>
          
          <h1 className="text-4xl font-bold text-yellow-300 mb-2 flex items-center justify-center gap-2">
            <img 
              src="./assets/images/title.png" 
              alt="PAKmaster Title" 
              className="w-8 h-8"
              style={{ imageRendering: 'pixelated' }}
            />
            PAKmaster
          </h1>
          <div className="text-sm text-gray-400 mb-4">v10.0 • {savedLevels.length} levels</div>
          <h2 className="text-xl text-white mb-4">Create your paks</h2>
          
          <div className="space-y-4">
            {/* ADD: Mobile Instructions button */}
            <button
              onClick={() => setShowInstructions(true)}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              📱 How to Play (Mobile)
            </button>

            <button
              onClick={() => onSelectMode('design')}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              🎨 Design Levels
            </button>
            
            <button
              onClick={() => {
                console.log('🎮 Play Levels button clicked - navigating to levelSelect');
                onSelectMode('levelSelect');
              }}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              🎮 Play Levels
            </button>
            
            {/* Multiplayer Section */}
            <div className="border-t border-gray-600 pt-4 mt-6">
              <h3 className="text-lg font-bold text-purple-300 mb-3">🌐 Multiplayer</h3>
              <div className="space-y-3">
                <button
                  onClick={onHostMultiplayer}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm transition-colors"
                >
                  🏠 Multiplayer (upto 4 players)
                </button>
                
                <button
                  onClick={onBrowseGames}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors"
                >
                  🔍 Multiplayer Games
                </button>
              </div>
            </div>
          </div>
          
          <p className="text-gray-300 text-sm mt-6">
            Design custom Pac-Man levels or play saved levels!
          </p>
        </div>
      </div>

      {/* ADD: Instructions Popup */}
      <MobileInstructionsPopup 
        isOpen={showInstructions} 
        onClose={() => setShowInstructions(false)} 
      />
    </>
  );
}

// 3. Alternative implementation for showing instructions on first visit (optional):

// Add this to the WelcomeScreen component's useEffect:
useEffect(() => {
  // Show instructions on first visit for mobile users
  const hasSeenInstructions = localStorage.getItem('pakman_seen_instructions');
  const isMobile = window.innerWidth <= 768;
  
  if (!hasSeenInstructions && isMobile) {
    // Delay to let the welcome screen render first
    setTimeout(() => {
      setShowInstructions(true);
      localStorage.setItem('pakman_seen_instructions', 'true');
    }, 1000);
  }
}, []);

// 4. Add this CSS to the existing styles section for better mobile popup experience:

/* Add to the existing <style> section */
.mobile-instructions-popup {
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

@media (max-width: 480px) {
  .mobile-instructions-popup .max-w-md {
    max-width: calc(100vw - 2rem); /* Full width minus padding on very small screens */
  }
  
  .mobile-instructions-popup .max-h-96 {
    max-height: 60vh; /* Shorter content area on small screens */
  }
}