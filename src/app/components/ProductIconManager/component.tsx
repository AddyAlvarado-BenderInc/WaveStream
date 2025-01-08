import React, { useState, useEffect } from "react";
import styles from "./component.module.css";

interface ProductIconManagerProps {
    icon: string;
    label: string;
    onUpload: (iconData: File | null) => void;
    handleFieldSelect: (field: string) => void;
    onClose: () => void;
}

const ProductIconManager: React.FC<ProductIconManagerProps> = ({ icon, label, onUpload, handleFieldSelect }) => {
    const [preview, setPreview] = useState<string | null>(icon || null);
    const [pagination, setPagination] = useState(true);

    const configIcon = "◉";

    useEffect(() => {
        if (icon) {
            setPreview(icon);
        }
    }, [icon]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File size exceeds the 5MB limit.");
                return;
            }
            setPreview(URL.createObjectURL(file));
            onUpload(file);
        }
    };

    const deleteFile = (e: React.MouseEvent) => {
        setPreview(null);
        onUpload(null);
    }

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

    const handleAddIcons = (e: React.MouseEvent) => {
        
        return (
            <></>
        )
    };

    const handleImageChange = (e: React.MouseEvent, field: string) => {

    };

    const handleImagePagination = () => {
        if (!preview) {
            setPagination(false);
        }
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
                onChange={handleFileChange}
                className={styles.fileInput}
            />
            <div className={styles.previewBox}>
                {preview && (
                    <div className={styles.previewContainer}>
                        <button
                            name="arrow-previous"
                            className={styles.button}
                            onClick={(e) => handleImageChange(e, "arrow-previous")}
                        >
                            ‹
                        </button>
                        <img src={preview} alt="Icon Preview" className={styles.previewImage} />
                        <button name="delete" className={styles.button} onClick={(e) => deleteFile(e)}>✕</button>
                        <button
                            name="arrow-next"
                            className={styles.button}
                            onClick={(e) => handleImageChange(e, "arrow-next")}
                        >
                            ›
                        </button>
                    </div>
                )}
                <div className={styles.lowerContainer}>
                    {pagination && (
                        <button name="pagination" className={styles.button}>•</button>
                    )}
                    <button name="add-icons" className={styles.button}>+ Add Icons</button>
                </div>
            </div>
        </div>
    );
};


export default ProductIconManager;