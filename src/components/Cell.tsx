import React, { memo } from 'react';
import { Position, Piece, Move } from '../gameTypes';
import PieceComponent from './Piece';
import { getCellProperties } from '../gameLogic';

interface CellProps {
    position: Position | null; // Can be null for empty grid spaces
    pieces: Piece[];
    isPossibleStart?: boolean; // Highlight piece that can move
    isPossibleEnd?: boolean;   // Highlight cell as valid destination
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
    const cellClasses = [
        'cell',
        properties.isRosette ? 'rosette' : '',
        properties.isStackable ? 'stackable' : '',
        properties.isPrivate ? `private-${properties.player}` : 'shared',
        isPossibleEnd ? 'possible-end' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={cellClasses} title={`Pos: ${position}`}>
            {pieces.map((piece, index) => {
                const isTopPiece = index === pieces.length - 1;
                // A piece can be clicked if its cell is a possible start AND it's the top piece
                const canThisPieceBeClicked = isPossibleStart && isTopPiece;

                // Find the specific move associated with this piece if it's clickable
                const moveForThisPiece = canThisPieceBeClicked
                    ? validMoves.find(move => move.pieceId === piece.id && move.startPosition === piece.position)
                    : undefined;


                return (
                    <PieceComponent
                        key={piece.id}
                        piece={piece}
                        isTop={isTopPiece}
                        isPossibleStart={canThisPieceBeClicked} // Pass if this specific piece can start
                        isMoving={piece.id === animatingPieceId}
                        style={{
                            // Calculate bottom offset based on index (e.g., 0px for first, 10px for second, etc.)
                            // Adjust the multiplier (e.g., 10) for desired stacking offset
                            bottom: `${index * 10}px`,
                            // Merge with animation transform if applicable
                            ...(piece.id === animatingPieceId ? getAnimatingPieceTransform(piece) : {})
                        }}
                        // Pass the onSelectMove handler and the specific move if the piece is clickable
                        onSelectMove={canThisPieceBeClicked && moveForThisPiece && onSelectMove ? () => onSelectMove(moveForThisPiece) : undefined}
                    />
                );
            })}
            {/* Optionally add rosette symbol */}
            {properties.isRosette && <span className="symbol">🌹</span>}
            {properties.isStackable && <span className="symbol">🥞</span>}
        </div>
    );
};

// Memoize the component
export default memo(Cell);
