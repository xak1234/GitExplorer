import React, { useState, useEffect } from 'react';

interface PATModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (pat: string) => void;
}

const PATModal: React.FC<PATModalProps> = ({ isOpen, onClose, onSave }) => {
    const [pat, setPat] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);

    useEffect(() => {
        // Load saved PAT from localStorage on mount
        try {
            const saved = localStorage.getItem('github_pat');
            if (saved) {
                setPat(saved);
            }
        } catch (e) {
            console.error('Failed to load PAT from localStorage', e);
        }
    }, []);

    const handleSave = () => {
        if (pat.trim()) {
            try {
                localStorage.setItem('github_pat', pat);
                onSave(pat);
                onClose();
            } catch (e) {
                console.error('Failed to save PAT to localStorage', e);
            }
        }
    };

    const handleClear = () => {
        setPat('');
        try {
            localStorage.removeItem('github_pat');
        } catch (e) {
            console.error('Failed to clear PAT from localStorage', e);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-96 border border-gray-700">
                <h2 className="text-xl font-bold text-gray-100 mb-2">GitHub Personal Access Token</h2>
                <p className="text-sm text-gray-400 mb-4">
                    Enter your GitHub PAT to authenticate API requests. Your token is stored locally and never sent to external servers.
                </p>

                <div className="relative mb-4">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={pat}
                        onChange={(e) => setPat(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="ghp_..."
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2 text-gray-400 hover:text-gray-200"
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                    >
                        Save
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded font-medium transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded font-medium transition-colors"
                    >
                        Cancel
                    </button>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                    💡 Create a PAT at: github.com/settings/tokens
                </p>
            </div>
        </div>
    );
};

export default PATModal;
