
import React from 'react';
import { WorkspaceState, Commit } from '../types';
import LogViewer from './LogViewer';
import { DockerIcon } from './icons/DockerIcon';

interface ControlsSidebarProps {
    workspaceState: WorkspaceState;
    selectedCommit: Commit | null;
    onStartPreview: () => void;
    onStop: () => void;
}

const StatusIndicator: React.FC<{ status: WorkspaceState['status'] }> = ({ status }) => {
    const statusConfig = {
        stopped: { color: 'bg-gray-500', text: 'Stopped' },
        preparing: { color: 'bg-yellow-accent animate-pulse', text: 'Preparing' },
        running: { color: 'bg-green-accent', text: 'Running' },
        error: { color: 'bg-red-accent', text: 'Error' },
    } as const;

    const config = statusConfig[status];

    return (
        <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${config.color}`}></span>
            <span className="font-semibold capitalize">{config.text}</span>
        </div>
    );
};


const ControlsSidebar: React.FC<ControlsSidebarProps> = ({ workspaceState, selectedCommit, onStartPreview, onStop }) => {
    const { status, logs, sessionId } = workspaceState;

    const canStartPreview = selectedCommit !== null && status !== 'preparing' && status !== 'running';
    const canStop = sessionId !== null;

    return (
        <aside className="w-80 lg:w-96 flex-shrink-0 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700 flex-shrink-0">
                 <h2 className="text-lg font-semibold flex items-center gap-2"><DockerIcon className="w-6 h-6" />Workspace Controls</h2>
                 <div className="mt-2">
                    <StatusIndicator status={status} />
                 </div>
                 {selectedCommit && (
                    <p className="mt-2 text-xs text-gray-400 font-mono break-all">
                        {selectedCommit.sha}
                    </p>
                 )}
            </div>
            
            <div className="p-3 border-b border-gray-700 flex gap-3 flex-shrink-0 justify-center">
                <button 
                    onClick={onStartPreview} 
                    disabled={!canStartPreview} 
                    className="flex items-center justify-center p-4 text-white bg-green-accent rounded-lg hover:bg-opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
                    title="Start Preview"
                >
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </button>
                <button 
                    onClick={onStop} 
                    disabled={!canStop}
                    className="flex items-center justify-center p-4 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
                    title="Stop Workspace"
                >
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <h3 className="text-md font-semibold p-3 border-b border-gray-700 flex-shrink-0">Logs</h3>
                <LogViewer logs={logs} />
            </div>
        </aside>
    );
};

export default ControlsSidebar;
