import { useState, useEffect, useCallback } from 'react';
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
import RulesModal from './components/RulesModal';
import SettingsModal from './components/SettingsModal';
import './App.css';
import './index.css';
import PWABadge from './PWABadge';

// --- Main App Component ---

function App() {
    const [gameState, setGameState] = useState<GameState>(() => initializeGameState('black'));
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    // --- Game Action Handlers ---

    const handleRollDice = () => {
        if (gameState.status !== 'rolling') return;
        // In twoPlayer mode, either player can roll if it's their turn
        if (gameState.gameMode === 'vsAI' && gameState.currentPlayer !== 'black') return;

        const roll = rollDie();
        const validMoves = calculateValidMoves({ ...gameState, diceRoll: roll });

        if (validMoves.length === 0) {
            // No valid moves, pass turn
            const nextPlayer = gameState.currentPlayer === 'black' ? 'white' : 'black';
            const nextStatus = (gameState.gameMode === 'vsAI' && nextPlayer === 'white') ? 'ai_thinking' : 'rolling';
            setGameState(prev => ({
                ...prev,
                diceRoll: roll,
                validMoves: [],
                status: nextStatus,
                currentPlayer: nextPlayer,
                message: `Rolled ${roll}. No valid moves. ${nextPlayer === 'black' ? 'Black' : 'White'}'s turn.`,
            }));
        } else {
            // Player has moves, wait for selection
            setGameState(prev => ({
                ...prev,
                diceRoll: roll,
                validMoves: validMoves,
                status: 'moving',
                message: `Rolled ${roll}. Select a move.`,
            }));
        }
    };

    // Memoize handleSelectMove to prevent unnecessary re-renders of children
    const handleSelectMove = useCallback((move: Move) => {
        setGameState(currentState => {
            // Allow move only if it's the current player's turn and status is 'moving'
            if (currentState.status !== 'moving' || move.pieceId < 0) return currentState;
            const piece = currentState.pieces.find(p => p.id === move.pieceId);
            if (!piece || piece.player !== currentState.currentPlayer) return currentState;

            // Apply the move, which will set the status to 'animating'
            return applyMove(currentState, move);
        });
    }, []); // No dependencies needed as it only uses setGameState

    const handleGameModeChange = useCallback((newMode: GameState['gameMode']) => {
        // Reset game when changing mode, preserving the new mode
        setGameState(initializeGameState('black'));
        setGameState(prev => ({ ...prev, gameMode: newMode }));
        setIsSettingsModalOpen(false); // Close modal after change
    }, []);

    // --- Game State Transitions (including animation) ---
    useEffect(() => {
        // Handle AI Turn (only in vsAI mode)
        if (gameState.gameMode === 'vsAI' && gameState.status === 'ai_thinking') {
            const aiTurnTimeout = setTimeout(() => {
                // 1. AI Rolls
                const roll = rollDie();
                const validMoves = calculateValidMoves({ ...gameState, diceRoll: roll, currentPlayer: 'white' });

                if (validMoves.length === 0) {
                    // AI has no moves, pass back to player
                    setGameState(prev => ({
                        ...prev,
                        diceRoll: roll, validMoves: [], status: 'rolling', currentPlayer: 'black',
                        message: `AI rolled ${roll}. No valid moves. Your turn.`,
                    }));
                    return;
                }

                // 2. AI Chooses Move
                const chosenMove = chooseAIMove(validMoves, { ...gameState, diceRoll: roll, currentPlayer: 'white' });

                if (!chosenMove) {
                     console.error("AI had valid moves but chooseAIMove returned null");
                     setGameState(prev => ({ // Fallback
                        ...prev, diceRoll: roll, validMoves: [], status: 'rolling', currentPlayer: 'black',
                        message: `AI rolled ${roll}. Error choosing move. Your turn.`,
                    }));
                    return;
                }

                // 3. AI Applies Move (This will set status to 'animating')
                const newState = applyMove({ ...gameState, diceRoll: roll, currentPlayer: 'white' }, chosenMove);
                setGameState(newState);

            }, 1000); // Initial delay before AI starts "thinking"

            return () => clearTimeout(aiTurnTimeout);
        }

        // Handle Animation Completion
        if (gameState.status === 'animating' && gameState.animatingPieceId !== null) {
            const animationDuration = 500; // milliseconds
            const animationTimeout = setTimeout(() => {
                // Use functional update for the entire transition out of animation
                setGameState(prev => {
                    // Find the piece based on the ID stored in the *previous* state (prev)
                    const animatedPiece = prev.pieces.find(p => p.id === prev.animatingPieceId);
                    if (!animatedPiece) {
                        console.error("Animated piece not found in prev state!");
                        return { ...prev, status: 'rolling', animatingPieceId: null, animationStartPos: null, animationEndPos: null, message: `${prev.currentPlayer === 'black' ? 'Black' : 'White'} to roll.` };
                    }

                    // Reconstruct the move based on the *previous* state's animation info
                    const simulatedMove: Move = {
                        pieceId: animatedPiece.id,
                        startPosition: prev.animationStartPos!,
                        endPosition: animatedPiece.position,
                        isExit: animatedPiece.position === 99,
                        isRosette: getCellProperties(animatedPiece.position, animatedPiece.journey ?? undefined).isRosette,
                        startsReturnJourney: animatedPiece.journey === 'return' && prev.animationStartPos !== null && !getPlayerOutboundPath(animatedPiece.player).includes(prev.animationStartPos),
                        takesPieceId: undefined, // Lost info, not needed here
                    };

                    // Determine the next state based on the *previous* state and the simulated move
                    const nextStateInfo = determineNextStateAfterMove(prev, simulatedMove);
                    const playerWhoMoved = prev.currentPlayer;

                    // Check for Rosette Re-roll condition
                    if (simulatedMove.isRosette && !nextStateInfo.winner) {
                        const messagePrefix = `Landed on rosette! ${playerWhoMoved === 'black' ? 'You' : 'AI'} roll${playerWhoMoved === 'black' ? '' : 's'} again. `;
                        const newRoll = rollDie();
                        const newValidMoves = calculateValidMoves({ ...prev, diceRoll: newRoll, currentPlayer: playerWhoMoved });

                        if (newValidMoves.length === 0) {
                            // No moves on re-roll
                            const nextPlayer = playerWhoMoved === 'black' ? 'white' : 'black';
                            return {
                                ...prev, diceRoll: newRoll, validMoves: [],
                                status: (prev.gameMode === 'vsAI' && nextPlayer === 'white') ? 'ai_thinking' : 'rolling',
                                currentPlayer: nextPlayer,
                                message: messagePrefix + `Rolled ${newRoll}. No valid moves. ${nextPlayer === 'black' ? 'Black' : 'White'}'s turn.`,
                                animatingPieceId: null, animationStartPos: null, animationEndPos: null,
                            };
                        } else {
                            // Has moves on re-roll
                            if (playerWhoMoved === 'black' || prev.gameMode === 'twoPlayer') {
                                // Player (Black or White in twoPlayer) needs to select move
                                return {
                                    ...prev, diceRoll: newRoll, validMoves: newValidMoves,
                                    status: 'moving', currentPlayer: playerWhoMoved, // Keep current player
                                    message: messagePrefix + `Rolled ${newRoll}. Select a move.`,
                                    animatingPieceId: null, animationStartPos: null, animationEndPos: null,
                                };
                            } else {
                                // AI re-roll move - apply it immediately
                                const aiChosenMove = chooseAIMove(newValidMoves, { ...prev, diceRoll: newRoll, currentPlayer: 'white' });
                                if (aiChosenMove) {
                                    const stateForAIReroll: GameState = { ...prev, diceRoll: newRoll, currentPlayer: 'white' };
                                    const newState = applyMove(stateForAIReroll, aiChosenMove); // Starts next animation
                                    return { ...newState, message: messagePrefix + `AI rolled ${newRoll}. ${newState.message}` };
                                } else {
                                    // Error case
                                    return { ...prev, status: 'rolling', currentPlayer: 'black', message: messagePrefix + `AI rolled ${newRoll}. Error choosing move. Your turn.`, animatingPieceId: null, animationStartPos: null, animationEndPos: null };
                                }
                            }
                        }
                    } else {
                        // Not a rosette re-roll, apply the determined next state
                        return { ...prev, ...nextStateInfo, animatingPieceId: null, animationStartPos: null, animationEndPos: null };
                    }
                }); // End functional setGameState
            }, animationDuration);

            return () => clearTimeout(animationTimeout);
        }
    }, [gameState]);


    // --- Render ---
    // Determine if the current player can interact
    const canPlayerInteract = gameState.status === 'rolling' || gameState.status === 'moving';
    const isPlayerTurn = gameState.currentPlayer === 'black' || gameState.gameMode === 'twoPlayer'; // Black always controls in vsAI, both in twoPlayer
    const canRoll = gameState.status === 'rolling' && isPlayerTurn;
    const showGameOver = gameState.status === 'player_wins' || gameState.status === 'ai_wins';

    return (
        <div className="App">
             <div className="header-controls">
                 <button className="settings-button" onClick={() => setIsSettingsModalOpen(true)} title="Settings">
                     ⚙️ {/* Gear Icon */}
                 </button>
             </div>

            <h1>Royal Game of Ur</h1>

            <Dice
                diceRoll={gameState.diceRoll}
                onRollDice={handleRollDice}
                disabled={!canRoll || showGameOver || !canPlayerInteract} // Disable if not player's turn to roll or game over
            />

            <Board
                gameState={gameState}
                onSelectMove={handleSelectMove} // Pass the memoized handler
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

            <div className="footer-controls">
                 <button onClick={() => setIsRulesModalOpen(true)}>
                     Game Rules
                 </button>
            </div>

            <RulesModal
                isOpen={isRulesModalOpen}
                onClose={() => setIsRulesModalOpen(false)}
            />

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                currentGameMode={gameState.gameMode}
                onGameModeChange={handleGameModeChange}
            />

            <PWABadge />
        </div>
    );
}

export default App;
