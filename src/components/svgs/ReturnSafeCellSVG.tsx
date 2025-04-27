import React from 'react';

const ReturnSafeCellSVG: React.FC = () => (
    <svg width="100%" height="100%" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
        <rect width="50" height="50" fill="#5a5a5a" />

        <path d="M0 0 L15 0 L0 15 Z" fill="rgba(100, 180, 100, 0.3)" /> {/* Top Left */}
        <path d="M50 0 L35 0 L50 15 Z" fill="rgba(100, 180, 100, 0.3)" /> {/* Top Right */}
        <path d="M0 50 L15 50 L0 35 Z" fill="rgba(100, 180, 100, 0.3)" /> {/* Bottom Left */}
        <path d="M50 50 L35 50 L50 35 Z" fill="rgba(100, 180, 100, 0.3)" /> {/* Bottom Right */}

        <rect x="1" y="1" width="48" height="48" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
    </svg>
);

export default ReturnSafeCellSVG;
