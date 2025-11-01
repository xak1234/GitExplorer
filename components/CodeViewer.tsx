import React from 'react';

interface CodeViewerProps {
    code: string | null;
    isLoading: boolean;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code, isLoading }) => {
    if (isLoading) {
        return <div className="p-4 text-center text-gray-400">Loading code...</div>;
    }

    if (!code) {
        return <div className="p-4 text-center text-gray-500">No code to display.</div>;
    }
    
    return (
        <div className="flex-1 overflow-auto bg-gray-800 p-4">
            <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap">
                <code>{code}</code>
            </pre>
        </div>
    );
};

export default CodeViewer;