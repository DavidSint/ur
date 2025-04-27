/**
 * Represents the players in the game.
 */
export type Player = 'black' | 'white';

/**
 * Represents the journey direction of a piece.
 * null indicates the piece is off-board at the start.
 */
export type Journey = 'outbound' | 'return' | null;

/**
 * Represents a position on the board or off-board.
 * -1: Off-board (start)
 * 0-3: Player's private starting squares (e.g., b0, w0)
 * 4-11: Shared central track
 * 12-13: Player-side's squares before return (e.g., b12, w12)
 * 14: Shared square, marks the start of the return path visually.
 * 99: Off-board (finished)
 *
 * Note: The return path logically follows 14 -> opponent's 13 -> opponents 12 -> 11 -> 10 -> 9 -> 8 -> 7 -> 6 -> 5 -> Exit(99)
 *
 * Using strings for clarity, especially for player-specific zones.
 * 'b' prefix for black's private squares, 'w' for white's.
 * Shared squares are just numbers (4-11).
 */
export type Position =
  | -1 // Start
  | `b${0 | 1 | 2 | 3}` // Black's private squares
  | `w${0 | 1 | 2 | 3}` // White's private squares
  | `b${11 | 12}` // Black's side squares
  | `w${11 | 12}` // Black's side squares
  | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 13 // Shared track (including 13)
  | 99; // Finish

/**
 * Represents a single game piece.
 */
export interface Piece {
  id: number; // Unique identifier for the piece (e.g., 0-6 for each player)
  player: Player;
  position: Position;
  journey: Journey; // Tracks if the piece is outbound or return
}

/**
 * Represents information about a stackable cell.
 */
export interface StackInfo {
  pieces: Piece[]; // Pieces currently on the stack
  owner: Player | null; // For cell 11, which player owns the stack
}

/**
 * Represents a potential move a player can make.
 */
export interface Move {
  pieceId: number;
  startPosition: Position;
  endPosition: Position;
  takesPieceId?: number; // ID of the piece taken, if any
  isRosette: boolean; // Did the move land on a rosette?
  isExit: boolean; // Did the piece exit the board?
  startsReturnJourney: boolean; // Did the piece transition to the return journey?
}

/**
 * Represents the overall state of the game at any point.
 */
export interface GameState {
  pieces: Piece[]; // All pieces for both players
  // Using a Record to map stackable positions to their stack info
  stacks: Partial<Record<Position, StackInfo>>;
  currentPlayer: Player;
  diceRoll: number | null; // Current dice roll (1-4)
  validMoves: Move[]; // List of legal moves for the current player and dice roll
  status: 'rolling' | 'moving' | 'ai_thinking' | 'game_over' | 'player_wins' | 'ai_wins' | 'animating'; // Added 'animating' status
  winner: Player | null;
  message: string; // Feedback message for the user (e.g., "Roll again!", "Invalid move")

  // Animation state
  animatingPieceId: number | null;
  animationStartPos: Position | null;
  animationEndPos: Position | null;
}

/**
 * Properties of a specific cell on the board.
 */
export interface CellProperties {
  position: Position;
  isSafe: boolean; // Cannot be taken from here
  isRosette: boolean; // Roll again if landing here
  isStackable: boolean; // Can multiple pieces occupy?
  requiresOwner: boolean; // For cell 11, needs owner match
  isPrivate: boolean; // Belongs to one player only (start/end zones)
  player?: Player; // Which player owns the private cell
}
