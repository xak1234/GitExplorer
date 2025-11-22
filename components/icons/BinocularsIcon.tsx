import React from 'react';

interface BinocularsIconProps {
    className?: string;
}

export const BinocularsIcon: React.FC<BinocularsIconProps> = ({ className = 'w-6 h-6' }) => {
    return (
        <svg
            className={className}
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M7 10h2V8H7v2zm6 0h2V8h-2v2zm8-4h-4V4h-2v2h-4V4h-2v2H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H5V8h14v12z"/>
        </svg>
    );
};
