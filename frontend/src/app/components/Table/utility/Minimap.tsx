import React from 'react';
import minimapStyles from './component.module.css';

interface MinimapProps {
    totalRows: number;
    systemLogCurrent: number | null;
    systemLogFailed: number[];
    systemLogBatch: number[];
    systemLogSave: number[];
    onMinimapRowClick: (rowIndex: number) => void;
}

const Minimap: React.FC<MinimapProps> = ({
    totalRows,
    systemLogCurrent,
    systemLogFailed,
    systemLogBatch,
    systemLogSave,
    onMinimapRowClick,
}) => {
    if (totalRows === 0) {
        return null;
    }

    const getMinimapRowClassName = (rowIndex: number): string => {
        const taskID = rowIndex + 1;
        let statusClass = '';

        if (systemLogCurrent === taskID) {
            statusClass = minimapStyles.current;
        } else if (systemLogFailed.includes(taskID)) {
            statusClass = minimapStyles.failed;
        } else if (systemLogBatch.includes(taskID)) {
            statusClass = minimapStyles.batch;
        } else if (systemLogSave.includes(taskID)) {
            const saveIndex = systemLogSave.slice().reverse().indexOf(taskID);
            if (saveIndex === 0) statusClass = minimapStyles.savedRecent;
            else if (saveIndex === 1) statusClass = minimapStyles.savedOlder1;
            else if (saveIndex === 2) statusClass = minimapStyles.savedOlder2;
            else if (saveIndex === 3) statusClass = minimapStyles.savedOlder3;
            else if (saveIndex === 4) statusClass = minimapStyles.savedOlder4;
            else if (saveIndex > 4) statusClass = minimapStyles.savedOlder4;
        }

        return `${minimapStyles.minimapRow} ${statusClass}`;
    };

    return (
        <div className={minimapStyles.minimapContainer} title="Table Overview">
            {Array.from({ length: totalRows }).map((_, rowIndex) => (
                <div
                    key={`minimap-row-${rowIndex}`}
                    className={getMinimapRowClassName(rowIndex)}
                    onClick={() => onMinimapRowClick(rowIndex)}
                    title={`Go to row ${rowIndex + 1}`}
                />
            ))}
        </div>
    );
};

export default Minimap;