
import React, { useState, useEffect, useRef } from 'react';
import { Commit } from '../types';
import { CommitIcon } from './icons/CommitIcon';
import * as api from '../services/api';

interface CommitSidebarProps {
    commits: Commit[];
    selectedCommit: Commit | null;
    onSelectCommit: (commit: Commit) => void;
    isLoading: boolean;
    error: string | null;
    repoUrl: string;
    onAutoStartPreview?: (commit: Commit) => void;
    workspaceStatus?: 'stopped' | 'preparing' | 'running' | 'error';
}

interface PreviewStatus {
  [sha: string]: {
    canPreview: boolean;
    reason: string;
    previewViabilityScore?: number;
    confidence?: number;
    recommendation?: 'highly_recommended' | 'recommended' | 'possible' | 'not_recommended';
    detectedFramework?: string | null;
    detectedBuildTool?: string | null;
    estimatedSetupTime?: string;
    strengths?: string[];
    issues?: string[];
    riskFactors?: string[];
    positiveFactors?: string[];
    aiInsights?: string;
  };
}

const CommitSidebar: React.FC<CommitSidebarProps> = ({ commits, selectedCommit, onSelectCommit, isLoading, error, repoUrl, onAutoStartPreview, workspaceStatus = 'stopped' }) => {
    const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({});
    const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
    const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
    const checkedShasRef = useRef<Set<string>>(new Set());
    const autoLaunchedShasRef = useRef<Set<string>>(new Set());
    
    // Debug: Log component state
    console.log('📋 CommitSidebar rendered:', { 
      commitsCount: commits.length, 
      repoUrl: repoUrl ? 'SET' : 'NOT SET',
      isLoading,
      error: error ? 'YES' : 'NO'
    });

    // Check preview status for each commit
    useEffect(() => {
        console.log('🔄 useEffect triggered:', { commits: commits.length, repoUrl: !!repoUrl });
        
        if (commits.length === 0 || !repoUrl) {
            console.log('⏭️  Skipping - commits.length === 0 or !repoUrl', { 
              hasCommits: commits.length > 0,
              hasRepoUrl: !!repoUrl
            });
            return;
        }

        const checkCommits = async () => {
            const status: PreviewStatus = {};
            for (const commit of commits) {
                // Skip if already checked in previous renders
                if (!checkedShasRef.current.has(commit.sha)) {
                    try {
                        // Skip if commit sha is missing
                        if (!commit.sha) {
                            continue;
                        }
                        
                        setCheckingStatus(commit.sha);
                        const result = await api.checkCommitPreviewable(repoUrl, commit.sha);
                        
                        // Handle new enhanced response format with advanced analysis
                        const scoreDisplay = result.previewViabilityScore !== undefined 
                          ? `${result.previewViabilityScore}/100`
                          : '';
                        
                        const confidenceDisplay = result.confidence !== undefined
                          ? ` (${result.confidence}% confidence)`
                          : '';
                        
                        const frameworkInfo = result.detectedFramework 
                          ? ` • ${result.detectedFramework}`
                          : '';
                        
                        status[commit.sha] = {
                            canPreview: result.previewable,
                            previewViabilityScore: result.previewViabilityScore,
                            confidence: result.confidence,
                            recommendation: result.recommendation,
                            detectedFramework: result.detectedFramework,
                            detectedBuildTool: result.detectedBuildTool,
                            estimatedSetupTime: result.estimatedSetupTime,
                            strengths: result.analysis?.strengths || [],
                            issues: result.analysis?.issues || [],
                            riskFactors: result.aiAnalysis?.riskFactors || [],
                            positiveFactors: result.aiAnalysis?.positiveFactors || [],
                            aiInsights: result.aiAnalysis?.aiInsights,
                            reason: result.previewable 
                              ? `📺 Ready: ${scoreDisplay}${confidenceDisplay}${frameworkInfo} • ${result.estimatedSetupTime || 'Unknown time'}`
                              : `❌ ${result.reason || 'Not previewable'}`
                        };
                        // Mark as checked
                        checkedShasRef.current.add(commit.sha);
                    } catch (err) {
                        const commitSha = commit.sha;
                        if (commitSha) {
                            status[commitSha] = {
                                canPreview: false,
                                reason: '⚠️ Unable to check preview status'
                            };
                            checkedShasRef.current.add(commitSha);
                        }
                    }
                }
            }
            if (Object.keys(status).length > 0) {
                setPreviewStatus(prev => ({ ...prev, ...status }));
            }
            setCheckingStatus(null);
        };

        checkCommits();
    }, [commits, repoUrl, selectedCommit, onAutoStartPreview]);

    // Auto-launch when a commit is selected and its preview status is ready
    useEffect(() => {
        if (!selectedCommit || !onAutoStartPreview) return;
        
        // Don't auto-launch if workspace is already active
        if (workspaceStatus === 'preparing' || workspaceStatus === 'running') {
            console.log('⏭️  Skipping auto-launch - workspace already active:', workspaceStatus);
            return;
        }
        
        const status = previewStatus[selectedCommit.sha];
        
        // Check if this commit is ready to auto-launch
        const shouldAutoLaunch = 
            status?.canPreview && 
            (status.recommendation === 'highly_recommended' || status.recommendation === 'recommended') &&
            !autoLaunchedShasRef.current.has(selectedCommit.sha);
        
        if (shouldAutoLaunch) {
            console.log('🎬 Auto-launching preview for selected commit:', selectedCommit.sha.substring(0, 7));
            autoLaunchedShasRef.current.add(selectedCommit.sha);
            // Delay slightly to ensure UI is ready
            setTimeout(() => onAutoStartPreview(selectedCommit), 500);
        }
    }, [selectedCommit, previewStatus, onAutoStartPreview, workspaceStatus]);

    // Filter commits to only show previewable ones
    const previewableCommits = commits.filter(commit => {
        const status = previewStatus[commit.sha];
        return status?.canPreview ?? true; // Show if still checking
    });

    const nonPreviewableCount = commits.length - previewableCommits.length;

    // Check if selected commit is ready for auto-preview
    const selectedCommitStatus = selectedCommit ? previewStatus[selectedCommit.sha] : null;
    const willAutoLaunch = selectedCommitStatus?.canPreview && 
                          (selectedCommitStatus.recommendation === 'highly_recommended' || 
                           selectedCommitStatus.recommendation === 'recommended') &&
                          !autoLaunchedShasRef.current.has(selectedCommit?.sha || '') &&
                          workspaceStatus === 'stopped'; // Only show banner when workspace is stopped

    return (
        <aside className="w-80 lg:w-96 flex-shrink-0 bg-gray-800 border-r border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700 flex-shrink-0">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CommitIcon className="w-5 h-5" />
                    Commits
                </h2>
                {nonPreviewableCount > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                        📺 Showing {previewableCommits.length} previewable / {commits.length} total
                    </p>
                )}
                {willAutoLaunch && (
                    <div className="mt-2 px-2 py-1 bg-green-900/30 border border-green-500/50 rounded text-xs text-green-300">
                        🎬 Auto-launching preview...
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto">
                {isLoading && (
                    <div className="p-4 text-center text-gray-400">Loading commits...</div>
                )}
                {error && (
                    <div className="p-4 m-4 bg-red-accent/20 text-red-accent border border-red-accent/50 rounded-md">{error}</div>
                )}
                {!isLoading && !error && previewableCommits.length === 0 && (
                     <div className="p-4 text-center text-gray-400">
                         {commits.length === 0 ? 'Connect to a repository to see commits.' : 'No previewable commits found.'}
                     </div>
                )}
                <ul>
                    {previewableCommits.map(commit => {
                        const status = previewStatus[commit.sha];
                        const isChecking = checkingStatus === commit.sha;
                        
                        return (
                            <li key={commit.sha} className="border-b border-gray-700">
                                <button
                                    onClick={() => onSelectCommit(commit)}
                                    className={`w-full text-left p-3 hover:bg-gray-700 transition duration-150 focus:outline-none focus:bg-blue-accent/20 ${selectedCommit?.sha === commit.sha ? 'bg-blue-accent/20' : ''}`}
                                    title={status?.reason}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-200 truncate">{commit.message}</p>
                                            <div className="flex items-center text-sm text-gray-400 mt-1 space-x-2">
                                                <CommitIcon className="w-4 h-4" />
                                                <span className="font-mono text-xs">{commit.sha.substring(0, 7)}</span>
                                                <span>by <strong>{commit.author.name}</strong></span>
                                            </div>
                                            <time className="text-xs text-gray-500 mt-1 block">
                                                {new Date(commit.author.date).toLocaleString()}
                                            </time>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex flex-col items-end gap-1">
                                            {isChecking ? (
                                                <span className="text-xs text-yellow-400">🔄 Analyzing...</span>
                                            ) : status?.previewViabilityScore !== undefined ? (
                                                <>
                                                  <div className="flex items-center gap-1">
                                                    <span 
                                                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                                        status.recommendation === 'highly_recommended' ? 'bg-green-900/60 text-green-300 border-green-500/50' :
                                                        status.recommendation === 'recommended' ? 'bg-green-900/40 text-green-400 border-green-500/30' :
                                                        status.recommendation === 'possible' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-500/50' :
                                                        'bg-red-900/50 text-red-300 border-red-500/50'
                                                      }`}
                                                      title={`Score: ${status.previewViabilityScore}/100 • Confidence: ${status.confidence}%\n${status.recommendation?.replace(/_/g, ' ').toUpperCase()}`}
                                                    >
                                                      {status.previewViabilityScore}
                                                    </span>
                                                    {status.recommendation === 'highly_recommended' && <span className="text-xs">🟢</span>}
                                                    {status.recommendation === 'recommended' && <span className="text-xs">✅</span>}
                                                    {status.recommendation === 'possible' && <span className="text-xs">🟡</span>}
                                                    {status.recommendation === 'not_recommended' && <span className="text-xs">🔴</span>}
                                                  </div>
                                                  {status.detectedFramework && (
                                                    <span className="text-xs text-blue-400 font-semibold truncate max-w-[120px]" title={`Framework: ${status.detectedFramework}`}>
                                                      {status.detectedFramework}
                                                    </span>
                                                  )}
                                                  {status.estimatedSetupTime && (
                                                    <span className="text-xs text-gray-400" title="Estimated setup time">
                                                      ⏱️ {status.estimatedSetupTime}
                                                    </span>
                                                  )}
                                                  {status.confidence !== undefined && (
                                                    <div className="flex items-center gap-1">
                                                      <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                                                        <div 
                                                          className={`h-full transition-all ${
                                                            status.confidence >= 80 ? 'bg-green-500' :
                                                            status.confidence >= 60 ? 'bg-yellow-500' :
                                                            'bg-orange-500'
                                                          }`}
                                                          style={{ width: `${status.confidence}%` }}
                                                        />
                                                      </div>
                                                      <span className="text-xs text-gray-500">{status.confidence}%</span>
                                                    </div>
                                                  )}
                                                </>
                                            ) : status?.canPreview ? (
                                                <span className="text-xs text-green-400 font-bold" title="Ready to preview">📺</span>
                                            ) : (
                                                <span className="text-xs text-gray-500" title={status?.reason}>❌</span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                                {status && (status.strengths && status.strengths.length > 0 || status.issues && status.issues.length > 0) && (
                                    <div className="px-3 pb-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedCommit(expandedCommit === commit.sha ? null : commit.sha);
                                            }}
                                            className="text-xs text-blue-400 hover:text-blue-300 transition"
                                        >
                                            {expandedCommit === commit.sha ? '▼ Hide Details' : '▶ Show Details'}
                                        </button>
                                        {expandedCommit === commit.sha && (
                                            <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs space-y-2">
                                                {status.strengths && status.strengths.length > 0 && (
                                                    <div>
                                                        <div className="font-semibold text-green-400 mb-1">Strengths:</div>
                                                        <ul className="space-y-0.5 text-gray-300">
                                                            {status.strengths.map((strength, idx) => (
                                                                <li key={idx}>{strength}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {status.issues && status.issues.length > 0 && (
                                                    <div>
                                                        <div className="font-semibold text-yellow-400 mb-1">Issues:</div>
                                                        <ul className="space-y-0.5 text-gray-300">
                                                            {status.issues.map((issue, idx) => (
                                                                <li key={idx}>{issue}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </aside>
    );
};

export default CommitSidebar;
