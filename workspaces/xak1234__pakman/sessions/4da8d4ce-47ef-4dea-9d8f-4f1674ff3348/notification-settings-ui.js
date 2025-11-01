/**
 * Notification Settings UI Component
 * 
 * This provides a React component for managing multiplayer notification settings
 */

// Notification Settings Modal Component
function NotificationSettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = React.useState({
    enabled: true,
    volume: 0.7,
    hostNotifications: true,
    playerNotifications: true
  });
  
  // Load current settings when modal opens
  React.useEffect(() => {
    if (isOpen && window.multiplayerNotifications) {
      setSettings(window.multiplayerNotifications.getSettings());
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleToggleEnabled = () => {
    const newEnabled = window.multiplayerNotifications.toggleEnabled();
    setSettings(prev => ({ ...prev, enabled: newEnabled }));
  };
  
  const handleToggleHost = () => {
    const newHost = window.multiplayerNotifications.toggleHostNotifications();
    setSettings(prev => ({ ...prev, hostNotifications: newHost }));
  };
  
  const handleTogglePlayer = () => {
    const newPlayer = window.multiplayerNotifications.togglePlayerNotifications();
    setSettings(prev => ({ ...prev, playerNotifications: newPlayer }));
  };
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    window.multiplayerNotifications.updateVolume(newVolume);
    setSettings(prev => ({ ...prev, volume: newVolume }));
  };
  
  const handleTestHost = () => {
    window.multiplayerNotifications.testHostNotification();
  };
  
  const handleTestPlayer = () => {
    window.multiplayerNotifications.testPlayerNotification();
  };
  
  return React.createElement('div', { 
    className: "fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" 
  },
    React.createElement('div', { 
      className: "bg-black/90 backdrop-blur rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden border border-green-400/30 shadow-2xl" 
    },
      // Header
      React.createElement('div', { className: "bg-gradient-to-r from-green-600 to-blue-600 p-4 text-center" },
        React.createElement('div', { className: "flex items-center justify-between" },
          React.createElement('button', {
            onClick: onClose,
            className: "text-white hover:text-yellow-200 text-xl font-bold",
            'aria-label': "Close notification settings"
          }, "×"),
          React.createElement('h2', { className: "text-lg font-bold text-white" }, "🔔 Multiplayer Notifications"),
          React.createElement('div', { className: "w-6" }) // Spacer
        ),
        React.createElement('div', { className: "text-sm text-yellow-100 mt-1" }, "Audio alerts for game events")
      ),
      
      // Content
      React.createElement('div', { className: "p-4 space-y-4" },
        // Master toggle
        React.createElement('div', { className: "bg-gray-900/30 rounded-lg p-3 border border-gray-400/30" },
          React.createElement('div', { className: "flex items-center justify-between mb-2" },
            React.createElement('h4', { className: "font-bold text-white" }, "Enable Notifications"),
            React.createElement('button', {
              onClick: handleToggleEnabled,
              className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-green-600' : 'bg-gray-600'
              }`
            },
              React.createElement('span', {
                className: `inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`
              })
            )
          ),
          React.createElement('p', { className: "text-sm text-gray-300" },
            settings.enabled ? "Notifications enabled" : "All notifications disabled"
          )
        ),
        
        // Volume control
        settings.enabled && React.createElement('div', { className: "bg-blue-900/30 rounded-lg p-3 border border-blue-400/30" },
          React.createElement('h4', { className: "font-bold text-blue-300 mb-2" }, "Volume"),
          React.createElement('div', { className: "flex items-center gap-3" },
            React.createElement('span', { className: "text-sm text-gray-300" }, "🔈"),
            React.createElement('input', {
              type: "range",
              min: "0",
              max: "1",
              step: "0.1",
              value: settings.volume,
              onChange: handleVolumeChange,
              className: "flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            }),
            React.createElement('span', { className: "text-sm text-gray-300" }, "🔊"),
            React.createElement('span', { className: "text-sm font-mono text-white min-w-[3ch]" }, 
              Math.round(settings.volume * 100) + '%'
            )
          )
        ),
        
        // Host notifications
        settings.enabled && React.createElement('div', { className: "bg-purple-900/30 rounded-lg p-3 border border-purple-400/30" },
          React.createElement('div', { className: "flex items-center justify-between mb-2" },
            React.createElement('h4', { className: "font-bold text-purple-300" }, "🏠 Host Creation"),
            React.createElement('button', {
              onClick: handleToggleHost,
              className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.hostNotifications ? 'bg-purple-600' : 'bg-gray-600'
              }`
            },
              React.createElement('span', {
                className: `inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.hostNotifications ? 'translate-x-6' : 'translate-x-1'
                }`
              })
            )
          ),
          React.createElement('p', { className: "text-sm text-gray-300 mb-2" },
            "Single ping when someone creates a new multiplayer game"
          ),
          React.createElement('button', {
            onClick: handleTestHost,
            disabled: !settings.hostNotifications,
            className: "px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold rounded text-sm transition-colors"
          }, "🔔 Test")
        ),
        
        // Player join notifications  
        settings.enabled && React.createElement('div', { className: "bg-orange-900/30 rounded-lg p-3 border border-orange-400/30" },
          React.createElement('div', { className: "flex items-center justify-between mb-2" },
            React.createElement('h4', { className: "font-bold text-orange-300" }, "👥 Player Joins"),
            React.createElement('button', {
              onClick: handleTogglePlayer,
              className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.playerNotifications ? 'bg-orange-600' : 'bg-gray-600'
              }`
            },
              React.createElement('span', {
                className: `inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.playerNotifications ? 'translate-x-6' : 'translate-x-1'
                }`
              })
            )
          ),
          React.createElement('p', { className: "text-sm text-gray-300 mb-2" },
            "Double ping when someone joins an existing game"
          ),
          React.createElement('button', {
            onClick: handleTestPlayer,
            disabled: !settings.playerNotifications,
            className: "px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold rounded text-sm transition-colors"
          }, "🔔 Test")
        )
      ),
      
      // Footer
      React.createElement('div', { className: "flex justify-center p-4 bg-black/50 border-t border-gray-700" },
        React.createElement('button', {
          onClick: onClose,
          className: "px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm transition-colors"
        }, "Done ✓")
      )
    )
  );
}

// Notification Settings Button Component
function NotificationSettingsButton() {
  const [showSettings, setShowSettings] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  
  // Check if notifications are enabled
  React.useEffect(() => {
    if (window.multiplayerNotifications) {
      const settings = window.multiplayerNotifications.getSettings();
      setNotificationsEnabled(settings.enabled);
    }
  }, []);
  
  const handleToggleQuick = () => {
    if (window.multiplayerNotifications) {
      const newEnabled = window.multiplayerNotifications.toggleEnabled();
      setNotificationsEnabled(newEnabled);
    }
  };
  
  return React.createElement(React.Fragment, null,
    // Settings button
    React.createElement('div', { className: "fixed top-4 right-4 z-[9999] flex gap-2" },
      // Quick toggle button
      React.createElement('button', {
        onClick: handleToggleQuick,
        title: notificationsEnabled ? 'Disable multiplayer notifications' : 'Enable multiplayer notifications',
        className: `px-3 py-2 rounded-full ${
          notificationsEnabled 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
        } transition-colors shadow-lg`
      },
        React.createElement('span', { className: "text-sm" }, notificationsEnabled ? '🔔' : '🔇')
      ),
      
      // Settings button
      React.createElement('button', {
        onClick: () => setShowSettings(true),
        title: 'Multiplayer notification settings',
        className: "px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-lg"
      },
        React.createElement('span', { className: "text-sm" }, '⚙️')
      )
    ),
    
    // Settings modal
    React.createElement(NotificationSettingsModal, {
      isOpen: showSettings,
      onClose: () => setShowSettings(false)
    })
  );
}

// Make components available globally
window.NotificationSettingsModal = NotificationSettingsModal;
window.NotificationSettingsButton = NotificationSettingsButton;

// Add some custom CSS for the slider
const style = document.createElement('style');
style.textContent = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  .slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;
document.head.appendChild(style);

console.log('🎛️ Notification settings UI loaded');