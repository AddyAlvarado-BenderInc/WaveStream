import React, { useState, useEffect } from "react";
import styles from "./component.module.css";

interface ProductIconManagerProps {
    icon: string;
    label: string;
    onUpload: (iconData: string) => void;
}

const ProductIconManager: React.FC<ProductIconManagerProps> = ({ icon, label, onUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };
    

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const base64Data = event.target.result.toString();
                    const truncatedIcon = base64Data.substring(0, 30); 
                    console.log("Truncated Icon:", truncatedIcon);
    
                    onUpload(truncatedIcon);
                    alert("Icon data truncated and uploaded successfully!");
                }
            };
            reader.readAsDataURL(selectedFile);
        } else {
            alert("Please select a file to upload.");
        }
    };
       

    return (
        <div className={styles.container}>
            <form className={styles.productIcon} onSubmit={handleSubmit}>
                <label htmlFor="fileInput" className={styles.uploadLabel}>
                    <i className={`fas ${icon} ${styles.icon}`}></i>
                    <span>{label}</span>
                </label>
                <input
                    id="fileInput"
                    type="file"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                />
                <button type="submit" className={styles.uploadButton}>
                    Upload Icon
                </button>
            </form>
            {preview && (
                <div className={styles.previewContainer}>
                    <img src={preview} alt="Icon Preview" className={styles.previewImage} />
                </div>
            )}
        </div>
    );
};

export default ProductIconManager;
