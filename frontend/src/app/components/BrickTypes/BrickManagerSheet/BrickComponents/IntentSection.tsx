import styles from '../component.module.css';

const renderValue = (value: string | number | File | null): React.ReactNode => {
    if (value instanceof File) {
        return value.name;
    }
    return value !== null && value !== undefined ? value.toString() : "default";
};

const IntentSection: React.FC<{
  intentValue: string | number | File | null;
  intents: string[];
  onAddIntent?: () => void;
  onDeleteIntent: (index: number) => void;
  onChangeIntent: (index: number, value: string) => void;
  showAddIntent?: boolean;
}> = ({ intentValue, intents, onAddIntent, onDeleteIntent, onChangeIntent, showAddIntent = true }) => (
  <div className={styles.sheets}>
    <div className={styles.sheetsHeader}>
      <h3>Intent(s)</h3>
      <hr className={styles.section} />
      <h4>
        Initial Value:
        <span>
          {renderValue(intentValue) || (
            <text className={styles.noAssignment}>
              No Value Assigned
            </text>
          )}
        </span>
      </h4>
      {showAddIntent && (
        <div className={styles.variableActions}>
          <button className={styles.button} onClick={onAddIntent}>
            Add Intent
          </button>
        </div>
      )}
    </div>
    {intents.map((intent, index) => (
      <div key={`intent-${index}`} className={styles.inputContainer}>
        <input
          type="text"
          value={intent}
          onChange={(e) => onChangeIntent(index, e.target.value)}
          className={styles.singleInput}
        />
        <button className={styles.button} onClick={() => onDeleteIntent(index)}>
          ✖
        </button>
      </div>
    ))}
  </div>
);
export default IntentSection;