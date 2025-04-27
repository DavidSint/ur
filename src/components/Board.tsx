import React, { useMemo } from 'react';
import { GameState, Move, Position, Piece } from '../gameTypes';
import Cell from './Cell';
import PieceComponent from './Piece';

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
    '-1': [1, -1], // Off-board start
    '99': [1, -1], // Off-board finished
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
    const { pieces, stacks, status, validMoves, animatingPieceId, animationStartPos, animationEndPos } = gameState;

    // --- Performance Optimization: Memoize piece positions ---
    const piecesByPosition = useMemo(() => {
        const map = new Map<Position | null, Piece[]>();

        // Initialize map for all board layout positions
        boardLayout.flat().forEach(pos => {
            if (pos !== null) map.set(pos, []);
        });
        map.set(-1, []); // Add off-board start
        map.set(99, []); // Add off-board finish

        // Populate the map
        pieces.forEach(piece => {
            const currentList = map.get(piece.position) ?? [];
            map.set(piece.position, [...currentList, piece]);
        });

        // Handle stacks - ensure pieces in stacks are correctly mapped
        Object.entries(stacks).forEach(([pos, stackInfo]) => {
            if (stackInfo && stackInfo.pieces.length > 0) {
                map.set(pos as Position, stackInfo.pieces);
            }
        });

        return map;
    }, [pieces, stacks]); // Recalculate only when pieces or stacks change

    // Function to find pieces at a specific grid cell position using the memoized map
    // Handles rendering the animating piece at its start position during animation
    const getPiecesOnCell = (position: Position | null): Piece[] => {
        if (position === null) return [];

        // During animation, the animating piece is visually at its start position
        if (status === 'animating' && animatingPieceId !== null && animationStartPos === position) {
             const animatingPiece = pieces.find(p => p.id === animatingPieceId); // Still need to find the piece object
             if (animatingPiece) {
                 // Get pieces normally at the start position, excluding the animating one if it was there
                 const piecesNormallyAtStart = (piecesByPosition.get(position) ?? []).filter(p => p.id !== animatingPieceId);
                 return [...piecesNormallyAtStart, animatingPiece]; // Add animating piece on top
             }
        }

        // If animating, exclude the animating piece from its *actual* final position
        if (status === 'animating' && animatingPieceId !== null) {
            return (piecesByPosition.get(position) ?? []).filter(p => p.id !== animatingPieceId);
        }

        // Default: return pieces from the memoized map
        return piecesByPosition.get(position) ?? [];
    };

    // Function to get the grid coordinates for a given position (including off-board)
    const getGridCoordinates = (position: Position | null): [number, number] | null => {
        if (position === null) return null;
        if (offBoardCoordinates[position]) return offBoardCoordinates[position]!;
        return positionToGridMap[position] || null;
    };

    // Calculate the transform style for the animating piece
    const getAnimatingPieceTransform = (piece: Piece): React.CSSProperties => {
        if (status !== 'animating' || animatingPieceId !== piece.id || animationStartPos === null || animationEndPos === null) {
            return {}; // No animation
        }
        const startCoords = getGridCoordinates(animationStartPos);
        const endCoords = getGridCoordinates(animationEndPos);
        if (!startCoords || !endCoords) return {};

        const cellSize = 64; // Cell size including margin
        const deltaX = (endCoords[1] - startCoords[1]) * cellSize;
        const deltaY = (endCoords[0] - startCoords[0]) * cellSize;

        return {
            transform: `translate(${deltaX}px, ${deltaY}px)`,
            transition: 'transform 0.5s ease-in-out',
            zIndex: 10,
        };
    };

    // Determine which moves are currently possible for highlighting
    const possibleStartPositions = status === 'moving' ? validMoves.map(m => m.startPosition) : [];
    const possibleEndPositions = status === 'moving' ? validMoves.map(m => m.endPosition) : [];

    // Get off-board pieces using the memoized map
    const blackOffBoard = piecesByPosition.get(-1)?.filter(p => p.player === 'black') ?? [];
    const whiteOffBoard = piecesByPosition.get(-1)?.filter(p => p.player === 'white') ?? [];

    return (
        <div className="board">
            <div className="off-board-area white-start">
                 <h4>White Pieces (Start)</h4>
                 <div className="piece-container">
                     {whiteOffBoard.map(piece => (
                         <PieceComponent key={piece.id} piece={piece} isTop={true} />
                     ))}
                 </div>
            </div>

            <div className="board">
                {boardLayout.map((row, rowIndex) => (
                    <div key={rowIndex} className="board-row">
                        {row.map((position, colIndex) => {
                            const cellKey = `${rowIndex}-${colIndex}`;
                            // Use the optimized getPiecesOnCell
                            const piecesOnCell = getPiecesOnCell(position);
                            const isPossibleStart = position !== null && possibleStartPositions.includes(position);
                            const isPossibleEnd = position !== null && possibleEndPositions.includes(position);

                            return (
                                <Cell
                                    key={cellKey}
                                    position={position}
                                    pieces={piecesOnCell}
                                    isPossibleStart={isPossibleStart}
                                    isPossibleEnd={isPossibleEnd}
                                    animatingPieceId={animatingPieceId}
                                    getAnimatingPieceTransform={getAnimatingPieceTransform}
                                    validMoves={validMoves}
                                    onSelectMove={onSelectMove}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>

            <div className="off-board-area black-start">
                 <h4>Black Pieces (Start)</h4>
                 <div className="piece-container">
                     {blackOffBoard.map(piece => {
                         const moveForThisPiece = status === 'moving' ? validMoves.find(m => m.pieceId === piece.id && m.startPosition === -1) : undefined;
                         const canThisPieceMove = moveForThisPiece !== undefined;
                         return (
                             <PieceComponent
                                 key={piece.id}
                                 piece={piece}
                                 isTop={true}
                                 isPossibleStart={canThisPieceMove}
                                 onSelectMove={canThisPieceMove && onSelectMove ? () => onSelectMove(moveForThisPiece!) : undefined}
                             />
                         );
                     })}
                 </div>
            </div>
        </div>
    );
};

export default Board;
