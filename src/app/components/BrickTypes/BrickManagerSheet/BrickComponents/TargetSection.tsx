import styles from '../component.module.css';

const renderValue = (value: string | number | File | null): React.ReactNode => {
    if (value instanceof File) {
        return value.name;
    }
    return value !== null && value !== undefined ? value.toString() : "default";
};

const TargetSection: React.FC<{
    targetValue: string | number | File | null;
    targets: string[];
    onAddTarget: () => void;
    onDeleteTarget: (index: number) => void;
    onChangeTarget: (index: number, value: string) => void;
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ targetValue, targets, onAddTarget, onDeleteTarget, onChangeTarget, handleFileUpload }) => (
    <div className={styles.sheets}>
        <div className={styles.sheetsHeader}>
            <h3>Target(s)</h3>
            <hr className={styles.section} />
            <h4>Initial Value:
                <span>
                    {renderValue(targetValue) || (
                        <text className={styles.noAssignment}>
                            No Value Assigned
                        </text>
                    )}
                </span>
            </h4>
            <div className={styles.variableActions}>
                <button className={styles.button} onClick={onAddTarget}>
                    Add Target
                </button>
                <label htmlFor="target-excel-upload" className={styles.button}>
                    Add Sheet
                    <input
                        id="target-excel-upload"
                        type="file"
                        accept=".xls,.xlsx,.csv"
                        onChange={handleFileUpload}
                    />
                </label>
            </div>
        </div>
        {targets.map((target, index) => (
            <div key={`target-${index}`} className={styles.inputContainer}>
                <input
                    type="text"
                    value={target}
                    onChange={(e) => onChangeTarget(index, e.target.value)}
                    className={styles.singleInput}
                />
                <button className={styles.button} onClick={() => onDeleteTarget(index)}>
                    ✖
                </button>
            </div>
        ))}
    </div>
);
export default TargetSection;
