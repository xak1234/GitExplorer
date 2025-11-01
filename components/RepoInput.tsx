
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { getUserRepositories, Repository } from '../services/api';

interface RepoInputProps {
    onConnect: (url: string) => void;
    initialUrl: string;
    isLoading: boolean;
    history: string[];
}

const GITHUB_BASE = 'https://github.com/xak1234';

const RepoInput: React.FC<RepoInputProps> = ({ onConnect, initialUrl, isLoading, history }) => {
    // Extract repo name from full URL for display
    const extractRepoName = (fullUrl: string): string => {
        const match = fullUrl.match(/github\.com\/xak1234\/([^\/]+)/);
        return match && match[1] ? match[1] : fullUrl;
    };

    const [repoName, setRepoName] = useState(extractRepoName(initialUrl));
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [repositories, setRepositories] = useState<Repository[]>([]);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);
    const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch repositories on mount
    useEffect(() => {
        const fetchRepos = async () => {
            setIsLoadingRepos(true);
            const repos = await getUserRepositories('xak1234');
            setRepositories(repos);
            setFilteredRepos(repos);
            setIsLoadingRepos(false);
        };
        fetchRepos();
    }, []);

    // Filter repositories based on search input with immediate single-character matching
    useEffect(() => {
        if (repoName.trim() === '') {
            setFilteredRepos(repositories);
            setSelectedIndex(0);
        } else {
            const searchTerm = repoName.toLowerCase().trim();
            
            // Immediate filtering - even for single characters
            const filtered = repositories.filter(repo => {
                const repoNameLower = repo.name.toLowerCase();
                const descriptionLower = (repo.description || '').toLowerCase();
                const fullNameLower = repo.fullName.toLowerCase();
                
                return repoNameLower.includes(searchTerm) ||
                       descriptionLower.includes(searchTerm) ||
                       fullNameLower.includes(searchTerm);
            }).sort((a, b) => {
                const aNameLower = a.name.toLowerCase();
                const bNameLower = b.name.toLowerCase();
                
                // 1. Exact name matches first
                const aNameExact = aNameLower === searchTerm ? 0 : 1;
                const bNameExact = bNameLower === searchTerm ? 0 : 1;
                if (aNameExact !== bNameExact) return aNameExact - bNameExact;
                
                // 2. Names starting with search term
                const aNameStarts = aNameLower.startsWith(searchTerm) ? 0 : 1;
                const bNameStarts = bNameLower.startsWith(searchTerm) ? 0 : 1;
                if (aNameStarts !== bNameStarts) return aNameStarts - bNameStarts;
                
                // 3. Names containing search term (anywhere)
                const aNameContains = aNameLower.includes(searchTerm) ? 0 : 1;
                const bNameContains = bNameLower.includes(searchTerm) ? 0 : 1;
                if (aNameContains !== bNameContains) return aNameContains - bNameContains;
                
                // 4. Description matches
                const aDescContains = (a.description || '').toLowerCase().includes(searchTerm) ? 0 : 1;
                const bDescContains = (b.description || '').toLowerCase().includes(searchTerm) ? 0 : 1;
                if (aDescContains !== bDescContains) return aDescContains - bDescContains;
                
                // 5. Alphabetical by name as final tiebreaker
                return aNameLower.localeCompare(bNameLower);
            });
            
            setFilteredRepos(filtered);
            setSelectedIndex(0); // Reset to first item when filter changes
        }
    }, [repoName, repositories]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    useEffect(() => {
        setRepoName(extractRepoName(initialUrl));
    }, [initialUrl]);

    // Scroll selected item into view when using keyboard navigation
    useEffect(() => {
        if (dropdownRef.current && selectedIndex >= 0) {
            const selectedElement = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // If dropdown is open and there are filtered results, select the highlighted one
        if (isDropdownOpen && filteredRepos.length > 0) {
            const selectedRepo = filteredRepos[selectedIndex];
            handleSelectRepo(selectedRepo);
            return;
        }
        
        // Otherwise connect with the typed repo name
        const fullUrl = `${GITHUB_BASE}/${repoName}`;
        onConnect(fullUrl);
        setIsDropdownOpen(false);
    };

    const handleSelectRepo = (repo: Repository) => {
        setRepoName(repo.name);
        setIsDropdownOpen(false);
        // Immediately connect to selected repo
        const fullUrl = `${GITHUB_BASE}/${repo.name}`;
        onConnect(fullUrl);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isDropdownOpen || filteredRepos.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredRepos.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredRepos.length) % filteredRepos.length);
        } else if (e.key === 'Escape') {
            setIsDropdownOpen(false);
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <div className="relative w-80">
                    <div className="flex items-center">
                        <span className="absolute left-3 text-gray-400 font-mono text-sm pointer-events-none">
                            xak1234/
                        </span>
                        <input
                            type="text"
                            value={repoName}
                            onChange={(e) => {
                                setRepoName(e.target.value);
                                // Open dropdown immediately when typing
                                if (!isDropdownOpen) {
                                    setIsDropdownOpen(true);
                                }
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type any character to search..."
                            className="w-full pl-20 pr-10 py-1.5 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition text-yellow-400 font-bold placeholder-gray-500"
                            disabled={isLoading}
                            autoComplete="off"
                        />
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>
                <button
                    type="submit"
                    className="px-4 py-1.5 font-semibold text-white bg-blue-400 rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                    disabled={isLoading}
                >
                    {isLoading ? 'Connecting...' : 'Connect'}
                </button>
            </form>
            {isDropdownOpen && (
                <div ref={dropdownRef} className="absolute z-10 top-full mt-1 w-80 bg-gray-700 border border-gray-600 rounded-md shadow-lg overflow-hidden max-h-96 overflow-y-auto">
                    {isLoadingRepos ? (
                        <div className="px-3 py-4 text-center text-gray-400 text-sm">
                            <div className="animate-pulse">Loading xak1234's repositories...</div>
                        </div>
                    ) : filteredRepos.length > 0 ? (
                        <>
                            <div className="px-3 py-2 bg-gray-800 border-b border-gray-600 text-xs text-gray-400 font-semibold sticky top-0 flex items-center justify-between">
                                <span>
                                    {repoName.trim() ? `Searching "${repoName}"` : "xak1234's Repositories"}
                                </span>
                                <span className="text-xs text-gray-500">{filteredRepos.length} of {repositories.length}</span>
                            </div>
                            <ul>
                                {filteredRepos.map((repo, index) => (
                                    <li key={index} className="border-b border-gray-600 last:border-b-0">
                                        <button
                                            type="button"
                                            data-index={index}
                                            onMouseDown={() => handleSelectRepo(repo)}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            className={`w-full text-left px-3 py-2 transition group ${
                                                index === selectedIndex 
                                                    ? 'bg-blue-600/40 border-l-2 border-blue-400' 
                                                    : 'hover:bg-gray-600'
                                            }`}
                                            title={repo.description || repo.fullName}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm text-yellow-400 font-bold truncate group-hover:text-yellow-300">
                                                        {repo.name}
                                                    </div>
                                                    {repo.description && (
                                                        <div className="text-xs text-gray-400 truncate mt-0.5">
                                                            {repo.description}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                                            {repo.language}
                                                        </span>
                                                        {repo.stars > 0 && (
                                                            <span>⭐ {repo.stars}</span>
                                                        )}
                                                        <span className="text-xs text-gray-600">
                                                            {new Date(repo.updatedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : repositories.length > 0 ? (
                        <div className="px-3 py-4 text-center text-gray-400 text-sm">
                            <div>No repositories match "{repoName}"</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Try typing a different character or part of the repository name
                            </div>
                        </div>
                    ) : (
                        <div className="px-3 py-4 text-center text-gray-400 text-sm">
                            No repositories found for xak1234
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RepoInput;
