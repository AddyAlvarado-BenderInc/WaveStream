import React, { useState, useEffect } from "react";
import styles from "./component.module.css";

interface ProductIconManagerProps {
    icon: string[];
    label: string;
    onUpload: (iconData: File[]) => void;
    handleFieldSelect: (field: string) => void;
    onClose: () => void;
}

const ProductIconManager: React.FC<ProductIconManagerProps> = ({ icon, label, onUpload, handleFieldSelect }) => {
    const [preview, setPreview] = useState<string[]>(icon || null);
    const [images, setImages] = useState<string[]>(icon || []);
    const [currentIndex, setCurrentIndex] = useState<number>(0);

    const configIcon = "◉";

    useEffect(() => {
        if (Array.isArray(icon) && icon.length > 0) {
            setImages(icon);
        }
    }, [icon]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);

            if (validFiles.length !== files.length) {
                alert("Some files were too large and were not added.");
            }

            const newImages = validFiles.map((file) => URL.createObjectURL(file));
            setImages((prev) => [...prev, ...newImages]);

                onUpload(validFiles);
        }
    };


    const handleNextImage = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    };

    const handlePreviousImage = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    };

    const handleIconClick = (e: React.MouseEvent, field: string) => {
        e.stopPropagation();

        const camelCaseField = field
            .split(' ')
            .map((word, index) =>
                index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join('');

        handleFieldSelect(camelCaseField);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <label htmlFor="fileInput" className={styles.uploadLabel}>
                    <span>{label}</span>
                </label>
                <button
                    className={styles.iconButton}
                    onClick={(e) => handleIconClick(e, "Icon")}
                >
                    {configIcon}
                </button>
            </div>
            <input
                id="fileInput"
                type="file"
                multiple
                onChange={handleFileChange}
                className={styles.fileInput}
            />
            <div className={styles.previewBox}>
                {images.length > 0 && (
                    <div className={styles.previewContainer}>
                        <button
                            name="arrow-previous"
                            className={styles.button}
                            onClick={handlePreviousImage}
                        >
                            ‹
                        </button>
                        <img
                            src={images[currentIndex]}
                            alt={`Preview ${currentIndex + 1}`}
                            className={styles.previewImage}
                        />
                        <button
                            name="arrow-next"
                            className={styles.button}
                            onClick={handleNextImage}
                        >
                            ›
                        </button>
                    </div>
                )}
                <div className={styles.pagination}>
                    {images.map((_, index) => (
                        <span
                            key={index}
                            className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ""
                                }`}
                            onClick={() => setCurrentIndex(index)}
                        >
                            •
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};


export default ProductIconManager;