import React from 'react';

const RosetteCellSVG: React.FC = () => (
    <svg width="100%" height="100%" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
        <rect width="50" height="50" fill="#6a4a4a" />

        {/* Petals */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
            <ellipse
                key={angle}
                cx="25"
                cy="25"
                rx="12"
                ry="6"
                fill="#d0b080"
                stroke="#a08050"
                strokeWidth="0.5"
                transform={`rotate(${angle} 25 25)`}
            />
        ))}
         {/* Central circle */}
         <circle cx="25" cy="25" r="5" fill="#f0e0b0" stroke="#a08050" strokeWidth="1"/>

        <rect x="1" y="1" width="48" height="48" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
    </svg>
);

export default RosetteCellSVG;
