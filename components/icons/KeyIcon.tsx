import React from 'react';

interface KeyIconProps {
    className?: string;
}

export const KeyIcon: React.FC<KeyIconProps> = ({ className = 'w-6 h-6' }) => {
    return (
        <svg
            className={className}
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M7 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-4c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm5.41 1.59L20 4l-1.41-1.41L11 10.17l1.41 1.42zM18 6l2 2-1 1-2-2 1-1z" />
        </svg>
    );
};
