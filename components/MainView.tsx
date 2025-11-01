import React from 'react';
import CodeViewer from './CodeViewer';
import LivePreview from './LivePreview';
import FileTree from './FileTree';
import { FileNode } from '../types';

interface MainViewProps {
    fileTree: FileNode[];
    selectedFilePath: string | null;
    onSelectFile: (path: string) => void;
    codeContent: string | null;
    isLoadingTree: boolean;
    isLoadingCode: boolean;
    previewUrl: string | null;
    hasSelectedCommit: boolean;
    isPreviewLoading?: boolean;
    previewStatus?: string;
    previewLogs?: Array<{ timestamp: Date; message: string; type: 'info' | 'success' | 'error' | 'log' }>;
    workspaceStatus?: 'preparing' | 'running' | 'stopped' | 'error';
}

const MainView: React.FC<MainViewProps> = ({
    fileTree,
    selectedFilePath,
    onSelectFile,
    codeContent,
    isLoadingTree,
    isLoadingCode,
    previewUrl,
    hasSelectedCommit,
    isPreviewLoading,
    previewStatus,
    previewLogs,
    workspaceStatus,
}) => {
    if (!hasSelectedCommit) {
        return (
            <section className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p>Select a commit to view its details, browse files, and start a preview.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
            <div className="flex-1 flex flex-col border-b border-gray-700 overflow-hidden">
                <h3 className="text-md font-semibold p-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">Code Browser</h3>
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-72 lg:w-80 border-r border-gray-700 bg-gray-900 overflow-auto">
                        {isLoadingTree ? (
                            <div className="p-4 text-center text-gray-400">Loading repository tree...</div>
                        ) : fileTree.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No files available for this commit.</div>
                        ) : (
                            <FileTree tree={fileTree} selectedPath={selectedFilePath} onSelect={onSelectFile} />
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <CodeViewer code={codeContent} isLoading={isLoadingCode} />
                    </div>
                </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
                <LivePreview 
                    url={previewUrl} 
                    isLoading={isPreviewLoading} 
                    status={previewStatus} 
                    logs={previewLogs}
                    workspaceStatus={workspaceStatus}
                />
            </div>
        </section>
    );
};

export default MainView;
