import React, { memo } from "react";
import { Piece } from "../gameTypes";

interface PieceProps {
  piece: Piece;
  isTop: boolean; // Is this the top piece in a stack?
  isPossibleStart?: boolean; // Can this piece start a move?
  isMoving?: boolean; // Is this piece currently animating a move?
  style?: React.CSSProperties; // Add style prop for animation
  onSelectMove?: (pieceId: number) => void; // Function to call when a movable piece is clicked/activated
  tabIndex?: number;
}

const PieceComponent: React.FC<PieceProps> = ({
  piece,
  isTop,
  isPossibleStart = false,
  isMoving = false,
  style = {},
  onSelectMove,
  tabIndex,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isPossibleStart && onSelectMove && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onSelectMove(piece.id);
    }
  };

  const pieceClasses = [
    "piece",
    `player-${piece.player}`,
    piece.journey === "return" ? "return-journey" : "",
    isTop ? "top-piece" : "stacked-piece",
    isPossibleStart ? "possible-start" : "",
    isMoving ? "is-moving" : "", // Add class for animation
  ]
    .filter(Boolean)
    .join(" ");

  // Simple visual representation
  const symbol = piece.player === "black" ? "⚫" : "⚪";

  return (
    <div
      className={pieceClasses}
      title={`Piece ${piece.id} (${piece.player})`}
      style={style}
      tabIndex={tabIndex}
      onClick={
        isPossibleStart && onSelectMove
          ? () => onSelectMove(piece.id)
          : undefined
      } // Make clickable if possible start
      onKeyDown={handleKeyDown}
    >
      {symbol}
      {/* Display ID for debugging */}
      {/* <span style={{ fontSize: '0.6em', position: 'absolute', bottom: '0', right: '1px' }}>{piece.id}</span> */}
    </div>
  );
};

export default memo(PieceComponent);
