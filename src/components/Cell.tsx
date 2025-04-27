import React from 'react';
import { Position, Piece } from '../gameTypes';
import PieceComponent from './Piece';
import { getCellProperties } from '../gameLogic';

interface CellProps {
    position: Position | null; // Can be null for empty grid spaces
    pieces: Piece[];
    isPossibleStart?: boolean; // Highlight piece that can move
    isPossibleEnd?: boolean;   // Highlight cell as valid destination
    isClickable?: boolean;     // Make cell clickable
    onClick?: () => void;
    animatingPieceId: number | null; // Piece currently being animated
    getAnimatingPieceTransform: (piece: Piece) => React.CSSProperties; // Function to get transform
}

const Cell: React.FC<CellProps> = ({
    position,
    pieces,
    isPossibleStart = false,
    isPossibleEnd = false,
    isClickable = false,
    animatingPieceId,
    getAnimatingPieceTransform,
    onClick
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
        isClickable ? 'clickable' : '',
    ].filter(Boolean).join(' ');

    // Determine if the top piece is the one that can start a move
    const topPieceCanStart = isPossibleStart && pieces.length > 0;

    return (
        <div className={cellClasses} onClick={onClick} title={`Pos: ${position}`}>
            {pieces.map((piece, index) => (
                <PieceComponent
                    key={piece.id}
                    piece={piece}
                    isTop={index === pieces.length - 1}
                    // Highlight only the top piece if it's a possible start
                    isPossibleStart={topPieceCanStart && index === pieces.length - 1}
                    // Pass animation state and transform style
                    isMoving={piece.id === animatingPieceId}
                    style={piece.id === animatingPieceId ? getAnimatingPieceTransform(piece) : {}}
                />
            ))}
            {/* Optionally add rosette symbol */}
            {properties.isRosette && <span className="symbol">🌹</span>}
            {properties.isStackable && <span className="symbol">🥞</span>}
        </div>
    );
};

export default Cell;
