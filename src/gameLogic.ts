import { Player, Position, Journey, CellProperties, Piece, GameState, Move } from './gameTypes';

/**
 * Simulates rolling the four-sided die with specific probabilities.
 * 40% chance for 2, 20% chance for 1, 3, or 4.
 * @returns {number} The result of the die roll (1, 2, 3, or 4).
 */
export function rollDie(): number {
  const random = Math.random(); // Value between 0 and 1
  if (random < 0.2) {
    return 1;
  } else if (random < 0.6) { // 0.2 + 0.4
    return 2;
  } else if (random < 0.8) { // 0.6 + 0.2
    return 3;
  } else { // 0.8 + 0.2
    return 4;
  }
}

// Define the board paths for each player's outbound journey
const blackOutboundPath: Position[] = ['b0', 'b1', 'b2', 'b3', 4, 5, 6, 7, 8, 9, 10, 'b11', 'b12'];
const whiteOutboundPath: Position[] = ['w0', 'w1', 'w2', 'w3', 4, 5, 6, 7, 8, 9, 10,'w11', 'w12'];

// Define the return path sequence structure (relative positions)
const blackReturnPath: Position[] = [13, 'w12', 'w11', 10, 9, 8, 7, 6, 5, 4];
const whiteReturnPath: Position[] = [13, 'b12', 'b11', 10, 9, 8, 7, 6, 5, 4];

/**
 * Gets the outbound path sequence for a player.
 * @param {Player} player - The player ('black' or 'white').
 * @returns {Position[]} An array representing the sequence of positions for the outbound journey.
 */
export function getPlayerOutboundPath(player: Player): Position[] {
  return player === 'black' ? blackOutboundPath : whiteOutboundPath;
}


/**
 * Gets the properties of a specific cell on the board.
 * @param {Position} position - The position to check.
 * @param {Journey} [journey] - Optional: The journey status of the piece potentially landing here, relevant for safety checks.
 * @returns {CellProperties} An object containing the properties of the cell.
 */
export function getCellProperties(position: Position, journey?: Journey): CellProperties {
  const props: Partial<CellProperties> & { position: Position } = {
    position: position,
    isSafe: false,
    isRosette: false,
    isStackable: false,
    requiresOwner: false,
    isPrivate: false,
  };

  // Player private starting zones (safe, private)
  if (typeof position === 'string' && (position.startsWith('b') || position.startsWith('w'))) {
      const owner = position.startsWith('b') ? 'black' : 'white';
      props.player = owner;

      // b0-b3 and w0-w3 are private and safe on outbound
      if (['b0','b1','b2','b3','w0','w1','w2','w3'].includes(position)) {
          props.isPrivate = true;
          props.isSafe = true; // Safe only on outbound journey
          if (position === 'b3' || position === 'w3') {
              props.isRosette = true;
          }
      }
      // b12, b13, w12, w13 are player-side but not inherently safe or private (opponent passes through on return)
      // Safety on these depends on the piece's journey (handled in move logic)
  }

  // Shared track properties
  switch (position) {
    case 'w1':
    case 'b1':
      props.isStackable = true;
      break;
    case 'w3': // Private Rosette
    case 'b3':
      props.isRosette = true;
      break;
    case 4: // Safe *only* if piece is on return journey
      if (journey === 'return') {
          props.isSafe = true;
      }
      break;
    case 6: // Stackable & Safe
      props.isStackable = true;
      props.isSafe = true; // Cannot be taken from stackable
      break;
    case 7: // Shared Rosette
      props.isRosette = true;
      break;
    case 9: // Stackable & Safe
        props.isStackable = true;
        props.isSafe = true; // Cannot be taken from stackable
        break;
    case 10: // Stackable (owner-specific) & Safe
      props.isStackable = true;
      props.requiresOwner = true;
      props.isSafe = true; // Cannot be taken from stackable
      break;
    case 'w11': // Shared Rosette (start of return path)
    case 'b11': // Shared Rosette (start of return path)
        props.isRosette = true;
        // Not inherently safe
        break;
  }

  return props as CellProperties;
}

/**
 * Finds the piece at a given position (top piece if stacked).
 * Excludes the piece currently being moved if its ID is provided.
 * @param position The position to check.
 * @param gameState The current game state.
 * @param movingPieceId Optional ID of the piece being moved (to exclude it from checks).
 * @returns The Piece at the position, or null if empty or only contains the moving piece.
 */
export function getPieceAtPosition(
    position: Position,
    gameState: Pick<GameState, 'pieces' | 'stacks'>,
    movingPieceId?: number
): Piece | null {
    // Check stacks first
    const stack = gameState.stacks[position];
    if (stack && stack.pieces.length > 0) {
        // Find the top piece that isn't the one currently moving
        for (let i = stack.pieces.length - 1; i >= 0; i--) {
            if (stack.pieces[i].id !== movingPieceId) {
                return stack.pieces[i]; // Return the top non-moving piece
            }
        }
        // If only the moving piece is in the stack, treat as empty for landing purposes
        if (stack.pieces.length === 1 && stack.pieces[0].id === movingPieceId) {
            return null;
        }
         // If stack has pieces but top one is movingPieceId, return the one below if exists
         if (stack.pieces.length > 1 && stack.pieces[stack.pieces.length - 1].id === movingPieceId) {
            return stack.pieces[stack.pieces.length - 2];
         }
         // Otherwise return top piece
         return stack.pieces[stack.pieces.length - 1];

    }

    // Check non-stacked pieces, excluding the moving piece
    return gameState.pieces.find(p => p.position === position && p.id !== movingPieceId && !gameState.stacks[p.position]) || null;
}


/**
 * Calculates the next position based on the current position, roll, and player path.
 * Handles transitions between outbound and return paths correctly.
 * @param currentPosition The starting position.
 * @param roll The dice roll (1-4).
 * @param player The current player.
 * @param journey The current journey ('outbound', 'return', or null for start).
 * @returns {{ nextPosition: Position | 99, startsReturn: boolean }} The calculated next position,
 *          99 if exiting. `startsReturn` is true if the move crosses the threshold into the return path.
 */
export function calculateNextPosition(
    currentPosition: Position,
    roll: number,
    player: Player,
    journey: Journey
): { nextPosition: Position | 99; startsReturn: boolean } {

    if (journey === 'return') {
        const returnPath = player === 'black' ? blackReturnPath : whiteReturnPath; // Gets the specific path like [14, w13, w12, 11, ...]
        const currentIndex = returnPath.indexOf(currentPosition);

        if (currentIndex === -1) {
             console.error("Piece on return journey not found in its return path:", currentPosition, player);
             return { nextPosition: currentPosition, startsReturn: false }; // Stay put (invalid state)
        }

        const nextIndex = currentIndex + roll;

        if (nextIndex >= returnPath.length) {
            // Trying to move off the end (past position 5)
            const squaresToExit = returnPath.length - currentIndex;
            if (roll === squaresToExit) {
                return { nextPosition: 99, startsReturn: false }; // Exact roll to exit
            } else {
                // Overshot, invalid move for exit
                return { nextPosition: currentPosition, startsReturn: false }; // Stay put (move logic will filter)
            }
        } else {
            // Move along return path
            return { nextPosition: returnPath[nextIndex], startsReturn: false };
        }

    } else { // Outbound or starting from -1
        const path = getPlayerOutboundPath(player); // e.g., ['b0', ..., 'b13']
        let currentIndex = -1;

        if (currentPosition === -1) {
            currentIndex = -1; // Starting off board
        } else {
            // Find piece on its outbound path (includes private start, shared, and player-side end)
            currentIndex = path.indexOf(currentPosition);
        }

        // If not found on specific outbound path, it might be on the shared part
        // (This check might be redundant if path includes shared, but safe to have)
        if (currentIndex === -1 && currentPosition !== -1 && typeof currentPosition === 'number' && currentPosition >= 4 && currentPosition <= 11) {
             currentIndex = path.indexOf(currentPosition); // Find on the path array
        }

        if (currentIndex === -1 && currentPosition !== -1) {
             console.error("Piece not found on expected outbound path:", currentPosition, player);
             return { nextPosition: currentPosition, startsReturn: false }; // Defensive
        }

        const nextIndex = currentIndex + roll;
        const endOfOutboundIndex = path.length - 1; // Index of b13 or w13

        if (nextIndex > endOfOutboundIndex) {
            // Moved past the player's side square (e.g., b13), transition to return
            const stepsPast = nextIndex - endOfOutboundIndex; // How many steps onto/past 14
            const returnPath = player === 'black' ? blackReturnPath : whiteReturnPath; // Get the return path starting with 14

            if (stepsPast > returnPath.length) {
                 // This should be impossible with roll max 4
                 console.error("Calculated steps into return path exceed its length");
                 return { nextPosition: currentPosition, startsReturn: false };
            }

            // Land on the return path square, index is stepsPast - 1 (since index 0 is 1 step past)
            const returnPathIndex = stepsPast - 1;
            return { nextPosition: returnPath[returnPathIndex], startsReturn: true };

        } else {
            // Still on outbound or player-specific path
            return { nextPosition: path[nextIndex], startsReturn: false };
        }
    }
}

/**
 * Initializes the game state.
 * @param startingPlayer The player who starts the game.
 * @param numPieces The number of pieces per player (typically 7).
 * @returns {GameState} The initial state of the game.
 */
export function initializeGameState(startingPlayer: Player = 'black', numPieces: number = 7): GameState {
    const pieces: Piece[] = [];
    for (let i = 0; i < numPieces; i++) {
        pieces.push({ id: i, player: 'black', position: -1, journey: null });
        // Use higher IDs for white to ensure uniqueness
        pieces.push({ id: i + numPieces, player: 'white', position: -1, journey: null });
    }

    return {
        pieces: pieces,
        stacks: {},
        currentPlayer: startingPlayer,
        diceRoll: null,
        validMoves: [],
        status: 'rolling', // Start by needing a roll
        winner: null,
        message: `${startingPlayer === 'black' ? 'Black' : 'White'} to roll.`,

        // Animation state
        animatingPieceId: null,
        animationStartPos: null,
        animationEndPos: null,
    };
}

/**
 * Calculates all valid moves for the current player given the dice roll.
 * @param gameState The current state of the game.
 * @returns {Move[]} An array of valid moves.
 */
export function calculateValidMoves(gameState: GameState): Move[] {
    const { currentPlayer, diceRoll, pieces, stacks } = gameState;
    const validMoves: Move[] = [];

    if (!diceRoll || diceRoll < 1 || diceRoll > 4) {
        console.error("Invalid dice roll for calculating moves:", diceRoll);
        return []; // Cannot move without a valid roll
    }

    // Identify pieces the current player *could* potentially move
    const movablePieces = pieces.filter(p => {
        if (p.player !== currentPlayer) return false; // Not the other player's piece
        if (p.position === 99) return false; // Already finished

        // Check if piece is blocked in a stack
        const stack = stacks[p.position];
        if (stack && stack.pieces.length > 0) {
            // Only the top piece of a stack can move
            const topPiece = stack.pieces[stack.pieces.length - 1];
            if (p.id !== topPiece.id) {
                return false; // Piece is buried in a stack
            }
        }
        return true; // Piece is movable
    });

    for (const piece of movablePieces) {
        const { nextPosition, startsReturn } = calculateNextPosition(
            piece.position,
            diceRoll,
            currentPlayer,
            piece.journey
        );

        // If calculateNextPosition returned the same position, it means it was an invalid move
        // (e.g., overshooting exit), so skip this piece.
        if (nextPosition === piece.position) {
            continue;
        }

        // --- Check Validity of Landing on nextPosition ---

        // 1. Check Exit Condition
        if (nextPosition === 99) {
            // Valid exit move (exact roll was checked in calculateNextPosition)
            validMoves.push({
                pieceId: piece.id,
                startPosition: piece.position,
                endPosition: nextPosition,
                isExit: true,
                isRosette: false,
                startsReturnJourney: false, // Already on return or exiting
            });
            continue; // No further checks needed for an exit move
        }

        // 2. Get Properties of the target cell
        // Pass the potential *new* journey status to getCellProperties for accurate safety checks
        const targetJourney = startsReturn ? 'return' : piece.journey ?? 'outbound'; // If starting return, use 'return', else keep current or assume 'outbound' if starting
        const targetCellProps = getCellProperties(nextPosition, targetJourney);

        // 3. Check Landing on Opponent's Private Start Zone (b0-3 or w0-3) - Always illegal
        if (targetCellProps.isPrivate && targetCellProps.player !== currentPlayer) {
            continue; // Cannot land on opponent's private starting squares
        }

        // 4. Check Occupancy and Stacking
        const pieceAtTarget = getPieceAtPosition(nextPosition, gameState, piece.id); // Find piece, excluding the one moving

        if (targetCellProps.isStackable) {
            const stack = stacks[nextPosition] ?? { pieces: [], owner: null };
            const currentStackSize = stack.pieces.filter(p => p.id !== piece.id).length; // Count pieces already there (excluding the moving one if it started there)

            // Check stack limit
            if (currentStackSize >= 4) {
                continue; // Stack is full
            }

            // Check owner requirement for cell 11
            if (targetCellProps.requiresOwner) {
                if (stack.owner && stack.owner !== currentPlayer) {
                    continue; // Cannot land on stack owned by opponent
                }
                // If stack is empty or owned by current player, it's okay
            }

            // Landing on a stackable cell is safe (no taking)
            validMoves.push({
                pieceId: piece.id,
                startPosition: piece.position,
                endPosition: nextPosition,
                isExit: false,
                isRosette: targetCellProps.isRosette,
                startsReturnJourney: startsReturn,
            });

        } else { // Not a stackable cell
            if (pieceAtTarget) {
                // Target cell is occupied by a single piece
                if (pieceAtTarget.player === currentPlayer) {
                    continue; // Cannot land on own piece on a non-stackable square
                } else {
                    // Occupied by opponent piece. Check if taking is allowed.
                    if (targetCellProps.isSafe) {
                        continue; // Cannot take a piece from a safe square
                    }
                    // Check if journeys match for taking
                    // Note: A piece starting its return journey *can* take an opponent already on return
                    const opponentJourney = pieceAtTarget.journey;
                    if (targetJourney !== opponentJourney) {
                         // Allow taking if moving piece is starting return and opponent is already on return
                         if (!(startsReturn && opponentJourney === 'return')) {
                            continue; // Journeys must match for taking, unless starting return vs return
                         }
                    }


                    // Valid take!
                    validMoves.push({
                        pieceId: piece.id,
                        startPosition: piece.position,
                        endPosition: nextPosition,
                        takesPieceId: pieceAtTarget.id, // Mark the piece being taken
                        isExit: false,
                        isRosette: targetCellProps.isRosette,
                        startsReturnJourney: startsReturn,
                    });
                }
            } else {
                // Target cell is empty and not stackable - valid move
                validMoves.push({
                    pieceId: piece.id,
                    startPosition: piece.position,
                    endPosition: nextPosition,
                    isExit: false,
                    isRosette: targetCellProps.isRosette,
                    startsReturnJourney: startsReturn,
                });
            }
        }
    } // End loop through movable pieces

    return validMoves;
}

/**
 * Applies a chosen move to the game state and returns the new state.
 * @param gameState The current state of the game.
 * @param move The valid move to apply.
 * @returns {GameState} The new game state after the move.
 */
export function applyMove(gameState: GameState, move: Move): GameState {
    const { pieces, stacks: currentStacks, currentPlayer } = gameState;

    // Deep clone pieces and stacks to avoid modifying the original state directly
    const nextPieces = pieces.map(p => ({ ...p }));
    const nextStacks: GameState['stacks'] = {};
    for (const pos in currentStacks) {
        const stack = currentStacks[pos as Position];
        if (stack) {
            nextStacks[pos as Position] = {
                ...stack,
                pieces: stack.pieces.map(p => ({ ...p })), // Clone pieces within stacks too
            };
        }
    }

    const movingPiece = nextPieces.find(p => p.id === move.pieceId);
    if (!movingPiece) {
        console.error("Moving piece not found!", move.pieceId);
        return gameState; // Should not happen with valid moves
    }

    // Animation details (captured *before* updating piece position)
    const animatingPieceId = move.pieceId;
    const animationStartPos = movingPiece.position;
    const animationEndPos = move.endPosition;


    const originalPosition = movingPiece.position;
    const targetPosition = move.endPosition;

    // --- 1. Handle Piece Leaving its Original Square ---
    const startStack = nextStacks[originalPosition];
    if (startStack) {
        // Remove piece from the original stack
        startStack.pieces = startStack.pieces.filter(p => p.id !== movingPiece.id);
        // If stack becomes empty, clear its owner (relevant for cell 11)
        if (startStack.pieces.length === 0) {
            startStack.owner = null;
        }
    }

    // --- 2. Handle Taken Piece (if any) ---
    if (move.takesPieceId !== undefined) {
        const takenPiece = nextPieces.find(p => p.id === move.takesPieceId);
        if (takenPiece) {
            // Reset taken piece to start
            takenPiece.position = -1;
            takenPiece.journey = null;
            // Note: If the taken piece was in a stack, it's already handled by finding it in `nextPieces`
        }
    }

    // --- 3. Update Moving Piece ---
    movingPiece.position = targetPosition;
    if (move.startsReturnJourney) {
        movingPiece.journey = 'return';
    } else if (movingPiece.journey === null && targetPosition !== -1 && targetPosition !== 99) {
         // If piece was at start (-1) and moved onto the board, set journey to outbound
         movingPiece.journey = 'outbound';
    }
    // If move is an exit, position becomes 99
    if (move.isExit) {
        movingPiece.position = 99;
        movingPiece.journey = null; // No longer on a journey
    }

    // --- 4. Handle Landing on Target Square ---
    if (targetPosition !== 99) { // Don't update stacks if piece exited
        const targetCellProps = getCellProperties(targetPosition, movingPiece.journey ?? undefined); // Use updated journey

        if (targetCellProps.isStackable) {
            // Add piece to the target stack
            const targetStack = nextStacks[targetPosition] ?? { pieces: [], owner: null };
            targetStack.pieces.push(movingPiece); // Add the piece itself

            // Update owner for cell 11 if needed
            if (targetCellProps.requiresOwner && !targetStack.owner) {
                targetStack.owner = currentPlayer;
            }
            nextStacks[targetPosition] = targetStack; // Ensure stack is in the map

        }
        // If not stackable, the moving piece just occupies the square (already updated position)
        // Any taken piece was handled in step 2.
    }


    // --- 5. Construct Final State ---
    // Filter out pieces that are now inside stacks from the main pieces array
    const finalPieces = nextPieces.filter(p => !nextStacks[p.position]?.pieces.some(sp => sp.id === p.id));
    // Add pieces from stacks back into the main array for completeness (though UI might primarily use stacks for rendering)
    Object.values(nextStacks).forEach(stack => {
        if (stack) finalPieces.push(...stack.pieces);
    });


    return {
        ...gameState, // Carry over non-changing parts like numPieces
        pieces: nextPieces, // Use the updated pieces array
        stacks: nextStacks,
        // currentPlayer and message will be updated after animation
        diceRoll: null, // Reset dice roll after move
        validMoves: [], // Clear valid moves until next roll
        status: 'animating', // Set status to animating
        winner: null, // Winner determined after animation
        message: "Animating move...", // Set a temporary message

        // Animation state
        animatingPieceId: animatingPieceId,
        animationStartPos: animationStartPos,
        animationEndPos: animationEndPos,
    };
}

// Helper function to determine the next status and player after a move (used after animation)
export function determineNextStateAfterMove(gameState: GameState, move: Move): Pick<GameState, 'status' | 'currentPlayer' | 'winner' | 'message'> {
     const { currentPlayer } = gameState;
     let nextStatus: GameState['status'] = 'rolling';
     let nextPlayer = currentPlayer;
     let message = "";

     // Check for win condition first
     const playerPieces = gameState.pieces.filter(p => p.player === currentPlayer);
     const allExited = playerPieces.every(p => p.position === 99);
     if (allExited) {
         nextStatus = currentPlayer === 'black' ? 'player_wins' : 'ai_wins';
         message = `${currentPlayer === 'black' ? 'Black' : 'White'} wins!`;
         nextPlayer = currentPlayer; // Keep current player on win
     } else if (move.isRosette) {
         message = `Landed on a rosette! Roll again.`;
         nextStatus = 'rolling';
         nextPlayer = currentPlayer; // Same player rolls again
     } else {
         // Normal move, switch player
         nextStatus = 'rolling';
         nextPlayer = currentPlayer === 'black' ? 'white' : 'black';
         message = `${nextPlayer === 'black' ? 'Black' : 'White'} to roll.`;
     }

     // If the next player is AI, change status
     if (nextPlayer === 'white' && nextStatus === 'rolling') {
         nextStatus = 'ai_thinking';
         message = "AI is thinking...";
     }

     return {
         status: nextStatus,
         currentPlayer: nextPlayer,
         winner: nextStatus === 'player_wins' ? 'black' : nextStatus === 'ai_wins' ? 'white' : null,
         message: message,
     };
}
