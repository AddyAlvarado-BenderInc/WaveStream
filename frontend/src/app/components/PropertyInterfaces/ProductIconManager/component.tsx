import React, { useState, useEffect } from "react";
import { addIcon, deleteIcon } from "@/app/store/productManagerSlice";
import { useDispatch } from "react-redux";
import styles from "./component.module.css";
import { toast } from "react-toastify";

interface ProductIconManagerProps {
    icon: Array<{
        filename: string;
        url: string;
    }>;
    label: string;
    onDelete: (filename: string) => void;
    onUpload: (files: File[]) => void;
}

const MAX_IMAGES = 5;

const ProductIconManager: React.FC<ProductIconManagerProps> = ({
    icon, label, onUpload, onDelete
}) => {
    const dispatch = useDispatch();
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [newFiles, setNewFiles] = useState<File[]>([]);

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
            dispatch(addIcon(validFiles.map(file => ({
                filename: file.name,
                url: URL.createObjectURL(file),
            }))));
        }
    };

    const handleDeleteImage = async (index: number) => {
        try {
            if (index < icon.length) {
                const filename = icon[index].filename;

                await onDelete(filename);
                dispatch(deleteIcon(filename));

                const newImages = [...icon];
                newImages.splice(index, 1);
                if (currentIndex >= newImages.length) {
                    setCurrentIndex(Math.max(0, newImages.length - 1));
                }
            } else {
                setNewFiles(prev => {
                    const updatedFiles = prev.filter((_, i) => i !== (index - icon.length));
                    URL.revokeObjectURL(allImages[index]);
                    return updatedFiles;
                });
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete image. Please try again.');
        }
    };

    const displayFileName = (filename: string) => {
        const maxLength = 20;
        if (filename.length > maxLength) {
            return `${filename.slice(0, maxLength)}...`;
        }
        return filename;
    };

    const FileNameWithTooltip: React.FC<{ filename: string }> = ({ filename }) => {
        const [isHovered, setIsHovered] = useState(false);

        return (
            <div
                className={styles.imageInfo}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <strong>{displayFileName(filename)}</strong>
                {isHovered && (
                    <div className={styles.tooltip}>
                        <strong>{filename}</strong>
                    </div>
                )}
            </div>
        );
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

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <label htmlFor="fileInput" className={styles.uploadLabel}>
                    <span>{label}</span>
                </label>
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
                        <div className={styles.imageInfo}>
                            <FileNameWithTooltip filename={allImages[currentIndex]} />
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