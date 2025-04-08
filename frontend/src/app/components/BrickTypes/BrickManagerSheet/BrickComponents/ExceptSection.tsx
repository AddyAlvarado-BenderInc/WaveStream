import styles from '../component.module.css';

const ExceptSection: React.FC<{ value: string; onAddParameter: () => void }> = ({
  value,
  onAddParameter,
}) => (
  <div className={styles.sheets}>
    <div className={styles.sheetsHeader}>
      <h3>Except</h3>
      <hr className={styles.section} />
      <h4>
        Distinct Value:
        <span>{value ||
          <text className={styles.noAssignment}>
            No Value Assigned
          </text>}
        </span>
      </h4>
      <div className={styles.variableActions}>
        <button className={styles.button} onClick={onAddParameter}>
          Add Parameter
        </button>
      </div>
    </div>
  </div>
);
export default ExceptSection;
