import React from 'react';
import { FileNode } from '../types';

interface FileTreeProps {
    tree: FileNode[];
    selectedPath: string | null;
    onSelect: (path: string) => void;
}

interface TreeItemProps {
    node: FileNode;
    depth: number;
    selectedPath: string | null;
    onSelect: (path: string) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, depth, selectedPath, onSelect }) => {
    const paddingLeft = 12 + depth * 16;

    if (node.type === 'directory') {
        return (
            <div className="mb-1">
                <div
                    className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400"
                    style={{ paddingLeft }}
                >
                    {node.name}
                </div>
                <div>
                    {node.children?.map(child => (
                        <TreeItem
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            selectedPath={selectedPath}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            </div>
        );
    }

    const isSelected = node.path === selectedPath;

    return (
        <button
            type="button"
            onClick={() => onSelect(node.path)}
            className={`w-full text-left px-3 py-1 text-sm font-mono truncate transition-colors ${
                isSelected ? 'bg-blue-accent/20 text-blue-accent' : 'text-gray-300 hover:bg-gray-700'
            }`}
            style={{ paddingLeft }}
        >
            {node.name}
        </button>
    );
};

const FileTree: React.FC<FileTreeProps> = ({ tree, selectedPath, onSelect }) => {
    return (
        <div className="py-2">
            {tree.map(node => (
                <TreeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedPath={selectedPath}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
};

export default FileTree;

