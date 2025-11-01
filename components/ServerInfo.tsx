import React, { useState, useEffect, useRef } from 'react';
import * as api from '../services/api';

interface ServerConfig {
  port: number;
  publicUrl: string;
  timestamp: string;
}

export const ServerInfo: React.FC = () => {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false); // Start hidden by default
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const serverConfig = await api.getServerConfig();
        setConfig(serverConfig);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch server config:', err);
        setError('Unable to load server info');
      }
    };

    fetchConfig();
  }, []);

  // Handle dragging
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (dragHandleRef.current?.contains(e.target as Node)) {
        setIsDragging(true);
        const rect = panelRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (showPanel) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, showPanel]);

  const handleClickEndpoint = (url: string) => {
    // Open in new tab without referrer to avoid CSP issues
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null;
    }
  };

  return (
    <>
      {/* Always visible compact button in header */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all ${
          showPanel 
            ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30' 
            : 'bg-gray-800 text-green-400 border border-gray-700 hover:bg-gray-700 hover:text-green-300'
        }`}
        title={showPanel ? "Hide server info" : "Show server info"}
      >
        <span className="text-base">📡</span>
        <span className="font-mono">Server</span>
        {config && !error && (
          <span className="text-xs opacity-75 font-mono">:{config.port}</span>
        )}
        {error && <span className="text-xs text-red-400">⚠️</span>}
        {!config && !error && <span className="text-xs opacity-50">...</span>}
      </button>

      {/* Draggable floating server info panel */}
      {showPanel && config && (
        <div
          ref={panelRef}
          className="fixed w-96 bg-gray-950/70 border-2 border-cyan-500/50 rounded-lg shadow-2xl z-40 flex flex-col"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'auto'
          }}
        >
          {/* Draggable Header */}
          <div
            ref={dragHandleRef}
            className="flex items-center justify-between bg-gray-900/80 px-4 py-3 border-b border-cyan-500/30 cursor-grab active:cursor-grabbing"
          >
            <span className="text-sm font-bold text-cyan-400">🖥️ Server Info</span>
            <button
              onClick={() => setShowPanel(false)}
              className="text-cyan-400 hover:text-cyan-300 text-lg"
              title="Hide panel"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">Server URL:</span>
              <button
                onClick={() => handleClickEndpoint(config.publicUrl)}
                className="px-3 py-2 bg-blue-900/50 hover:bg-blue-800/70 text-blue-300 rounded border border-blue-700 hover:border-blue-500 transition-colors cursor-pointer font-mono text-xs text-left"
                title="Click to open server endpoint"
              >
                📡 {config.publicUrl}
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 text-xs">Localhost:</span>
              <button
                onClick={() => handleClickEndpoint(`http://localhost:${config.port}`)}
                className="px-3 py-2 bg-green-900/50 hover:bg-green-800/70 text-green-300 rounded border border-green-700 hover:border-green-500 transition-colors cursor-pointer font-mono text-xs text-left"
                title="Click to open localhost endpoint"
              >
                🔌 http://localhost:{config.port}
              </button>
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-700 mt-2">
              Status: Online • {new Date(config.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
