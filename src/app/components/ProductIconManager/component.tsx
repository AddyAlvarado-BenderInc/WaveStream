import React, { useState } from "react";
import styles from "./component.module.css";

interface ProductIconManagerProps {
    icon: string; // Icon class, e.g., "fa-upload"
    label: string; // Label text
    onUpload: (file: File) => void; // Callback for handling file upload
}

const ProductIconManager: React.FC<ProductIconManagerProps> = ({ icon, label, onUpload }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file)); // Generate preview URL
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile) {
            onUpload(selectedFile); // Pass the file to the parent component
            alert("File uploaded successfully!");
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
                    Upload
                </button>
            </form>
            {preview && (
                <div className={styles.previewContainer}>
                    <h4>Preview:</h4>
                    <img src={preview} alt="Icon Preview" className={styles.previewImage} />
                </div>
            )}
        </div>
    );
};

export default ProductIconManager;
