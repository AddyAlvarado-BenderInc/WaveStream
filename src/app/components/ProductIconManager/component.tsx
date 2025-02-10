import React, { useState, useEffect } from "react";
import styles from "./component.module.css";

interface ProductIconManagerProps {
    icon: string[];
    label: string;
    onDelete: (index: number) => void;
    onUpload: (iconData: File[]) => void;
    handleFieldSelect: (field: string) => void;
    handleSaveIcons: () => Promise<void>;
    productType: string;
    productId: string;
    setFormData: React.Dispatch<React.SetStateAction<{
        displayAs: string;
        productId: string;
        intentRange: string | number;
        selectorMode: string;
        itemTemplate: string;
        descriptionFooter: string;
        buyNowButtonText: string;
        description: string;
        initialJS: string;
        initialCSS: string;
        initialHTML: string;
        icon: (string | File)[];
        label: string;
        iconPreview: string[];
    }>>;
}

const MAX_IMAGES = 5;

const ProductIconManager: React.FC<ProductIconManagerProps> = ({ icon, label, onUpload, onDelete, handleFieldSelect, setFormData, productType, productId, handleSaveIcons }) => {
    const [images, setImages] = useState<string[]>(icon || []);
    const [currentIndex, setCurrentIndex] = useState<number>(0);

    const configIcon = "◉";

    useEffect(() => {
        async function fetchIcons() {
            try {
                const response = await fetch(`/api/productManager/${productType}/icon?id=${productId}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Image(s) retrieved successfully:', data.icons);
                    setFormData((prev) => ({
                        ...prev,
                        icon: data.icons,
                        iconPreview: data.icons,
                    }));
                } else {
                    console.error('Failed to fetch icons:', await response.json());
                }
            } catch (error) {
                console.error('Error fetching icons:', error);
            }
        }

        if (productId) {
            fetchIcons();
        }
    }, [productId, productType]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);

            if (validFiles.length !== files.length) {
                alert("Some files were too large and were not added.");
            }

            const newImages = validFiles.map((file) => URL.createObjectURL(file));

            if (images.length + newImages.length > MAX_IMAGES) {
                alert("You can only add up to 5 images.");
                return;
            }

            setImages((prev) => [...prev, ...newImages]);
            onUpload(validFiles);
        }
    };

    const handleDeleteImage = (index: number) => {
        onDelete(index);
        setImages((prev) => prev.filter((_, imgIndex) => imgIndex !== index));
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
                <button
                    name="save"
                    className={styles.button}
                    onClick={async () => {
                        try {
                            await handleSaveIcons();
                        } catch (error) {
                            console.error('Error saving icons from child:', error);
                        }
                    }}
                >
                    Update Icons
                </button>
            </div>
        </div>
    );
};

export default ProductIconManager;