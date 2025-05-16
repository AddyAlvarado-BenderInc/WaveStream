import React from 'react';
import styles from './component.module.css'; // Assuming you'll rename or use a shared utility CSS

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomChange,
}) => {
  return (
    <div className={styles.zoomControls}>
      <button
        onClick={onZoomOut}
        className={styles.zoomButton}
        title="Zoom Out"
      >
        <span>-</span>
      </button>
      <div className={styles.zoomDisplay}>
        <input
          type="range"
          min="50"
          max="200"
          value={zoomLevel}
          onChange={onZoomChange}
          className={styles.zoomSlider}
        />
        <span>{zoomLevel}%</span>
      </div>
      <button
        onClick={onZoomIn}
        className={styles.zoomButton}
        title="Zoom In"
      >
        <span>+</span>
      </button>
      <button
        onClick={onZoomReset}
        className={styles.zoomResetButton}
        title="Reset Zoom"
      >
        <span>Reset</span>
      </button>
    </div>
  );
};

export default ZoomControls;