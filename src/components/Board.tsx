import React from 'react';
import { GameState, Move, Position, Piece } from '../gameTypes';
import Cell from './Cell';
import PieceComponent from './Piece'; // Import PieceComponent
// Removed getCellProperties import as it's not used directly in Board

// Define the visual layout of the board grid (e.g., 3 rows, 8 columns)
// Map game positions to grid coordinates [row, col]
const positionToGridMap: Partial<Record<Position, [number, number]>> = {
    // White starting area (row 0)
    'w3': [0, 0], 'w2': [0, 1], 'w1': [0, 2], 'w0': [0, 3],
    // Black starting area (row 2)
    'b3': [2, 0], 'b2': [2, 1], 'b1': [2, 2], 'b0': [2, 3],
    // Shared track (row 1)
    4: [1, 0], 5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4], 9: [1, 5], 10: [1, 6], 13: [1, 7], // Corrected shared track positions
    // White side track (row 0)
    'w12': [0, 7], 'w11': [0, 6], // Corrected white side positions
    // Black side track (row 2)
    'b12': [2, 7], 'b11': [2, 6], // Corrected black side positions
};

// Define visual coordinates for off-board areas (approximate, may need tuning)
const offBoardCoordinates: Partial<Record<Position, [number, number]>> = {
    '-1': [1, -1], // Off-board start (e.g., left of the board)
    '99': [1, 9], // Off-board finished (e.g., right of the board)
};


// Define which grid cells are actual playable board positions
const boardLayout: (Position | null)[][] = [
    ['w3', 'w2', 'w1', 'w0', null, null, 'w11', 'w12'], // Row 0 (White Start/Side)
    [4,    5,    6,    7,    8,    9,    10,   13],    // Row 1 (Shared Track) - Note: 14 visually overlaps 8
    ['b3', 'b2', 'b1', 'b0', null, null, 'b11', 'b12'], // Row 2 (Black Start/Side)
];


interface BoardProps {
    gameState: GameState;
    onSelectMove: (move: Move) => void;
}

const Board: React.FC<BoardProps> = ({ gameState, onSelectMove }) => {
    // Removed currentPlayer from destructuring as it's not used here
    const { pieces, stacks, status, validMoves, animatingPieceId, animationStartPos, animationEndPos } = gameState;

    // Function to find pieces at a specific grid cell position
    // Handles rendering the animating piece at its start position during animation
    const getPiecesOnCell = (position: Position | null): Piece[] => {
        if (position === null) return [];

        // During animation, the animating piece is only rendered at its start position
        if (status === 'animating' && animatingPieceId !== null) {
            const animatingPiece = pieces.find(p => p.id === animatingPieceId);
            if (animatingPiece && animationStartPos === position) {
                 // If the start position is a stack, include other pieces in the stack
                 const stack = stacks[position];
                 if (stack) {
                     // Filter out the animating piece from the stack's pieces before adding it back
                     return [...stack.pieces.filter(p => p.id !== animatingPieceId), animatingPiece]; // Put animating piece on top visually
                 }
                 return [animatingPiece]; // Not a stack, just the animating piece
            }
            // If animating but this is not the start position, do not render the animating piece here
            if (animatingPiece && animatingPiece.position === position) {
                 // This case should ideally not happen if animationStartPos is correct,
                 // but as a fallback, exclude the animating piece from its *actual* position during animation
                 return pieces.filter(p => p.position === position && p.id !== animatingPieceId && !stacks[p.position]);
            }
        }


        // For all other cases (not animating, or not the animating piece's start position)
        const stack = stacks[position];
        if (stack && stack.pieces.length > 0) {
            return stack.pieces; // Return all pieces in the stack
        }
        // Find non-stacked pieces at this position
        return pieces.filter(p => p.position === position && !stacks[p.position]);
    };

    // Function to get the grid coordinates for a given position (including off-board)
    const getGridCoordinates = (position: Position | null): [number, number] | null => {
        if (position === null) return null;
        // Check off-board coordinates first
        if (offBoardCoordinates[position]) {
            return offBoardCoordinates[position]!;
        }
        // Check on-board coordinates
        return positionToGridMap[position] || null;
    };

    // Calculate the transform style for the animating piece
    const getAnimatingPieceTransform = (piece: Piece): React.CSSProperties => {
        if (status !== 'animating' || animatingPieceId !== piece.id || animationStartPos === null || animationEndPos === null) {
            return {}; // No animation
        }

        const startCoords = getGridCoordinates(animationStartPos);
        const endCoords = getGridCoordinates(animationEndPos);

        if (!startCoords || !endCoords) {
            console.error("Could not get grid coordinates for animation:", animationStartPos, animationEndPos);
            return {}; // Cannot animate without valid coordinates
        }

        // Calculate the pixel difference between start and end cell centers
        // Assuming each cell is 60x60px with 2px margin (total 64px per cell including margin)
        const cellSize = 64; // Cell size including margin

        const deltaX = (endCoords[1] - startCoords[1]) * cellSize;
        const deltaY = (endCoords[0] - startCoords[0]) * cellSize;

        // Adjust for the piece's absolute positioning within the cell (translateX(-50%))
        // The animation should move the piece from the center of the start cell to the center of the end cell.
        // Since the piece is already centered in its start cell, the transform is just the delta.

        return {
            transform: `translate(${deltaX}px, ${deltaY}px)`,
            transition: 'transform 0.5s ease-in-out', // Match CSS transition duration
            zIndex: 10, // Ensure moving piece is on top
        };
    };

    // Determine which moves are currently possible for highlighting
    const possibleStartPositions = status === 'moving' ? validMoves.map(m => m.startPosition) : [];
    const possibleEndPositions = status === 'moving' ? validMoves.map(m => m.endPosition) : [];

    return (
        <div className="board">
            {boardLayout.map((row, rowIndex) => (
                <div key={rowIndex} className="board-row">
                    {row.map((position, colIndex) => {
                        const cellKey = `${rowIndex}-${colIndex}`;
                        const piecesOnCell = getPiecesOnCell(position);
                        const isPossibleStart = position !== null && possibleStartPositions.includes(position);
                        // Check if *this specific cell* is a valid destination for *any* move
                        const isPossibleEnd = position !== null && possibleEndPositions.includes(position);

                        // Find the specific move associated with clicking this cell (if it's an end position)
                        // const moveForThisCell = status === 'moving' ? validMoves.find(m => m.endPosition === position) : undefined; // Removed unused variable

                        // Determine if the cell itself should be clickable (as a destination)
                        // const isClickable = status === 'moving' && moveForThisCell !== undefined && currentPlayer === 'black'; // Removed unused variable

                        return (
                            <Cell
                                key={cellKey}
                                position={position}
                                pieces={piecesOnCell}
                                isPossibleStart={isPossibleStart}
                                isPossibleEnd={isPossibleEnd}
                                // Removed isClickable prop
                                // Removed onClick prop from Cell
                                // Pass animation state and transform style to Cell
                                animatingPieceId={animatingPieceId}
                                getAnimatingPieceTransform={getAnimatingPieceTransform}
                                validMoves={validMoves} // Pass validMoves down to Cell
                                onSelectMove={onSelectMove} // Pass the move selection handler down
                            />
                        );
                    })}
                </div>
            ))}
             {/* Render off-board pieces using PieceComponent */}
             <div className="off-board-area">
                 <h4>Black Pieces Off-Board:</h4>
                 <div className="piece-container">
                     {pieces.filter(p => p.player === 'black' && p.position === -1).map(piece => {
                         // Check if there's a valid move starting from -1 for this piece
                         const moveForThisPiece = status === 'moving' ? validMoves.find(m => m.pieceId === piece.id && m.startPosition === -1) : undefined;
                         const canThisPieceMove = moveForThisPiece !== undefined;
                         return (
                             <PieceComponent
                                 key={piece.id}
                                 piece={piece}
                                 isTop={true} // Off-board pieces are always considered 'top'
                                 isPossibleStart={canThisPieceMove}
                                 onSelectMove={canThisPieceMove && onSelectMove ? () => onSelectMove(moveForThisPiece!) : undefined}
                                 // No animation style needed for off-board pieces initially
                             />
                         );
                     })}
                 </div>
                 <h4>White Pieces Off-Board:</h4>
                  <div className="piece-container">
                     {pieces.filter(p => p.player === 'white' && p.position === -1).map(piece => (
                         // White pieces are AI controlled, so not clickable by player
                         <PieceComponent
                             key={piece.id}
                             piece={piece}
                             isTop={true}
                         />
                     ))}
                 </div>
             </div>
             <div className="finished-area">
                 <h4>Black Pieces Finished:</h4>
                 <div className="piece-container">
                     {pieces.filter(p => p.player === 'black' && p.position === 99).map(piece => (
                         <PieceComponent key={piece.id} piece={piece} isTop={true} />
                     ))}
                 </div>
                 <h4>White Pieces Finished:</h4>
                 <div className="piece-container">
                     {pieces.filter(p => p.player === 'white' && p.position === 99).map(piece => (
                         <PieceComponent key={piece.id} piece={piece} isTop={true} />
                     ))}
                 </div>
             </div>
        </div>
    );
};

export default Board;
