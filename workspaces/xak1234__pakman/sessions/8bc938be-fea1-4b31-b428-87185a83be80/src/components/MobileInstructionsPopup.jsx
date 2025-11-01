import React, { useState } from 'react';

function MobileInstructionsPopup({ isOpen, onClose }) {
  const [currentSection, setCurrentSection] = useState(0);

  if (!isOpen) return null;

  const sections = [
    {
      title: "🎮 Getting Started",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-400/30">
            <h4 className="font-bold text-blue-300 mb-2">Choose Your Mode:</h4>
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-blue-400">🎨</span>
                <span><strong>Design Levels</strong> - Create custom Pac-Man levels</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">🎮</span>
                <span><strong>Play Levels</strong> - Play saved levels</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">🌐</span>
                <span><strong>Multiplayer</strong> - Play with up to 4 players</span>
              </li>
            </ul>
          </div>
          <p className="text-gray-300 text-sm">
            Start with <strong>Play Levels</strong> to try the built-in levels, or jump into <strong>Design</strong> to create your own!
          </p>
        </div>
      )
    },
    {
      title: "🕹️ Mobile Controls",
      content: (
        <div className="space-y-4">
          <div className="bg-green-900/30 rounded-lg p-3 border border-green-400/30">
            <h4 className="font-bold text-green-300 mb-2">Movement Controls:</h4>
            <ul className="text-sm space-y-1">
              <li>• Use the <strong>directional pad</strong> at the bottom</li>
              <li>• Tap arrow buttons: <strong>↑ ← ↓ →</strong></li>
              <li>• Swipe gestures also work</li>
            </ul>
          </div>
          
          <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-400/30">
            <h4 className="font-bold text-yellow-300 mb-2">Action Buttons:</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>⏸/▶ Pause</strong> - Pause/resume game</li>
              <li>• Center dot shows your direction</li>
            </ul>
          </div>

          <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-400/30">
            <h4 className="font-bold text-purple-300 mb-2">Customization:</h4>
            <p className="text-sm">
              <strong>Drag the controls</strong> using corner handles to reposition them perfectly for your thumbs!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "🎯 Game Objectives",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-400/30">
            <h4 className="font-bold text-blue-300 mb-2">Single Player:</h4>
            <ul className="text-sm space-y-1">
              <li>• Eat all white pellets to complete level</li>
              <li>• Avoid ghosts (unless power mode active)</li>
              <li>• Collect power pellets to turn ghosts blue</li>
              <li>• Eat blue ghosts for bonus points!</li>
            </ul>
          </div>
          
          <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-400/30">
            <h4 className="font-bold text-purple-300 mb-2">Multiplayer (up to 4 players):</h4>
            <ul className="text-sm space-y-1">
              <li>• 🏆 <strong>Competitive</strong>: Race to collect most pellets</li>
              <li>• Each player has different colored Pac-Man</li>
              <li>• Real-time counter shows who's leading</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "🍒 Special Items & Ghosts",
      content: (
        <div className="space-y-4">
          <div className="bg-red-900/30 rounded-lg p-3 border border-red-400/30">
            <h4 className="font-bold text-red-300 mb-2">Special Items:</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>🟡 Power Pellets</strong> - Make ghosts vulnerable</li>
              <li>• <strong>🍒 Cherries</strong> - Activate "Hunt Mode"</li>
              <li>• <strong>💖 Extra Lives</strong> - Gain additional life</li>
              <li>• <strong>🌀 Portals</strong> - Teleport between pairs</li>
            </ul>
          </div>
          
          <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-400/30">
            <h4 className="font-bold text-gray-300 mb-2">Ghost Behavior:</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Normal Ghosts</strong>: Chase you with smart AI</li>
              <li>• <strong>Blue Ghosts</strong>: Flee from you (eat for points!)</li>
              <li>• <strong>Black Ghosts</strong>: Move through black tiles</li>
              <li>• <strong>Ghost Doors</strong>: Only ghosts can pass (cyan)</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "📱 Mobile Tips & Designer",
      content: (
        <div className="space-y-4">
          <div className="bg-green-900/30 rounded-lg p-3 border border-green-400/30">
            <h4 className="font-bold text-green-300 mb-2">Mobile Tips:</h4>
            <ul className="text-sm space-y-1">
              <li>• Board auto-scales to fit your screen</li>
              <li>• Pan/scroll for large levels</li>
              <li>• Drag stats panel to preferred position</li>
              <li>• Use landscape mode for better visibility</li>
            </ul>
          </div>
          
          <div className="bg-orange-900/30 rounded-lg p-3 border border-orange-400/30">
            <h4 className="font-bold text-orange-300 mb-2">Level Designer:</h4>
            <ul className="text-sm space-y-1">
              <li>• Tap tools, then tap grid to place</li>
              <li>• Use <strong>Mirror Mode</strong> for symmetry</li>
              <li>• Required: Pac Spawn 🟡 & Ghost Spawn 👻</li>
              <li>• Choose from 8 wall colors</li>
              <li>• Levels auto-save as you create</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "🌐 Multiplayer & Scoring",
      content: (
        <div className="space-y-4">
          <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-400/30">
            <h4 className="font-bold text-purple-300 mb-2">Multiplayer Setup:</h4>
            <div className="text-sm space-y-2">
              <div>
                <strong>Hosting:</strong> Tap "🏠 Multiplayer" → Select players → Share code → Start
              </div>
              <div>
                <strong>Joining:</strong> Tap "🔍 Multiplayer Games" → Find game → Join
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-400/30">
            <h4 className="font-bold text-yellow-300 mb-2">Scoring System:</h4>
            <ul className="text-sm space-y-1">
              <li>• Pellets: <strong>10 points</strong></li>
              <li>• Power Pellets: <strong>50 points</strong></li>
              <li>• Frightened Ghosts: <strong>200 points</strong></li>
              <li>• Cherries: <strong>100 points</strong></li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const nextSection = () => {
    setCurrentSection((prev) => (prev + 1) % sections.length);
  };

  const prevSection = () => {
    setCurrentSection((prev) => (prev - 1 + sections.length) % sections.length);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-black/90 backdrop-blur rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden border border-yellow-400/30 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-4 text-center">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-white hover:text-yellow-200 text-xl font-bold"
              aria-label="Close instructions"
            >
              ×
            </button>
            <h2 className="text-lg font-bold text-white">How to Play</h2>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
          <div className="text-sm text-yellow-100 mt-1">
            PAKmaster Mobile Guide
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center py-2 bg-black/50">
          {sections.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSection(index)}
              className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                index === currentSection ? 'bg-yellow-400' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-96">
          <h3 className="text-xl font-bold text-yellow-300 mb-4 text-center">
            {sections[currentSection].title}
          </h3>
          <div className="text-white">
            {sections[currentSection].content}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center p-4 bg-black/50 border-t border-gray-700">
          <button
            onClick={prevSection}
            disabled={currentSection === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-colors"
          >
            ← Prev
          </button>
          
          <span className="text-gray-300 text-sm">
            {currentSection + 1} of {sections.length}
          </span>
          
          {currentSection === sections.length - 1 ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              Got it! ✓
            </button>
          ) : (
            <button
              onClick={nextSection}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MobileInstructionsPopup;