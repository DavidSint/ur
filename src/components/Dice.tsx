import React from 'react';

interface DiceProps {
    diceRoll: number | null;
    onRollDice: () => void;
    disabled: boolean;
}

const Dice: React.FC<DiceProps> = ({ diceRoll, onRollDice, disabled }) => {
    // TODO: Implement better dice visualization (e.g., graphical dice)
    return (
        <div className="dice-area" style={{ margin: '15px 0' }}>
            <button onClick={onRollDice} disabled={disabled} className="roll-button">
                {disabled ? 'Waiting...' : 'Roll Dice'}
            </button>
            {diceRoll !== null && (
                <span className="dice-result" style={{ marginLeft: '15px', fontSize: '1.5em', fontWeight: 'bold' }}>
                    Rolled: {diceRoll}
                </span>
            )}
        </div>
    );
};

export default Dice;
