import React from 'react';
import { GameState, Player } from '../gameTypes';

interface GameInfoProps {
    message: string;
    status: GameState['status'];
    winner: Player | null;
}

const GameInfo: React.FC<GameInfoProps> = ({ message, status, winner }) => {
    let displayStatusText: string; // Use a separate variable for display string
    switch(status) {
        case 'rolling': displayStatusText = 'Ready to Roll'; break;
        case 'moving': displayStatusText = 'Select Move'; break;
        case 'ai_thinking': displayStatusText = 'AI Thinking...'; break;
        case 'player_wins': displayStatusText = 'Game Over'; break;
        case 'ai_wins': displayStatusText = 'Game Over'; break;
        default: displayStatusText = status; // Fallback to original status if needed
    }

    return (
        <div className="game-info" style={{ margin: '10px 0', minHeight: '60px', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', paddingTop: '10px', paddingBottom: '10px' }}>
            <p><strong>Status:</strong> {displayStatusText}</p>
            {message && <p><em>{message}</em></p>}
            {winner && <h2 className="winner-message">{winner === 'black' ? '🎉 You Win! 🎉' : '😞 AI Wins 😞'}</h2>}
        </div>
    );
};

export default GameInfo;
