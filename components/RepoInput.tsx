import React, { useState, useRef, useEffect } from 'react';

interface RepoInputProps {
  initialUrl?: string;
  onConnect: (url: string) => void;
  isLoading?: boolean;
  history?: string[];
  disabled?: boolean;
}

const RepoInput: React.FC<RepoInputProps> = ({ 
  initialUrl = '',
  onConnect,
  isLoading = false,
  history = [],
  disabled = false
}) => {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [input, setInput] = useState('');
  const [repos, setRepos] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse GitHub URL to extract owner and repo
  const parseGitHubUrl = (url: string) => {
    try {
      // Handle both full URLs and owner/repo format
      let match = url.match(/github\.com\/([^\/\s]+)\/([^\/\s?#]+)/);
      
      if (match && match[1] && match[2]) {
        return { owner: match[1].trim(), repo: match[2].trim() };
      }

      // Handle owner/repo format directly
      match = url.match(/^([^\/\s]+)\/([^\/\s]+)$/);
      if (match && match[1] && match[2]) {
        return { owner: match[1].trim(), repo: match[2].trim() };
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  // Initialize from URL
  useEffect(() => {
    const parsed = parseGitHubUrl(initialUrl);
    if (parsed) {
      setOwner(parsed.owner);
      setRepo(parsed.repo);
    }
  }, [initialUrl]);

  // Fetch repos when owner changes
  useEffect(() => {
    if (owner && owner.trim()) {
      fetchRepositories(owner);
    }
  }, [owner]);

  const fetchRepositories = async (ownerName: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/user/${ownerName}/repos`);
      if (!response.ok) {
        throw new Error(`Failed to fetch repos: ${response.status}`);
      }
      const data = await response.json();
      // Handle the API response structure: data.repos is the array
      setRepos(data.repos || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load repositories');
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Show dropdown when user types
    setShowDropdown(true);
    
    // Try to parse owner/repo format
    const parsed = parseGitHubUrl(value);
    if (parsed && parsed.owner !== owner) {
      setOwner(parsed.owner);
    }
  };

  const handleSelectRepo = (selectedRepo: any) => {
    const selectedRepoName = selectedRepo.name;
    setRepo(selectedRepoName);
    setInput('');
    setShowDropdown(false);
    
    const fullUrl = `https://github.com/${owner}/${selectedRepoName}`;
    onConnect(fullUrl);
  };

  const handleInputSubmit = () => {
    if (input.trim()) {
      const parsed = parseGitHubUrl(input);
      if (parsed && parsed.owner && parsed.repo) {
        setOwner(parsed.owner);
        setRepo(parsed.repo);
        setInput('');
        setShowDropdown(false);
        const fullUrl = `https://github.com/${parsed.owner}/${parsed.repo}`;
        onConnect(fullUrl);
      }
    } else {
      // If no input, connect to current owner/repo
      const fullUrl = `https://github.com/${owner}/${repo}`;
      onConnect(fullUrl);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRepos = Array.isArray(repos)
    ? repos.filter(r =>
        !input || r.name.toLowerCase().includes(input.toLowerCase())
      )
    : [];

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative w-96" ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            placeholder={owner && repo ? `${owner}/${repo}` : 'Enter GitHub repo URL or owner/repo'}
            disabled={disabled}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-yellow-400 placeholder-yellow-400 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 disabled:bg-gray-600"
          />
          
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {loading && (
                <div className="px-4 py-2 text-gray-700 text-sm">Loading repos...</div>
              )}
              {error && (
                <div className="px-4 py-2 text-red-600 text-sm">Error: {error}</div>
              )}
              {!loading && !error && filteredRepos.length === 0 && (
                <div className="px-4 py-2 text-gray-700 text-sm">No repositories found</div>
              )}
              {filteredRepos.map((r) => (
                <div
                  key={r.name}
                  onClick={() => handleSelectRepo(r)}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">{r.name}</div>
                  {r.description && (
                    <div className="text-sm text-gray-600 truncate">{r.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleInputSubmit}
          disabled={disabled || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    </div>
  );
};

export default RepoInput;
