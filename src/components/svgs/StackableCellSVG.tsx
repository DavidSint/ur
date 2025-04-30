import React from "react";

const StackableCellSVG: React.FC = () => (
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 50 50"
    xmlns="http://www.w3.org/2000/svg"
    style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
  >
    <rect width="50" height="50" fill="#5a5a5a" />

    <rect
      x="5"
      y="5"
      width="40"
      height="40"
      fill="none"
      stroke="rgba(255, 255, 255, 0.1)"
      strokeWidth="2"
    />
    <rect
      x="10"
      y="10"
      width="30"
      height="30"
      fill="none"
      stroke="rgba(255, 255, 255, 0.1)"
      strokeWidth="2"
    />
    <rect
      x="15"
      y="15"
      width="20"
      height="20"
      fill="none"
      stroke="rgba(255, 255, 255, 0.1)"
      strokeWidth="2"
    />

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

export default StackableCellSVG;
