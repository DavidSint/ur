import React from 'react';

interface DiceProps {
    diceRoll: number | null;
    onRollDice: () => void;
    disabled: boolean;
}

// Simple component for a single die visual
const DieVisual: React.FC<{ index: number, marked: boolean }> = ({ marked, index }) => {
    // A filled circle for marked, empty for unmarked.
    return (
        <span className={`die-visual ${marked ? 'marked' : 'unmarked'} ${index % 2 === 1 ? 'odd' : 'even'}`}>
            {marked ? '●' : '○'}
        </span>
    );
};


const Dice: React.FC<DiceProps> = ({ diceRoll, onRollDice, disabled }) => {
    return (
        <div className="dice-area">
            <button onClick={onRollDice} disabled={disabled} className="roll-button">
                {disabled ? 'Waiting...' : 'Roll Dice'}
            </button>
            <div className="dice-visuals-container">
                {diceRoll !== null ? (
                    // Display first 2 dice, marking based on the roll
                    Array.from({ length: 2 }).map((_, index) => (
                        <DieVisual key={index} index={index} marked={index < diceRoll} />
                    ))
                ) : (
                    // Show placeholder or empty state before first roll
                    Array.from({ length: 2 }).map((_, index) => (
                         <DieVisual key={index} index={index} marked={false} /> // Show all unmarked initially
                    ))
                )}
            </div>
            <div className="dice-visuals-container">
                {diceRoll !== null ? (
                    // Display last 2 dice, marking based on the roll
                    Array.from({ length: 2 }).map((_, index) => (
                        <DieVisual key={index} index={index} marked={2 + index < diceRoll} />
                    ))
                ) : (
                    // Show placeholder or empty state before first roll
                    Array.from({ length: 2 }).map((_, index) => (
                         <DieVisual key={index} index={index} marked={false} /> // Show all unmarked initially
                    ))
                )}
            </div>
        </div>
    );
};

export default Dice;
