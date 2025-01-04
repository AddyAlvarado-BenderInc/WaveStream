import React, { useState, useEffect } from "react";
import styles from "./component.module.css";

interface ProductIconManagerProps {
    icon: string;
    label: string;
    onUpload: (iconData: File) => void;
    handleFieldSelect: (field: string) => void;
    onClose: () => void;
}

const ProductIconManager: React.FC<ProductIconManagerProps> = ({ icon, label, onUpload, handleFieldSelect }) => {
    const [preview, setPreview] = useState<string | null>(icon || null);
    
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

    const handleImageChange = (e: React.MouseEvent, field: string) => {
    }

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
                        >
                            ‹
                        </button>
                        <img src={preview} alt="Icon Preview" className={styles.previewImage} />
                        <button 
                            name="arrow-next"
                            className={styles.button}
                        >
                            ›
                        </button>
                    </div>
                )}
                <div className={styles.pagination}>
                •••
                </div>
            </div>
        </div>
    );
};


export default ProductIconManager;
