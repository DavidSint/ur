import React from 'react';
import { GameState, Player } from '../gameTypes';

interface GameInfoProps {
    message: string;
    status: GameState['status'];
    winner: Player | null;
    gameMode: 'vsAI' | 'twoPlayer';
}

const GameInfo: React.FC<GameInfoProps> = ({ message, status, winner, gameMode }) => {
    let displayStatusText: string; // Use a separate variable for display string
    switch(status) {
        case 'rolling': displayStatusText = 'Ready to Roll'; break;
        case 'moving': displayStatusText = 'Select Move'; break;
        case 'ai_thinking': displayStatusText = 'AI Thinking...'; break;
        case 'black_wins': displayStatusText = 'Game Over'; break;
        case 'white_wins': displayStatusText = 'Game Over'; break;
        default: displayStatusText = status; // Fallback to original status if needed
    }

    return (
        <div className="game-info">
            <p><strong>Status:</strong> {displayStatusText}</p>
            {!winner && message && <p><em>{message}</em></p>}
            {gameMode === 'vsAI' && winner && <h2 className="winner-message">{winner === 'black' ? '🎉 You Win! 🎉' : '😞 AI Wins 😞'}</h2>}
            {gameMode === 'twoPlayer' && winner && <h2 className="winner-message">🎉 {winner === 'black' ? 'Black' : 'White'} Wins! 🎉</h2>}
        </div>
    );
};

export default GameInfo;
