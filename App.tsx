
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Commit, FileNode, WorkspaceState } from './types';
import * as api from './services/api';

import RepoInput from './components/RepoInput';
import CommitSidebar from './components/CommitSidebar';
import MainView from './components/MainView';
import ControlsSidebar from './components/ControlsSidebar';
import { GitHubIcon } from './components/icons/GitHubIcon';

const MAX_HISTORY_LENGTH = 5;

const createWorkspaceState = (): WorkspaceState => ({
    status: 'stopped',
    isPrepared: false,
    sessionId: null,
    logs: [],
    previewUrl: null,
});

const PRIORITY_FILES = ['README.md', 'readme.md', 'README', 'README.txt', 'index.md', 'index.html'];

const App: React.FC = () => {
    const [repoUrl, setRepoUrl] = useState<string>('https://github.com/xak1234/Lifty');
    const [commits, setCommits] = useState<Commit[]>([]);
    const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [isLoadingCommits, setIsLoadingCommits] = useState<boolean>(false);
    const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
    const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [repoHistory, setRepoHistory] = useState<string[]>([]);
    const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(() => createWorkspaceState());
    const [logStream, setLogStream] = useState<EventSource | null>(null);

    const sessionIdRef = useRef<string | null>(null);
    const hasLaunchedMiniWindow = useRef<boolean>(false);

    useEffect(() => {
        sessionIdRef.current = workspaceState.sessionId;
    }, [workspaceState.sessionId]);

    // Auto-launch mini window when preview is ready
    useEffect(() => {
        const shouldLaunch = workspaceState.status === 'running' && 
                           workspaceState.previewUrl && 
                           !hasLaunchedMiniWindow.current;
        
        if (shouldLaunch) {
            hasLaunchedMiniWindow.current = true;
            console.log('🚀 Auto-launching mini window for preview');
            api.launchMiniWindow(workspaceState.previewUrl!);
        }

        // Reset flag when workspace stops
        if (workspaceState.status === 'stopped' || workspaceState.status === 'error') {
            hasLaunchedMiniWindow.current = false;
        }
    }, [workspaceState.status, workspaceState.previewUrl]);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('repoHistory');
            if (storedHistory) {
                setRepoHistory(JSON.parse(storedHistory));
            }
        } catch (e) {
            console.error('Failed to parse repo history from localStorage', e);
        }
        
        // Test backend connectivity on startup
        const testBackend = async () => {
            const isReachable = await api.testBackendConnection();
            if (!isReachable) {
                setError('⚠️ Backend server not reachable. Please start the server: npm run server');
            }
        };
        testBackend();
    }, []);

    const updateRepoHistory = useCallback((url: string) => {
        setRepoHistory(prevHistory => {
            const newHistory = [url, ...prevHistory.filter(item => item !== url)].slice(0, MAX_HISTORY_LENGTH);
            try {
                localStorage.setItem('repoHistory', JSON.stringify(newHistory));
            } catch (e) {
                console.error('Failed to save repo history to localStorage', e);
            }
            return newHistory;
        });
    }, []);

    const closeLogStream = useCallback(() => {
        if (logStream) {
            logStream.close();
        }
        setLogStream(null);
    }, [logStream]);

    const stopSession = useCallback(async () => {
        const sessionId = sessionIdRef.current;
        if (sessionId) {
            try {
                await api.stopWorkspace(sessionId);
            } catch (err) {
                console.error('Failed to stop workspace session', err);
            }
        }
        closeLogStream();
        sessionIdRef.current = null;
        setWorkspaceState(createWorkspaceState());
    }, [closeLogStream]);

    const attachLogStream = useCallback((sessionId: string) => {
        closeLogStream();
        const source = api.streamLogs(sessionId, (log) => {
            setWorkspaceState(prev => ({
                ...prev,
                logs: [...prev.logs, log],
            }));
        });
        setLogStream(source);
    }, [closeLogStream]);

    const handleConnect = useCallback(async (url: string) => {
        await stopSession();
        setCommits([]);
        setSelectedCommit(null);
        setFileTree([]);
        setSelectedFilePath(null);
        setFileContent(null);
        setError(null);

        setIsLoadingCommits(true);
        setRepoUrl(url);

        try {
            const fetchedCommits = await api.fetchCommits(url);
            setCommits(fetchedCommits);
            setError(null);
            updateRepoHistory(url);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load commits';
            setError(message);
            setCommits([]);
        } finally {
            setIsLoadingCommits(false);
        }
    }, [stopSession, updateRepoHistory]);

    const findDefaultFilePath = useCallback((nodes: FileNode[]): string | null => {
        const files: FileNode[] = [];

        const traverse = (list: FileNode[]) => {
            for (const node of list) {
                if (node.type === 'file') {
                    files.push(node);
                } else if (node.children) {
                    traverse(node.children);
                }
            }
        };

        traverse(nodes);

        for (const name of PRIORITY_FILES) {
            const match = files.find(file => file.name === name);
            if (match) {
                return match.path;
            }
        }

        return files.length > 0 ? files[0].path : null;
    }, []);

    const loadFileContent = useCallback(async (commitSha: string, filePath: string) => {
        setIsLoadingFile(true);
        setSelectedFilePath(filePath);
        try {
            const content = await api.fetchFileContent(repoUrl, commitSha, filePath);
            setFileContent(content);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to load file content.';
            setFileContent(message);
        } finally {
            setIsLoadingFile(false);
        }
    }, [repoUrl]);

    const handleSelectCommit = useCallback(async (commit: Commit) => {
        await stopSession();
        setSelectedCommit(commit);
        setFileTree([]);
        setSelectedFilePath(null);
        setFileContent(null);
        setIsLoadingTree(true);

        try {
            const tree = await api.fetchTree(repoUrl, commit.sha);
            setFileTree(tree);
            const defaultPath = findDefaultFilePath(tree);
            if (defaultPath) {
                await loadFileContent(commit.sha, defaultPath);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load repository tree.';
            setFileContent(message);
        } finally {
            setIsLoadingTree(false);
        }
    }, [repoUrl, stopSession, findDefaultFilePath, loadFileContent]);

    const handleSelectFile = useCallback(async (path: string) => {
        if (!selectedCommit) return;
        await loadFileContent(selectedCommit.sha, path);
    }, [selectedCommit, loadFileContent]);

    // Simplified single action: download commit and start preview
    const handleStartPreview = useCallback(async () => {
        if (!selectedCommit) {
            console.warn('⚠️  Cannot start preview - no commit selected');
            return;
        }
        
        console.log('🚀 Starting preview for:', {
            repo: repoUrl,
            commit: selectedCommit.sha.substring(0, 7),
            fullSha: selectedCommit.sha
        });
        
        await stopSession();
        setWorkspaceState(prev => ({
            ...prev,
            status: 'preparing',
            isPrepared: false,
            previewUrl: null,
            logs: [],
        }));

        try {
            console.log('📡 Calling API startPreview...');
            console.log('⏱️  This may take 2-5 minutes for first-time setup...');
            const { sessionId, previewUrl } = await api.startPreview(repoUrl, selectedCommit.sha);
            console.log('✅ Preview started successfully:', { sessionId, previewUrl });
            
            sessionIdRef.current = sessionId;
            setWorkspaceState({
                status: 'running',
                isPrepared: true,
                sessionId,
                previewUrl,
                logs: [],
            });
            attachLogStream(sessionId);
            console.log('📺 Log stream attached');
        } catch (err) {
            console.error('❌ Failed to start preview:', err);
            if (err instanceof Error) {
                console.error('   Error message:', err.message);
                console.error('   Error stack:', err.stack);
                
                // Check if it's a timeout error
                if (err.message.includes('timeout') || err.message.includes('aborted')) {
                    console.error('⏱️  Request timed out - backend server may still be processing');
                    console.error('💡 The backend server might need to be restarted with updated code');
                    console.error('💡 Or the repository might be very large (try a smaller one first)');
                }
            }
            setWorkspaceState(prev => ({
                ...prev,
                status: 'error',
                isPrepared: false,
                logs: [{
                    timestamp: new Date(),
                    message: err instanceof Error 
                        ? `Failed to start preview: ${err.message}. The backend server may need to be restarted.`
                        : 'Failed to start preview - unknown error',
                    type: 'error'
                }],
            }));
        }
    }, [selectedCommit, repoUrl, attachLogStream, stopSession]);

    // Legacy functions kept for compatibility (can be removed later)
    const handlePrepareWorkspace = useCallback(async () => {
        if (!selectedCommit) return;
        await stopSession();
        setWorkspaceState(prev => ({
            ...prev,
            status: 'preparing',
            isPrepared: false,
            previewUrl: null,
            logs: [],
        }));

        try {
            const { sessionId } = await api.prepareWorkspace(repoUrl, selectedCommit.sha);
            sessionIdRef.current = sessionId;
            setWorkspaceState({
                status: 'preparing',
                isPrepared: false,
                sessionId,
                previewUrl: null,
                logs: [],
            });
            attachLogStream(sessionId);
            setWorkspaceState(prev => ({
                ...prev,
                status: 'stopped',
                isPrepared: true,
            }));
        } catch (err) {
            setWorkspaceState(prev => ({
                ...prev,
                status: 'error',
                isPrepared: false,
            }));
            console.error('Failed to prepare workspace', err);
        }
    }, [selectedCommit, repoUrl, attachLogStream]);

    const handleRunWorkspace = useCallback(async () => {
        const sessionId = sessionIdRef.current;
        if (!sessionId || !workspaceState.isPrepared) return;
        setWorkspaceState(prev => ({
            ...prev,
            status: 'preparing',
        }));
        try {
            const { previewUrl } = await api.runWorkspace(sessionId);
            setWorkspaceState(prev => ({
                ...prev,
                status: 'running',
                previewUrl,
            }));
        } catch (err) {
            setWorkspaceState(prev => ({
                ...prev,
                status: 'error',
            }));
            console.error('Failed to start preview', err);
        }
    }, [workspaceState.isPrepared]);

    const handleStopWorkspace = useCallback(async () => {
        await stopSession();
    }, [stopSession]);

    useEffect(() => {
        return () => {
            closeLogStream();
        };
    }, [closeLogStream]);

    // Cleanup on component unmount only
    useEffect(() => {
        return () => {
            const sessionId = sessionIdRef.current;
            if (sessionId) {
                api.stopWorkspace(sessionId).catch(() => undefined);
            }
        };
    }, []); // Empty dependency array - only runs on mount/unmount

    return (
        <div className="flex flex-col h-screen font-sans bg-gray-900 text-gray-300">
            <header className="flex items-center justify-between p-3 border-b border-gray-700 shadow-md flex-shrink-0 gap-4">
                <div className="flex items-center space-x-3">
                    <GitHubIcon className="w-8 h-8 text-blue-accent" />
                    <h1 className="text-xl font-bold text-gray-200 whitespace-nowrap">GitHub Commit Workspace Runner</h1>
                </div>
                <div className="flex-1 flex justify-center">
                    <RepoInput
                        onConnect={handleConnect}
                        initialUrl={repoUrl}
                        isLoading={isLoadingCommits}
                        history={repoHistory}
                    />
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                <CommitSidebar
                    commits={commits}
                    selectedCommit={selectedCommit}
                    onSelectCommit={handleSelectCommit}
                    isLoading={isLoadingCommits}
                    error={error}
                    repoUrl={repoUrl}
                    onAutoStartPreview={handleStartPreview}
                    workspaceStatus={workspaceState.status}
                />
                <MainView
                    hasSelectedCommit={!!selectedCommit}
                    fileTree={fileTree}
                    selectedFilePath={selectedFilePath}
                    onSelectFile={handleSelectFile}
                    codeContent={fileContent}
                    isLoadingTree={isLoadingTree}
                    isLoadingCode={isLoadingFile}
                    previewUrl={workspaceState.previewUrl}
                    isPreviewLoading={workspaceState.status === 'preparing'}
                    previewStatus={workspaceState.status === 'preparing' ? '⏳ Starting preview...' : workspaceState.status === 'running' ? '✅ Preview ready' : workspaceState.status === 'error' ? '❌ Error starting preview' : undefined}
                    previewLogs={workspaceState.logs}
                    workspaceStatus={workspaceState.status}
                />
                <ControlsSidebar
                    workspaceState={workspaceState}
                    selectedCommit={selectedCommit}
                    onStartPreview={handleStartPreview}
                    onStop={handleStopWorkspace}
                />
            </main>
        </div>
    );
};

export default App;
