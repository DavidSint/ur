import React from "react";

const BasicCellSVG: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 50 50"
    xmlns="http://www.w3.org/2000/svg"
    style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
  >
    <defs>
      <pattern
        id="basicPattern"
        patternUnits="userSpaceOnUse"
        width="10"
        height="10"
      >
        <path d="M0 5 L5 0 L10 5 L5 10 Z" fill="rgba(255, 255, 255, 0.05)" />
      </pattern>
    </defs>
    <rect width="50" height="50" fill="#5a5a5a" />
    <rect width="50" height="50" fill="url(#basicPattern)" />
    <rect
      x="1"
      y="1"
      width="48"
      height="48"
      fill="none"
      stroke="rgba(0,0,0,0.2)"
      strokeWidth="1"
    />
  </svg>
);

export default BasicCellSVG;
