import React, { useState, useEffect } from "react";
import styles from "./component.module.css";

interface ProductIconManagerProps {
    icon: string;
    label: string;
    onUpload: (iconData: File) => void;
}

const ProductIconManager: React.FC<ProductIconManagerProps> = ({ icon, label, onUpload }) => {
    const [preview, setPreview] = useState<string | null>(icon || null);

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

    return (
        <div className={styles.container}>
            <label htmlFor="fileInput" className={styles.uploadLabel}>
                <span>{label}</span>
            </label>
            <input
                id="fileInput"
                type="file"
                onChange={handleFileChange}
                className={styles.fileInput}
            />
            {preview && (
                <div className={styles.previewContainer}>
                    <img src={preview} alt="Icon Preview" className={styles.previewImage} />
                </div>
            )}
        </div>
    );
};


export default ProductIconManager;
