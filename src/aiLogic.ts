import { Move, GameState } from './gameTypes';
import { getCellProperties, getPlayerOutboundPath } from './gameLogic'; // Need paths for distance calculation

/**
 * Evaluates a move based on a simple heuristic scoring system.
 * Higher scores are better.
 * @param move The move to evaluate.
 * @param gameState The current game state (needed for context like piece positions).
 * @returns {number} The score of the move.
 */
function scoreMove(move: Move, gameState: GameState): number {
    let score = 0;
    const { pieces } = gameState;
    const movingPiece = pieces.find(p => p.id === move.pieceId);

    if (!movingPiece) return -Infinity; // Should not happen

    // 1. Prioritize exiting (+1000)
    if (move.isExit) {
        score += 1000;
        return score; // Exit is always the best option if possible
    }

    const targetPosition = move.endPosition;
    const targetCellProps = getCellProperties(targetPosition, move.startsReturnJourney ? 'return' : movingPiece.journey ?? 'outbound');

    // 2. Prioritize landing on a rosette (+100)
    if (targetCellProps.isRosette) {
        score += 100;
    }

    // 3. Prioritize taking an opponent's piece (+75)
    if (move.takesPieceId !== undefined) {
        score += 75;
    }

    // 4. Prioritize landing on a safe square (+50)
    // Especially cell 5 on return, but any safe square is good.
    if (targetCellProps.isSafe) {
        score += 50;
    }
    // Add extra points for landing on the crucial return safe square (5)
    if (targetPosition === 5 && (move.startsReturnJourney || movingPiece.journey === 'return')) {
        score += 25; // Extra bonus for hitting the return safe spot
    }

    // 5. Prioritize moving pieces further along the path (+ distance)
    // Calculate distance along the combined path.
    const player = movingPiece.player;
    const outboundPath = getPlayerOutboundPath(player);
    const returnPath = player === 'black' ? // Use the correct return path constant
        [14, 'w13', 'w12', 11, 10, 9, 8, 7, 6, 5] :
        [14, 'b13', 'b12', 11, 10, 9, 8, 7, 6, 5];

    let startDistance = 0;
    let endDistance = 0;

    const startIndexOut = outboundPath.indexOf(move.startPosition);
    const endIndexOut = outboundPath.indexOf(targetPosition);
    const startIndexRet = returnPath.indexOf(move.startPosition);
    const endIndexRet = returnPath.indexOf(targetPosition);

    if (movingPiece.journey === 'outbound' || movingPiece.journey === null) {
        startDistance = startIndexOut >= 0 ? startIndexOut : -1; // Start distance on outbound
        if (move.startsReturnJourney) {
            // Moving from outbound to return
            endDistance = outboundPath.length + endIndexRet; // Position on return path
        } else {
            // Moving along outbound
            endDistance = endIndexOut >= 0 ? endIndexOut : -1;
        }
    } else { // journey === 'return'
        startDistance = outboundPath.length + startIndexRet; // Position on return path
        endDistance = outboundPath.length + endIndexRet; // Moving along return path
    }

    // Add progress score (ensure endDistance is valid)
    if (endDistance > startDistance && endDistance >= 0) {
        score += (endDistance - startDistance) * 5; // Add points for squares moved forward
        score += endDistance; // Add points for how far along the piece is overall
    }


    // 6. Prioritize getting pieces onto the board (+10 if moving from -1)
    if (move.startPosition === -1) {
        score += 10;
    }

    // Simple avoidance: Penalize landing on non-safe, non-rosette shared squares (4, 7, 9, 14) if opponent could potentially take next turn?
    // This is complex, skipping for this simple AI version.

    return score;
}


/**
 * Chooses the best move for the AI based on the provided valid moves and game state.
 * Uses a simple heuristic scoring approach.
 * @param validMoves An array of legal moves for the AI.
 * @param gameState The current state of the game.
 * @returns {Move | null} The chosen move, or null if no valid moves exist.
 */
export function chooseAIMove(validMoves: Move[], gameState: GameState): Move | null {
    if (!validMoves || validMoves.length === 0) {
        return null; // No moves available
    }

    if (validMoves.length === 1) {
        return validMoves[0]; // Only one choice
    }

    // Score each move
    const scoredMoves = validMoves.map(move => ({
        move: move,
        score: scoreMove(move, gameState),
    }));

    // Find the maximum score
    const maxScore = Math.max(...scoredMoves.map(sm => sm.score));

    // Get all moves with the maximum score
    const bestMoves = scoredMoves.filter(sm => sm.score === maxScore);

    // If multiple moves have the same best score, choose one randomly
    const randomIndex = Math.floor(Math.random() * bestMoves.length);
    return bestMoves[randomIndex].move;
}
