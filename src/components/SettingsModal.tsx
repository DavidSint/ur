import React, { useEffect, useRef } from "react";
import { GameState } from "../gameTypes";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGameMode: GameState["gameMode"];
  onGameModeChange: (newMode: GameState["gameMode"]) => void;
  currentShouldPersistState: GameState["shouldPersistState"];
  onGameStateChange: (shouldSaveState: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentGameMode,
  onGameModeChange,
  currentShouldPersistState,
  onGameStateChange,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Effect to sync dialog visibility with isOpen prop
  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;
    if (isOpen && !dialogElement.open) {
      dialogElement.showModal();
    } else if (!isOpen && dialogElement.open) {
      dialogElement.close();
    }
  }, [isOpen]);

  // Handle closing via Escape key or backdrop click
  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (event.target === dialogElement) onClose();
    };
    dialogElement.addEventListener("close", onClose);
    dialogElement.addEventListener("cancel", handleCancel);
    dialogElement.addEventListener("click", handleClickOutside);
    return () => {
      dialogElement.removeEventListener("close", onClose);
      dialogElement.removeEventListener("cancel", handleCancel);
      dialogElement.removeEventListener("click", handleClickOutside);
    };
  }, [onClose]);

  const handleModeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    onGameModeChange(event.target.checked ? "twoPlayer" : "vsAI");
  };
  const handleStateToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    onGameStateChange(event.target.checked);
  };

  return (
    <dialog ref={dialogRef} className="settings-modal">
      <h2>Settings</h2>
      <div className="setting-item">
        <label htmlFor="gameModeToggle">Game Mode:</label>
        <div className="toggle-switch">
          <span>AI</span>
          <input
            type="checkbox"
            id="gameModeToggle"
            checked={currentGameMode === "twoPlayer"}
            onChange={handleModeToggle}
          />
          <label htmlFor="gameModeToggle" className="slider"></label>
          <span>Two Player</span>
        </div>
      </div>
      <div className="setting-item">
        <label htmlFor="SaveStateToggle">Save State:</label>
        <div className="toggle-switch">
          <span>No</span>
          <input
            type="checkbox"
            id="SaveStateToggle"
            checked={currentShouldPersistState === true}
            onChange={handleStateToggle}
          />
          <label htmlFor="SaveStateToggle" className="slider"></label>
          <span>Yes</span>
        </div>
      </div>
      <div className="setting-item">
        <button onClick={() => onGameModeChange(currentGameMode)}>
          Restart Game
        </button>
      </div>
      <div className="setting-item">
        <button onClick={onClose} autoFocus>
          Close
        </button>
      </div>
    </dialog>
  );
};

export default SettingsModal;
