import React, { memo } from "react";
import { getCellProperties } from "../gameLogic";
import { Move, Piece, Position } from "../gameTypes";
import PieceComponent from "./Piece";
import BasicCellSVG from "./svgs/BasicCellSVG";
import PrivateStackableCellSVG from "./svgs/PrivateStackableCellSVG";
import ReturnSafeCellSVG from "./svgs/ReturnSafeCellSVG";
import RosetteCellSVG from "./svgs/RosetteCellSVG";
import StackableCellSVG from "./svgs/StackableCellSVG";

interface CellProps {
  position: Position | null; // Can be null for empty grid spaces
  pieces: Piece[];
  isPossibleStart?: boolean; // Highlight piece that can move
  isPossibleEnd?: boolean; // Highlight cell as valid destination
  animatingPieceId: number | null; // Piece currently being animated
  getAnimatingPieceTransform: (piece: Piece) => React.CSSProperties; // Function to get transform
  onSelectMove?: (move: Move) => void; // Pass the move selection handler down
  validMoves: Move[]; // Pass valid moves to find the correct move on piece click
}

const Cell: React.FC<CellProps> = ({
  position,
  pieces,
  isPossibleStart = false,
  isPossibleEnd = false,
  animatingPieceId,
  getAnimatingPieceTransform,
  onSelectMove, // Accept the handler
  validMoves, // Accept valid moves
}) => {
  if (position === null) {
    return <div className="cell empty"></div>; // Render empty grid space
  }

  const properties = getCellProperties(position); // Get base properties
  const cellClasses = ["cell", isPossibleEnd ? "possible-end" : ""]
    .filter(Boolean)
    .join(" ");

  // Determine which SVG background to render
  let CellBackgroundSVG: React.FC = BasicCellSVG; // Default
  if (properties.isRosette) {
    CellBackgroundSVG = RosetteCellSVG;
  } else if (position === 10) {
    // Private stackable
    CellBackgroundSVG = PrivateStackableCellSVG;
  } else if (properties.isStackable) {
    // Regular stackable
    CellBackgroundSVG = StackableCellSVG;
  } else if (position === 4) {
    // Return safe
    CellBackgroundSVG = ReturnSafeCellSVG;
  }
  // Add conditions for private cells if needed, otherwise BasicCellSVG covers them
  return (
    <div className={cellClasses} title={`Pos: ${position}`}>
      <CellBackgroundSVG />
      {pieces.map((piece, index) => {
        const isTopPiece = index === pieces.length - 1;
        // A piece can be clicked if its cell is a possible start AND it's the top piece
        const canThisPieceBeClicked = isPossibleStart && isTopPiece;

        // Find the specific move associated with this piece if it's clickable
        const moveForThisPiece = canThisPieceBeClicked
          ? validMoves.find(
              (move) =>
                move.pieceId === piece.id &&
                move.startPosition === piece.position,
            )
          : undefined;

        return (
          <PieceComponent
            key={piece.id}
            piece={piece}
            isTop={isTopPiece}
            isPossibleStart={canThisPieceBeClicked} // Pass if this specific piece can start
            isMoving={piece.id === animatingPieceId}
            style={
              {
                // Pass index as CSS custom property for stacking styles
                "--stack-index": index,
                // Merge with animation transform if applicable
                ...(piece.id === animatingPieceId
                  ? getAnimatingPieceTransform(piece)
                  : {}),
              } as React.CSSProperties
            } // Cast to CSSProperties to allow custom property
            // Pass the onSelectMove handler and the specific move if the piece is clickable
            onSelectMove={
              canThisPieceBeClicked && moveForThisPiece && onSelectMove
                ? () => onSelectMove(moveForThisPiece)
                : undefined
            }
          />
        );
      })}
    </div>
  );
};

// Memoize the component
export default memo(Cell);
