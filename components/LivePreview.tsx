
import React, { useState, useRef } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import TerminalView from './TerminalView';

interface LivePreviewProps {
    url: string | null;
    isLoading?: boolean;
    status?: string;
    logs?: Array<{ timestamp: Date; message: string; type: 'info' | 'success' | 'error' | 'log' }>;
    workspaceStatus?: 'preparing' | 'running' | 'stopped' | 'error';
}

const FloatingPreviewWindow: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
    // Handle ESC key to close
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close hint - click anywhere to close */}
            <div className="absolute top-4 right-4 z-10 bg-gray-900/80 px-3 py-2 rounded-lg text-gray-300 text-sm backdrop-blur-sm">
                Press ESC or click outside to close
            </div>
            
            {/* Fullscreen iframe */}
            <iframe
                src={url}
                title="Live Preview Window"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

const LivePreview: React.FC<LivePreviewProps> = ({ url, isLoading, status, logs = [], workspaceStatus = 'stopped' }) => {
    const [showFloatingPreview, setShowFloatingPreview] = useState(false);
    const [showTerminal, setShowTerminal] = useState(true);
    const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

    const getStatusColor = (s?: string) => {
        if (!s) return 'text-gray-400';
        if (s.includes('error')) return 'text-red-accent';
        if (s.includes('running')) return 'text-green-accent';
        if (s.includes('preparing')) return 'text-yellow-accent';
        return 'text-blue-accent';
    };
    
    // Auto-switch to preview when ready (after 3 seconds of being ready)
    React.useEffect(() => {
        // Check if dev server is truly ready by looking for the ready message in logs
        const devServerReady = logs.some(log => 
            log.message.includes('Dev server is ready and responding') ||
            log.message.includes('Preview available at')
        );
        
        if (url && workspaceStatus === 'running' && !hasAutoSwitched && devServerReady) {
            console.log('🎬 Auto-switching to preview in 3 seconds...', { url, workspaceStatus, devServerReady });
            const timer = setTimeout(() => {
                console.log('🎬 Switching to preview now!', { url });
                setShowTerminal(false);
                setHasAutoSwitched(true);
            }, 3000); // Wait 3 seconds after ready before auto-switching
            
            return () => clearTimeout(timer);
        }
    }, [url, workspaceStatus, hasAutoSwitched, logs]);
    
    // Reset auto-switch flag when starting a new session
    React.useEffect(() => {
        if (!url && logs.length === 0) {
            setHasAutoSwitched(false);
            setShowTerminal(true);
        }
    }, [url, logs.length]);
    
    // Check if dev server is truly ready
    const devServerReady = logs.some(log => 
        log.message.includes('Dev server is ready and responding') ||
        log.message.includes('Preview available at')
    );
    
    // Determine if we should show terminal
    const shouldShowTerminal = (logs.length > 0 && showTerminal) || (!url && logs.length > 0) || !devServerReady;
    
    // Debug logging
    React.useEffect(() => {
        console.log('📺 LivePreview state:', {
            hasUrl: !!url,
            url,
            workspaceStatus,
            isLoading,
            logsCount: logs.length,
            showTerminal,
            shouldShowTerminal,
            hasAutoSwitched,
            devServerReady
        });
    }, [url, workspaceStatus, isLoading, logs.length, showTerminal, shouldShowTerminal, hasAutoSwitched, devServerReady]);

    return (
        <>
            {showFloatingPreview && url && (
                <FloatingPreviewWindow url={url} onClose={() => setShowFloatingPreview(false)} />
            )}

            <div className="flex-1 bg-gray-800 flex items-center justify-center relative overflow-hidden">
                {/* Headerless Terminal View - Show during build and when manually toggled */}
                {shouldShowTerminal && (
                    <div className="w-full h-full relative">
                        {/* Optional: Show a subtle transition notice when ready */}
                        {url && workspaceStatus === 'running' && !hasAutoSwitched && (
                            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-green-900/90 border border-green-500 rounded-lg px-4 py-2 shadow-lg">
                                <span className="text-green-300 text-sm font-semibold">✅ Build Complete - Switching to preview...</span>
                            </div>
                        )}
                        <TerminalView 
                            logs={logs} 
                            status={workspaceStatus}
                        />
                    </div>
                )}

                {/* Headerless Preview iframe - Show when ready and terminal is hidden */}
                {url && !isLoading && !shouldShowTerminal ? (
                    <div className="w-full h-full relative">
                        {/* Floating action buttons overlay */}
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <button
                                onClick={() => setShowTerminal(true)}
                                className="px-3 py-2 bg-gray-900/90 hover:bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:border-gray-500 transition shadow-lg backdrop-blur-sm"
                                title="Show terminal"
                            >
                                💻 Terminal
                            </button>
                            <button
                                onClick={() => setShowFloatingPreview(true)}
                                className="px-3 py-2 bg-green-900/90 hover:bg-green-800 text-green-300 rounded-lg border border-green-700 hover:border-green-500 transition shadow-lg backdrop-blur-sm"
                                title="Open in floating window"
                            >
                                🪟 Window
                            </button>
                        </div>
                        {/* Full-screen iframe */}
                        <iframe
                            src={url}
                            title="Live Preview"
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox"
                        />
                    </div>
                ) : isLoading || status ? (
                    <div className="flex flex-col items-center justify-center gap-6 p-8">
                        <div className="text-center">
                            <div className="animate-spin mb-4">
                                <PlayIcon className="w-16 h-16 mx-auto text-yellow-accent" />
                            </div>
                            <p className={`text-lg font-semibold ${getStatusColor(status)}`}>
                                {status || 'Starting preview...'}
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                💡 View logs in the terminal panel on the right
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500">
                        <PlayIcon className="w-16 h-16 mx-auto mb-4" />
                        <p>Click "Start Preview" to launch the application.</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default LivePreview;
