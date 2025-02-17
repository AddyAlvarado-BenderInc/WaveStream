import React, { useState, useEffect } from "react";
import styles from "./component.module.css";

interface ProductIconManagerProps {
    icon: Array<{
        filename: string;
        url: string;
    }>;
    label: string;
    onDelete: (filename: string) => void;
    onUpload: (files: File[]) => void;
    handleFieldSelect: (field: string) => void;
    productType: string;
    productId: string;
}

const MAX_IMAGES = 5;

const ProductIconManager: React.FC<ProductIconManagerProps> = ({
    icon, label, onUpload, onDelete, handleFieldSelect, productType, productId
}) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const configIcon = "◉";

    useEffect(() => {
        return () => {
            newFiles.forEach(file => URL.revokeObjectURL(URL.createObjectURL(file)));
        };
    }, [newFiles]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);

            if (validFiles.length !== files.length) {
                alert("Some files were too large and were not added.");
            }

            if (icon.length + validFiles.length > MAX_IMAGES) {
                alert("You can only add up to 5 images.");
                return;
            }

            setNewFiles(prev => [...prev, ...validFiles]);
            onUpload(validFiles);
        }
    };

    const handleDeleteImage = (index: number) => {
        if (index < icon.length) {
            onDelete(icon[index].filename);
        } else {
            setNewFiles(prev => prev.filter((_, i) => i !== (index - icon.length)));
        }
    };

    const allImages = [
        ...icon.map(i => i.url),
        ...newFiles.map(file => URL.createObjectURL(file))
    ];

    const handleNextImage = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % allImages.length);
    };

    const handlePreviousImage = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + allImages.length) % allImages.length);
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
                {allImages.length > 0 ? (
                    <>
                        <div className={styles.previewContainer}>
                            <button
                                name="delete"
                                className={styles.button}
                                onClick={() => handleDeleteImage(currentIndex)}
                            >
                                ✕
                            </button>
                            <div className={styles.imageContainer}>
                                <button
                                    name="arrow-previous"
                                    className={styles.button}
                                    onClick={handlePreviousImage}
                                    disabled={allImages.length <= 1}
                                >
                                    ‹
                                </button>

                                {allImages[currentIndex] ? (
                                    <img
                                        src={allImages[currentIndex]}
                                        alt={`Preview ${currentIndex + 1}`}
                                        className={styles.previewImage}
                                    />
                                ) : (
                                    <div className={styles.placeholder}>
                                        No image available
                                    </div>
                                )}

                                <button
                                    name="arrow-next"
                                    className={styles.button}
                                    onClick={handleNextImage}
                                    disabled={allImages.length <= 1}
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                        <div className={styles.pagination}>
                            {allImages.map((_, index) => (
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
                    </>
                ) : (
                    <div className={styles.placeholder}>
                        Upload images to get started
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductIconManager;