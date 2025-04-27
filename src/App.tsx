import { useState, useEffect } from 'react';
import { GameState, Move } from './gameTypes'; // Removed Player
import {
    initializeGameState,
    rollDie,
    calculateValidMoves,
    applyMove,
    getCellProperties, // Import getCellProperties
    getPlayerOutboundPath, // Import getPlayerOutboundPath
    determineNextStateAfterMove, // Import determineNextStateAfterMove
} from './gameLogic';
import { chooseAIMove } from './aiLogic';
import Board from './components/Board';
import Dice from './components/Dice';
import GameInfo from './components/GameInfo';
import './App.css';
import './index.css'; // Ensure base styles are included

// --- Main App Component ---

function App() {
    const [gameState, setGameState] = useState<GameState>(() => initializeGameState('black'));

    // --- Game Action Handlers ---

    const handleRollDice = () => {
        if (gameState.status !== 'rolling' || gameState.currentPlayer !== 'black') return;

        const roll = rollDie();
        const validMoves = calculateValidMoves({ ...gameState, diceRoll: roll });

        if (validMoves.length === 0) {
            // No valid moves, pass turn to AI
            setGameState(prev => ({
                ...prev,
                diceRoll: roll,
                validMoves: [],
                status: 'ai_thinking', // Pass turn
                currentPlayer: 'white',
                message: `You rolled ${roll}. No valid moves. AI's turn.`,
            }));
        } else {
            // Player has moves, wait for selection
            setGameState(prev => ({
                ...prev,
                diceRoll: roll,
                validMoves: validMoves,
                status: 'moving',
                message: `You rolled ${roll}. Select a move.`,
            }));
        }
    };

    const handleSelectMove = (move: Move) => {
        if (gameState.status !== 'moving' || gameState.currentPlayer !== 'black') return;

        // Apply the move, which will set the status to 'animating'
        const newState = applyMove(gameState, move);
        setGameState(newState);
    };

    // --- Game State Transitions (including animation) ---
    useEffect(() => {
        // Handle AI Turn
        if (gameState.status === 'ai_thinking') {
            const aiTurnTimeout = setTimeout(() => {
                // 1. AI Rolls
                const roll = rollDie();
                const validMoves = calculateValidMoves({ ...gameState, diceRoll: roll, currentPlayer: 'white' });

                if (validMoves.length === 0) {
                    // AI has no moves, pass back to player
                    setGameState(prev => ({
                        ...prev,
                        diceRoll: roll,
                        validMoves: [],
                        status: 'rolling',
                        currentPlayer: 'black',
                        message: `AI rolled ${roll}. No valid moves. Your turn.`,
                    }));
                    return; // End AI turn
                }

                // 2. AI Chooses Move
                const chosenMove = chooseAIMove(validMoves, { ...gameState, diceRoll: roll, currentPlayer: 'white' });

                if (!chosenMove) {
                     console.error("AI had valid moves but chooseAIMove returned null");
                     // Pass turn back to player as a fallback
                     setGameState(prev => ({
                        ...prev,
                        diceRoll: roll,
                        validMoves: [],
                        status: 'rolling',
                        currentPlayer: 'black',
                        message: `AI rolled ${roll}. Error choosing move. Your turn.`,
                    }));
                    return; // End AI turn
                }

                // 3. AI Applies Move (This will set status to 'animating')
                 const thinkingTime = 500 + Math.random() * 1000; // 0.5 - 1.5 seconds
                 setTimeout(() => {
                    const newState = applyMove({ ...gameState, diceRoll: roll, currentPlayer: 'white' }, chosenMove); // Apply the chosen move
                    setGameState(newState);
                 }, thinkingTime);


            }, 1000); // Initial delay before AI starts "thinking"

            return () => {
                clearTimeout(aiTurnTimeout);
                // Potentially clear the inner thinkingTime timeout if component unmounts mid-AI-move?
            };
        }

        // Handle Animation Completion
        if (gameState.status === 'animating' && gameState.animatingPieceId !== null) {
            // Simulate animation duration
            const animationDuration = 500; // milliseconds

            const animationTimeout = setTimeout(() => {
                // Animation finished, determine the next game state
                // We need the move that was just animated to determine the next state
                // Since validMoves is cleared in applyMove, we need to find the move again or pass it through
                // For simplicity now, we'll re-calculate the next state based on the *final* piece position
                // A more robust solution might pass the move object or its key properties through the state.

                // Find the piece that was just animated in the *current* gameState (after applyMove updated its position)
                const animatedPiece = gameState.pieces.find(p => p.id === gameState.animatingPieceId);

                if (!animatedPiece) {
                     console.error("Animated piece not found after move!");
                     // Fallback to rolling state for current player
                     setGameState(prev => ({
                         ...prev,
                         status: 'rolling',
                         animatingPieceId: null,
                         animationStartPos: null,
                         animationEndPos: null,
                         message: `${prev.currentPlayer === 'black' ? 'Black' : 'White'} to roll.`,
                     }));
                     return;
                }

                // Reconstruct a simplified 'move' object to pass to determineNextStateAfterMove
                // This is a bit hacky; a better approach would be to store the move in state temporarily
                const simulatedMove: Move = {
                    pieceId: animatedPiece.id,
                    startPosition: gameState.animationStartPos!, // We know these are not null in 'animating' status
                    endPosition: animatedPiece.position, // Use the piece's final position
                    isExit: animatedPiece.position === 99,
                    isRosette: getCellProperties(animatedPiece.position, animatedPiece.journey ?? undefined).isRosette,
                    startsReturnJourney: animatedPiece.journey === 'return' && gameState.animationStartPos !== null && !getPlayerOutboundPath(animatedPiece.player).includes(gameState.animationStartPos), // Check if journey changed to return
                    takesPieceId: undefined, // We don't have this info easily here, might need to pass it
                };

                // Determine the next state based on the move outcome
                const nextStateInfo = determineNextStateAfterMove(gameState, simulatedMove);

                setGameState(prev => ({
                    ...prev,
                    ...nextStateInfo, // Apply the determined status, player, winner, message
                    animatingPieceId: null, // Clear animation state
                    animationStartPos: null,
                    animationEndPos: null,
                }));

            }, animationDuration); // Match the CSS animation duration

            return () => clearTimeout(animationTimeout);
        }

    }, [gameState.status, gameState.animatingPieceId]); // Re-run effect when status or animating piece changes


    // --- Render ---
    const isPlayerTurn = gameState.currentPlayer === 'black';
    const canRoll = gameState.status === 'rolling' && isPlayerTurn;
    const showGameOver = gameState.status === 'player_wins' || gameState.status === 'ai_wins';

    return (
        <div className="App">
            <h1>Royal Game of Ur</h1>

            <GameInfo
                message={gameState.message}
                status={gameState.status}
                winner={gameState.winner}
            />

            <Dice
                diceRoll={gameState.diceRoll}
                onRollDice={handleRollDice}
                disabled={!canRoll || showGameOver}
            />

            <Board
                gameState={gameState}
                onSelectMove={handleSelectMove}
            />

            {/* New Game Button */}
            {showGameOver && (
                 <button onClick={() => setGameState(initializeGameState('black'))} style={{marginTop: '20px'}}>
                     New Game
                 </button>
            )}

            {/* We can keep the PWA Badge if desired */}
            {/* <PWABadge /> */}
        </div>
    );
}

export default App;
