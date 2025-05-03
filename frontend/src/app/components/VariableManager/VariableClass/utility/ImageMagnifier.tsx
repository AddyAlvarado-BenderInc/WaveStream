import React, { useState, useRef, MouseEvent } from 'react';
import styles from './component.module.css'; 

interface ImageMagnifierProps {
  src: string;
  alt: string;
  imgClassName?: string; 
  magnifierRadius?: number;
  zoomLevel?: number; 
}

const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
  src,
  alt,
  imgClassName = '',
  magnifierRadius = 75, 
  zoomLevel = 2.5,      
}) => {
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 }); 
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setShowMagnifier(true);
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current || !containerRef.current) return;

    const img = imgRef.current;
    const container = containerRef.current;
    const { left: containerLeft, top: containerTop } = container.getBoundingClientRect();
    const { naturalWidth, naturalHeight, offsetWidth, offsetHeight } = img;

    const cursorX = e.clientX - containerLeft;
    const cursorY = e.clientY - containerTop;

     if (cursorX < 0 || cursorX > offsetWidth || cursorY < 0 || cursorY > offsetHeight) {
       setShowMagnifier(false);
       return;
     }
     if (!showMagnifier) setShowMagnifier(true);

    setCursorPosition({ x: cursorX, y: cursorY });

    const magnifierX = cursorX - magnifierRadius;
    const magnifierY = cursorY - magnifierRadius;
    setPosition({ x: magnifierX, y: magnifierY });
  };

  const backgroundX = -((cursorPosition.x * zoomLevel) - magnifierRadius);
  const backgroundY = -((cursorPosition.y * zoomLevel) - magnifierRadius);

  return (
    <div
      ref={containerRef}
      className={styles.magnifierContainer}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${styles.magnifiableImage} ${imgClassName}`}
      />
      {showMagnifier && (
        <div
          className={styles.magnifier}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${magnifierRadius * 2}px`,
            height: `${magnifierRadius * 2}px`,
            backgroundImage: `url(${src})`,
            backgroundSize: `${(imgRef.current?.offsetWidth || 0) * zoomLevel}px ${(imgRef.current?.offsetHeight || 0) * zoomLevel}px`,
            backgroundPosition: `${backgroundX}px ${backgroundY}px`,
            borderRadius: '50%',
          }}
        />
      )}
    </div>
  );
};

export default ImageMagnifier;