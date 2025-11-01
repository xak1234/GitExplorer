import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalViewProps {
    logs: LogEntry[];
    status: 'preparing' | 'running' | 'stopped' | 'error';
    onClose?: () => void;
}

const TerminalView: React.FC<TerminalViewProps> = ({ logs, status, onClose }) => {
    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const getLogColor = (type: LogEntry['type']) => {
        switch (type) {
            case 'info':
                return 'text-cyan-400';
            case 'success':
                return 'text-green-400';
            case 'error':
                return 'text-red-400';
            case 'log':
            default:
                return 'text-gray-300';
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'preparing':
                return 'bg-yellow-500';
            case 'running':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-500';
            case 'stopped':
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'preparing':
                return 'BUILDING';
            case 'running':
                return 'READY';
            case 'error':
                return 'ERROR';
            case 'stopped':
            default:
                return 'STOPPED';
        }
    };

    return (
        <div className="w-full h-full bg-gray-950 flex flex-col font-mono text-sm">
            {/* Terminal Header */}
            <div className="flex items-center justify-between bg-gray-900 border-b border-gray-700 px-4 py-2 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-gray-400 text-xs">bash — workspace terminal</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></span>
                        <span className="text-xs text-gray-400 font-semibold">{getStatusText()}</span>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-200 text-xs font-bold"
                            title="Close terminal"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {logs.length === 0 ? (
                    <div className="text-gray-500">
                        <span className="text-green-400">$</span> Waiting for commands...
                    </div>
                ) : (
                    logs.map((log, index) => (
                        <div key={index} className="flex flex-col">
                            {/* Show command prompt for certain log types */}
                            {(log.message.includes('npm') || 
                              log.message.includes('git') || 
                              log.message.includes('Installing') ||
                              log.message.includes('Running') ||
                              log.message.includes('Starting')) && (
                                <div className="text-green-400 mb-1">
                                    <span className="text-blue-400">workspace@github</span>
                                    <span className="text-gray-500">:</span>
                                    <span className="text-purple-400">~/session</span>
                                    <span className="text-green-400">$</span>
                                </div>
                            )}
                            {/* Log message */}
                            <div className={`${getLogColor(log.type)} whitespace-pre-wrap break-words`}>
                                {log.message}
                            </div>
                        </div>
                    ))
                )}
                <div ref={terminalEndRef} />
                
                {/* Blinking cursor */}
                {status === 'preparing' && (
                    <div className="flex items-center mt-2">
                        <span className="text-green-400">$</span>
                        <span className="ml-2 w-2 h-4 bg-green-400 animate-pulse"></span>
                    </div>
                )}
            </div>

            {/* Terminal Footer */}
            <div className="flex-shrink-0 bg-gray-900 border-t border-gray-700 px-4 py-1 text-xs text-gray-500 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span>Lines: {logs.length}</span>
                    <span>•</span>
                    <span>Session Active</span>
                </div>
                <div>
                    {status === 'preparing' && '⏳ Building application...'}
                    {status === 'running' && '✅ Application ready!'}
                    {status === 'error' && '❌ Build failed'}
                </div>
            </div>
        </div>
    );
};

export default TerminalView;

