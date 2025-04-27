import { useState, useEffect } from 'react';
import { GameState, Move } from './gameTypes';
import {
    initializeGameState,
    rollDie,
    calculateValidMoves,
    applyMove,
    getCellProperties,
    getPlayerOutboundPath,
    determineNextStateAfterMove,
} from './gameLogic';
import { chooseAIMove } from './aiLogic';
import Board from './components/Board';
import Dice from './components/Dice';
import GameInfo from './components/GameInfo';
import './App.css';
import './index.css'; // Ensure base styles are included
import PWABadge from './PWABadge';

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

                  const newState = applyMove({ ...gameState, diceRoll: roll, currentPlayer: 'white' }, chosenMove); // Apply the chosen move
                  setGameState(newState);


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

                // Use functional update for the entire transition out of animation
                setGameState(prev => {
                    // Find the piece based on the ID stored in the *previous* state (prev)
                    const animatedPiece = prev.pieces.find(p => p.id === prev.animatingPieceId);

                    if (!animatedPiece) {
                        console.error("Animated piece not found in prev state!");
                        return { // Fallback state
                            ...prev,
                            status: 'rolling',
                            animatingPieceId: null, animationStartPos: null, animationEndPos: null,
                            message: `${prev.currentPlayer === 'black' ? 'Black' : 'White'} to roll.`,
                        };
                    }

                    // Reconstruct the move based on the *previous* state's animation info
                    const simulatedMove: Move = {
                        pieceId: animatedPiece.id,
                        startPosition: prev.animationStartPos!,
                        endPosition: animatedPiece.position, // Use final position from prev state
                        isExit: animatedPiece.position === 99,
                        isRosette: getCellProperties(animatedPiece.position, animatedPiece.journey ?? undefined).isRosette,
                        startsReturnJourney: animatedPiece.journey === 'return' && prev.animationStartPos !== null && !getPlayerOutboundPath(animatedPiece.player).includes(prev.animationStartPos),
                        takesPieceId: undefined, // Lost info, not needed for next state logic
                    };

                    // Determine the next state based on the *previous* state and the simulated move
                    const nextStateInfo = determineNextStateAfterMove(prev, simulatedMove);
                    const playerWhoMoved = prev.currentPlayer;

                    // Check for Rosette Re-roll condition
                    if (simulatedMove.isRosette && !nextStateInfo.winner) {
                        const messagePrefix = `Landed on rosette! ${playerWhoMoved === 'black' ? 'You' : 'AI'} roll${playerWhoMoved === 'black' ? '' : 's'} again. `;
                        const newRoll = rollDie();
                        // Calculate moves based on the state *before* this update ('prev')
                        const newValidMoves = calculateValidMoves({ ...prev, diceRoll: newRoll, currentPlayer: playerWhoMoved });

                        if (newValidMoves.length === 0) {
                            // No moves on re-roll
                            const nextPlayer = playerWhoMoved === 'black' ? 'white' : 'black';
                            return {
                                ...prev,
                                diceRoll: newRoll, validMoves: [],
                                status: nextPlayer === 'white' ? 'ai_thinking' : 'rolling',
                                currentPlayer: nextPlayer,
                                message: messagePrefix + `Rolled ${newRoll}. No valid moves. ${nextPlayer === 'black' ? 'Your' : "AI's"} turn.`,
                                animatingPieceId: null, animationStartPos: null, animationEndPos: null,
                            };
                        } else {
                            // Has moves on re-roll
                            if (playerWhoMoved === 'black') {
                                return {
                                    ...prev,
                                    diceRoll: newRoll, validMoves: newValidMoves,
                                    status: 'moving', currentPlayer: 'black',
                                    message: messagePrefix + `Rolled ${newRoll}. Select a move.`,
                                    animatingPieceId: null, animationStartPos: null, animationEndPos: null,
                                };
                            } else {
                                // AI re-roll move - apply it immediately
                                const aiChosenMove = chooseAIMove(newValidMoves, { ...prev, diceRoll: newRoll, currentPlayer: 'white' });
                                if (aiChosenMove) {
                                    const stateForAIReroll: GameState = { ...prev, diceRoll: newRoll, currentPlayer: 'white' };
                                    const newState = applyMove(stateForAIReroll, aiChosenMove); // Starts next animation
                                    return {
                                        ...newState,
                                        message: messagePrefix + `AI rolled ${newRoll}. ${newState.message}`
                                    };
                                } else {
                                    // Error case
                                    return {
                                        ...prev, status: 'rolling', currentPlayer: 'black',
                                        message: messagePrefix + `AI rolled ${newRoll}. Error choosing move. Your turn.`,
                                        animatingPieceId: null, animationStartPos: null, animationEndPos: null,
                                    };
                                }
                            }
                        }
                    } else {
                        // Not a rosette re-roll, apply the determined next state
                        return {
                            ...prev,
                            ...nextStateInfo,
                            animatingPieceId: null, animationStartPos: null, animationEndPos: null,
                        };
                    }
                }); // End functional setGameState

            }, animationDuration); // Match the CSS animation duration

            return () => clearTimeout(animationTimeout);
        }

    }, [gameState]); // Keep dependencies minimal but correct


    // --- Render ---
    const isPlayerTurn = gameState.currentPlayer === 'black';
    const canRoll = gameState.status === 'rolling' && isPlayerTurn;
    const showGameOver = gameState.status === 'player_wins' || gameState.status === 'ai_wins';

    return (
        <div className="App">
            <h1>Royal Game of Ur</h1>

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

            <GameInfo
                message={gameState.message}
                status={gameState.status}
                winner={gameState.winner}
            />
            <PWABadge />
        </div>
    );
}

export default App;
