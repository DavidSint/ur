import React from 'react';

const PrivateStackableCellSVG: React.FC = () => (
    <svg width="100%" height="100%" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
        <rect width="50" height="50" fill="#5a5a5a" />
        <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="25" cy="25" r="15" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="25" cy="25" r="10" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="25" cy="25" r="3" fill="rgba(255, 255, 255, 0.2)" />
        <rect x="1" y="1" width="48" height="48" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
    </svg>
);

export default PrivateStackableCellSVG;
