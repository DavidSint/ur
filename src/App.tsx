import { useCallback, useEffect, useState } from "react";
import { chooseAIMove } from "./aiLogic";
import Board from "./components/Board";
import GameInfo from "./components/GameInfo";
import RulesModal from "./components/RulesModal";
import SettingsModal from "./components/SettingsModal";
import {
  applyMove,
  calculateValidMoves,
  determineNextStateAfterMove,
  getCellProperties,
  getPlayerOutboundPath,
  initializeGameState,
  rollDie,
} from "./gameLogic";
import { GameState, Move } from "./gameTypes";
import "./App.css";
import "./index.css";
import PWABadge from "./PWABadge";

function isValidGameState(data: any): data is GameState {
  if (typeof data !== "object" || data === null) return false;

  if (!Array.isArray(data.pieces)) return false;
  if (typeof data.stacks !== "object") return false;
  if (data.currentPlayer !== "black" && data.currentPlayer !== "white")
    return false;
  if (typeof data.diceRoll !== "number" && data.diceRoll !== null) return false;
  if (!Array.isArray(data.validMoves)) return false;
  const validStatuses = [
    "rolling",
    "moving",
    "ai_thinking",
    "game_over",
    "black_wins",
    "white_wins",
    "animating",
  ];
  if (typeof data.status !== "string" || !validStatuses.includes(data.status))
    return false;
  if (
    data.winner !== "black" &&
    data.winner !== "white" &&
    data.winner !== null
  )
    return false;
  if (typeof data.message !== "string") return false;
  if (
    typeof data.animatingPieceId !== "number" &&
    data.animatingPieceId !== null
  )
    return false;

  if (typeof data.animationStartPos === "undefined") return false;
  if (typeof data.animationEndPos === "undefined") return false;
  if (data.gameMode !== "vsAI" && data.gameMode !== "twoPlayer") return false;
  if (typeof data.shouldPersistState !== "boolean") return false;

  if (data.pieces.length > 0) {
    const piece = data.pieces[0];
    if (typeof piece !== "object" || piece === null) return false;
    if (typeof piece.id !== "number") return false;
    if (piece.player !== "black" && piece.player !== "white") return false;
    if (typeof piece.position === "undefined") return false;
    if (typeof piece.journey === "undefined") return false;
  }

  if (data.stacks !== null) {
    const stackKeys = Object.keys(data.stacks);
    if (stackKeys.length > 0) {
      const firstStackKey = stackKeys[0];
      const stackInfo = data.stacks[firstStackKey];
      if (typeof stackInfo !== "object" || stackInfo === null) return false;
      if (!Array.isArray(stackInfo.pieces)) return false;
      if (
        stackInfo.owner !== "black" &&
        stackInfo.owner !== "white" &&
        stackInfo.owner !== null
      )
        return false;
    }
  }

  return true;
}

const gameStateKey = "game_state";
function useGameState(initialState: GameState) {
  const [gameState, setGameState] = useState<GameState>(() => {
    let gs: GameState;
    try {
      const jsonString = localStorage.getItem(gameStateKey);
      if (jsonString !== null) {
        gs = JSON.parse(jsonString);
        if (!isValidGameState(gs)) {
          throw new Error("Invalid game state structure");
        }
      } else {
        gs = initialState;
      }
    } catch (e) {
      console.error(
        "Error loading or validating game state, resetting game:",
        e,
      );
      gs = initialState;
    }
    return gs;
  });

  return [gameState, setGameState] as const;
}

// --- Main App Component ---

function App() {
  const [gameState, setGameState] = useGameState(initializeGameState("black"));
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // --- Game Action Handlers ---

  const handleRollDice = () => {
    if (gameState.status !== "rolling") return;
    // In twoPlayer mode, either player can roll if it's their turn
    if (gameState.gameMode === "vsAI" && gameState.currentPlayer !== "black")
      return;

    const roll = rollDie();
    const validMoves = calculateValidMoves({ ...gameState, diceRoll: roll });

    if (validMoves.length === 0) {
      // No valid moves, pass turn
      const nextPlayer =
        gameState.currentPlayer === "black" ? "white" : "black";
      const nextStatus =
        gameState.gameMode === "vsAI" && nextPlayer === "white"
          ? "ai_thinking"
          : "rolling";
      setGameState((prev) => ({
        ...prev,
        diceRoll: roll,
        validMoves: [],
        status: nextStatus,
        currentPlayer: nextPlayer,
        message: `Rolled ${roll}. No valid moves. ${nextPlayer === "black" ? "Black" : "White"}'s turn.`,
      }));
    } else {
      // Player has moves, wait for selection
      setGameState((prev) => ({
        ...prev,
        diceRoll: roll,
        validMoves: validMoves,
        status: "moving",
        message: `Rolled ${roll}. Select a move.`,
      }));
    }
  };

  // Memoize handleSelectMove to prevent unnecessary re-renders of children
  const handleSelectMove = useCallback((move: Move) => {
    setGameState((currentState) => {
      // Allow move only if it's the current player's turn and status is 'moving'
      if (currentState.status !== "moving" || move.pieceId < 0)
        return currentState;
      const piece = currentState.pieces.find((p) => p.id === move.pieceId);
      if (!piece || piece.player !== currentState.currentPlayer)
        return currentState;

      // Apply the move, which will set the status to 'animating'
      return applyMove(currentState, move);
    });
  }, []); // No dependencies needed as it only uses setGameState

  const handleGameModeChange = useCallback((newMode: GameState["gameMode"]) => {
    // Reset game when changing mode, preserving the new mode
    setGameState((prev) => ({
      ...initializeGameState("black"),
      shouldPersistState: prev.shouldPersistState,
      gameMode: newMode,
    }));
    setIsSettingsModalOpen(false); // Close modal after change
  }, []);

  const handleGameStateChange = useCallback((shouldPersistState: boolean) => {
    setGameState((prev) => ({ ...prev, shouldPersistState }));
    if (!shouldPersistState) {
      localStorage.removeItem(gameStateKey);
    }
  }, []);

  // --- Game State Transitions (including animation) ---
  useEffect(() => {
    // Handle AI Turn (only in vsAI mode)
    if (gameState.gameMode === "vsAI" && gameState.status === "ai_thinking") {
      const aiTurnTimeout = setTimeout(() => {
        // 1. AI Rolls
        const roll = rollDie();
        const validMoves = calculateValidMoves({
          ...gameState,
          diceRoll: roll,
          currentPlayer: "white",
        });

        if (validMoves.length === 0) {
          // AI has no moves, pass back to player
          setGameState((prev) => ({
            ...prev,
            diceRoll: roll,
            validMoves: [],
            status: "rolling",
            currentPlayer: "black",
            message: `AI rolled ${roll}. No valid moves. Your turn.`,
          }));
          return;
        }

        // 2. AI Chooses Move
        const chosenMove = chooseAIMove(validMoves, {
          ...gameState,
          diceRoll: roll,
          currentPlayer: "white",
        });

        if (!chosenMove) {
          console.error("AI had valid moves but chooseAIMove returned null");
          setGameState((prev) => ({
            // Fallback
            ...prev,
            diceRoll: roll,
            validMoves: [],
            status: "rolling",
            currentPlayer: "black",
            message: `AI rolled ${roll}. Error choosing move. Your turn.`,
          }));
          return;
        }

        // 3. AI Applies Move (This will set status to 'animating')
        const newState = applyMove(
          { ...gameState, diceRoll: roll, currentPlayer: "white" },
          chosenMove,
        );
        setGameState(newState);
      }, 1000); // Initial delay before AI starts "thinking"

      return () => clearTimeout(aiTurnTimeout);
    }

    // Handle Animation Completion
    if (
      gameState.status === "animating" &&
      gameState.animatingPieceId !== null
    ) {
      const animationDuration = 500; // milliseconds
      const animationTimeout = setTimeout(() => {
        // Use functional update for the entire transition out of animation
        setGameState((prev) => {
          // Find the piece based on the ID stored in the *previous* state (prev)
          const animatedPiece = prev.pieces.find(
            (p) => p.id === prev.animatingPieceId,
          );
          if (!animatedPiece) {
            console.error("Animated piece not found in prev state!");
            return {
              ...prev,
              status: "rolling",
              animatingPieceId: null,
              animationStartPos: null,
              animationEndPos: null,
              message: `${prev.currentPlayer === "black" ? "Black" : "White"} to roll.`,
            };
          }

          // Reconstruct the move based on the *previous* state's animation info
          const simulatedMove: Move = {
            pieceId: animatedPiece.id,
            startPosition: prev.animationStartPos!,
            endPosition: animatedPiece.position,
            isExit: animatedPiece.position === 99,
            isRosette: getCellProperties(
              animatedPiece.position,
              animatedPiece.journey ?? undefined,
            ).isRosette,
            startsReturnJourney:
              animatedPiece.journey === "return" &&
              prev.animationStartPos !== null &&
              !getPlayerOutboundPath(animatedPiece.player).includes(
                prev.animationStartPos,
              ),
            takesPieceId: undefined, // Lost info, not needed here
          };

          // Determine the next state based on the *previous* state and the simulated move
          const nextStateInfo = determineNextStateAfterMove(
            prev,
            simulatedMove,
          );
          const playerWhoMoved = prev.currentPlayer;

          // Check for Rosette Re-roll condition
          if (simulatedMove.isRosette && !nextStateInfo.winner) {
            const messagePrefix = `Landed on rosette! ${playerWhoMoved === "black" ? "You" : "AI"} roll${playerWhoMoved === "black" ? "" : "s"} again. `;
            const newRoll = rollDie();
            const newValidMoves = calculateValidMoves({
              ...prev,
              diceRoll: newRoll,
              currentPlayer: playerWhoMoved,
            });

            if (newValidMoves.length === 0) {
              // No moves on re-roll
              const nextPlayer = playerWhoMoved === "black" ? "white" : "black";
              return {
                ...prev,
                diceRoll: newRoll,
                validMoves: [],
                status:
                  prev.gameMode === "vsAI" && nextPlayer === "white"
                    ? "ai_thinking"
                    : "rolling",
                currentPlayer: nextPlayer,
                message:
                  messagePrefix +
                  `Rolled ${newRoll}. No valid moves. ${nextPlayer === "black" ? "Black" : "White"}'s turn.`,
                animatingPieceId: null,
                animationStartPos: null,
                animationEndPos: null,
              };
            } else {
              // Has moves on re-roll
              if (playerWhoMoved === "black" || prev.gameMode === "twoPlayer") {
                // Player (Black or White in twoPlayer) needs to select move
                return {
                  ...prev,
                  diceRoll: newRoll,
                  validMoves: newValidMoves,
                  status: "moving",
                  currentPlayer: playerWhoMoved, // Keep current player
                  message: messagePrefix + `Rolled ${newRoll}. Select a move.`,
                  animatingPieceId: null,
                  animationStartPos: null,
                  animationEndPos: null,
                };
              } else {
                // AI re-roll move - apply it immediately
                const aiChosenMove = chooseAIMove(newValidMoves, {
                  ...prev,
                  diceRoll: newRoll,
                  currentPlayer: "white",
                });
                if (aiChosenMove) {
                  const stateForAIReroll: GameState = {
                    ...prev,
                    diceRoll: newRoll,
                    currentPlayer: "white",
                  };
                  const newState = applyMove(stateForAIReroll, aiChosenMove); // Starts next animation
                  return {
                    ...newState,
                    message:
                      messagePrefix +
                      `AI rolled ${newRoll}. ${newState.message}`,
                  };
                } else {
                  // Error case
                  return {
                    ...prev,
                    status: "rolling",
                    currentPlayer: "black",
                    message:
                      messagePrefix +
                      `AI rolled ${newRoll}. Error choosing move. Your turn.`,
                    animatingPieceId: null,
                    animationStartPos: null,
                    animationEndPos: null,
                  };
                }
              }
            }
          } else {
            // Not a rosette re-roll, apply the determined next state
            return {
              ...prev,
              ...nextStateInfo,
              animatingPieceId: null,
              animationStartPos: null,
              animationEndPos: null,
            };
          }
        }); // End functional setGameState
      }, animationDuration);

      return () => clearTimeout(animationTimeout);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState.shouldPersistState) {
      localStorage.setItem(gameStateKey, JSON.stringify(gameState));
    }
  }, [gameState]);

  // --- Render ---
  const showGameOver =
    gameState.status === "black_wins" || gameState.status === "white_wins";

  return (
    <div className="App">
      <div className="header-controls">
        <button
          className="settings-button"
          onClick={() => setIsSettingsModalOpen(true)}
          title="Settings"
        >
          ⚙️ {/* Gear Icon */}
        </button>
      </div>

      <h1>Royal Game of Ur</h1>

      <Board
        gameState={gameState}
        onSelectMove={handleSelectMove} // Pass the memoized handler
        handleRollDice={handleRollDice}
      />

      {/* New Game Button */}
      {showGameOver && (
        <button
          onClick={() => setGameState(initializeGameState("black"))}
          style={{ marginTop: "20px" }}
        >
          New Game
        </button>
      )}

      <GameInfo
        message={gameState.message}
        status={gameState.status}
        winner={gameState.winner}
        gameMode={gameState.gameMode}
      />

      <div className="footer-controls">
        <button onClick={() => setIsRulesModalOpen(true)}>Game Rules</button>
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
        currentShouldPersistState={gameState.shouldPersistState}
        onGameStateChange={handleGameStateChange}
      />

      <PWABadge />
    </div>
  );
}

export default App;
