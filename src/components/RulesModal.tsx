import React, { useEffect, useRef } from "react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    if (isOpen) {
      if (!dialogElement.open) {
        dialogElement.showModal();
      }
    } else {
      if (dialogElement.open) {
        dialogElement.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialogElement.addEventListener("close", onClose);
    dialogElement.addEventListener("cancel", handleCancel);

    const handleClickOutside = (event: MouseEvent) => {
      if (dialogElement && event.target === dialogElement) {
        onClose();
      }
    };
    dialogElement.addEventListener("click", handleClickOutside);

    return () => {
      dialogElement.removeEventListener("close", onClose);
      dialogElement.removeEventListener("cancel", handleCancel);
      dialogElement.removeEventListener("click", handleClickOutside);
    };
  }, [onClose]);

  return (
    <dialog ref={dialogRef} className="rules-modal">
      <h2>The Royal Game of Ur - Rules</h2>
      <ol>
        <li>
          <b>Objective:</b> Be the first player to move all 7 of your pieces off
          the board.
        </li>
        <li>
          <b>Players:</b> You play as Black against the White AI opponent.
        </li>
        <li>
          <b>Dice:</b> A 4-sided die is rolled each turn (virtually).
        </li>
        <li>
          <b>Movement:</b>
          <ol>
            <li>Click "Roll Dice".</li>
            <li>
              Click a highlighted piece (⚫) to move it the rolled number of
              squares along its path.
            </li>
            <li>Pieces start off-board.</li>
            <li>
              Path: Your pieces follow the bottom row (outbound), then the
              middle row, then your side squares, then the return path (middle
              row backwards). The journey ends on the way back at the end of the
              middle row.
            </li>
          </ol>
        </li>
        <li>
          <b>Rosettes:</b> Landing exactly on a rosette square (coloured red)
          grants an immediate extra roll.
        </li>
        <li>
          <b>Taking Pieces:</b> Landing exactly on a square occupied by a single
          opponent piece sends it back to the start. This cannot happen on safe
          squares or stackable squares. Pieces must be going in the same
          direction (outbound/return) to take each other.
        </li>
        <li>
          <b>Stackable Squares:</b> Squares with the concentric square markings
          can hold multiple pieces (up to 4) and are safe. Only the top piece
          can move from this square meaning you can trap the opponent under you!
        </li>
        <li>
          <b>Private Stackable Square:</b> The square with the concentric dotted
          circles is like other stackable squares, but only the player who
          occupies it first can add more pieces to it. Once no one is on this
          square, then it is open to be occupied again by the next player that
          lands on it first.
        </li>
        <li>
          <b>Return Safe Square:</b> The square with the green corners is safe
          *only* for pieces on their return journey.
        </li>
        <li>
          <b>Exiting:</b> Pieces exit after passing the final square (the Return
          Safe Square) on the return journey. You must roll the exact number
          needed to land *exactly* off the board. E.g., from the Return Safe
          Square, you need a roll of 1 to exit.
        </li>
      </ol>
      <a role="button" onClick={onClose} autoFocus>
        Close
      </a>
    </dialog>
  );
};

export default RulesModal;
