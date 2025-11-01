import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../types';

interface LogViewerProps {
    logs: LogEntry[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
    const endOfLogsRef = useRef<HTMLDivElement>(null);
    const [persistedLogs, setPersistedLogs] = useState<LogEntry[]>([]);
    const [showFloatingPanel, setShowFloatingPanel] = useState(true);
    const floatingPanelRef = useRef<HTMLDivElement>(null);
    const dragHandleRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 300 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Load logs from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('sessionLogs');
            if (saved) {
                const parsed = JSON.parse(saved).map((log: any) => ({
                    ...log,
                    timestamp: new Date(log.timestamp)
                }));
                setPersistedLogs(parsed);
            }
        } catch (e) {
            console.error('Failed to load persisted logs', e);
        }
    }, []);

    // Update persisted logs when new logs arrive
    useEffect(() => {
        const allLogs = [...persistedLogs, ...logs];
        // Keep only the most recent 1000 logs to avoid localStorage limit
        const recentLogs = allLogs.slice(-1000);
        try {
            localStorage.setItem('sessionLogs', JSON.stringify(recentLogs));
            setPersistedLogs(recentLogs);
        } catch (e) {
            console.error('Failed to save logs to localStorage', e);
        }
    }, [logs]);

    useEffect(() => {
        endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
        // Also scroll floating panel
        if (floatingPanelRef.current) {
            floatingPanelRef.current.scrollTop = floatingPanelRef.current.scrollHeight;
        }
    }, [logs, persistedLogs]);

    // Handle dragging
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (dragHandleRef.current?.contains(e.target as Node)) {
                setIsDragging(true);
                const rect = floatingPanelRef.current?.getBoundingClientRect();
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

        if (showFloatingPanel) {
            document.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousedown', handleMouseDown);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset, showFloatingPanel]);

    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'info':
                return 'text-blue-400';
            case 'success':
                return 'text-green-accent';
            case 'error':
                return 'text-red-accent';
            case 'log':
            default:
                return 'text-gray-400';
        }
    };

    const displayLogs = [...persistedLogs, ...logs];
    const recentLogs = displayLogs.slice(-15); // Show last 15 logs in floating panel

    const renderLogMessage = (message: string) => {
        const urlRegex = /(https?:\/\/[\w\-\.:%#?&=\/]+)/gi;
        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        const textPush = (text: string) => {
            if (text.length > 0) {
                nodes.push(<span key={`text-${nodes.length}`}>{text}</span>);
            }
        };

        while ((match = urlRegex.exec(message)) !== null) {
            const { index } = match;
            if (index > lastIndex) {
                textPush(message.slice(lastIndex, index));
            }
            const url = match[0];
            nodes.push(
                <a
                    key={`link-${nodes.length}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 decoration-dotted decoration-current hover:text-cyan-200 transition"
                >
                    {url}
                </a>
            );
            lastIndex = index + url.length;
        }

        if (lastIndex < message.length) {
            textPush(message.slice(lastIndex));
        }

        return nodes.length > 0 ? nodes : [message];
    };

    return (
        <>
            {/* Floating Debug Panel - Draggable */}
            {showFloatingPanel && (
                <div
                    ref={floatingPanelRef}
                    className="fixed w-96 h-64 bg-gray-950/70 border-2 border-cyan-500/50 rounded-lg shadow-2xl z-50 flex flex-col"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px)`,
                        cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                >
                    <div
                        ref={dragHandleRef}
                        className="flex items-center justify-between bg-gray-900/80 px-3 py-2 border-b border-cyan-500/30 cursor-grab active:cursor-grabbing"
                    >
                        <span className="text-xs font-bold text-cyan-400">🔍 Live Debug Panel</span>
                        <button
                            onClick={() => setShowFloatingPanel(false)}
                            className="text-cyan-400 hover:text-cyan-300 text-sm"
                            title="Close panel"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
                        {recentLogs.length === 0 ? (
                            <div className="text-gray-500">Waiting for logs...</div>
                        ) : (
                            recentLogs.map((log, index) => (
                                <div key={index} className="flex">
                                    <span className="text-gray-600 mr-2 flex-shrink-0 min-w-20">
                                        {log.timestamp.toLocaleTimeString()}
                                    </span>
                                    <p className={`break-words ${getLogColor(log.type)}`}>
                                        {renderLogMessage(log.message)}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Main Log Viewer */}
            <div className="flex-1 overflow-y-auto bg-gray-900 flex flex-col">
                {/* Log entries */}
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
                    {displayLogs.length === 0 ? (
                        <div className="text-gray-500">No logs to display.</div>
                    ) : (
                        displayLogs.map((log, index) => (
                            <div key={index} className="flex">
                                <span className="text-gray-500 mr-2 flex-shrink-0">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                                <p className={`whitespace-pre-wrap break-words ${getLogColor(log.type)}`}>
                                    {renderLogMessage(log.message)}
                                </p>
                            </div>
                        ))
                    )}
                    <div ref={endOfLogsRef} />
                </div>
            </div>
        </>
    );
};

export default LogViewer;