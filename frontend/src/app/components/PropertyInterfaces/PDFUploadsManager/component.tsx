import React, { useState, useEffect } from "react";
import { addPDF, deletePDF } from "@/app/store/productManagerSlice";
import { useDispatch } from "react-redux";
import styles from "./component.module.css";
import { toast } from "react-toastify";

interface ProductPDFManagerProps {
    pdf: Array<{
        filename: string;
        url: string;
    }>;
    label: string;
    onDelete: (filename: string) => void;
    onUpload: (files: File[]) => void;
}

const MAX_PDFS = 25;

const ProductPDFManager: React.FC<ProductPDFManagerProps> = ({
    pdf, label, onUpload, onDelete
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

            if (pdf.length + validFiles.length > MAX_PDFS) {
                alert("You can only add up to 5 PDFs.");
                return;
            }

            setNewFiles(prev => [...prev, ...validFiles]);
            onUpload(validFiles);
            dispatch(addPDF(validFiles.map(file => ({
                filename: file.name,
                url: URL.createObjectURL(file),
            }))));
        }
    };

    const handleDeletePDF = async (index: number) => {
        try {
            if (index < pdf.length) {
                const filename = pdf[index].filename;

                await onDelete(filename);
                dispatch(deletePDF(filename));

                const newPDFs = [...pdf];
                newPDFs.splice(index, 1);
                if (currentIndex >= newPDFs.length) {
                    setCurrentIndex(Math.max(0, newPDFs.length - 1));
                }
            } else {
                setNewFiles(prev => {
                    const updatedFiles = prev.filter((_, i) => i !== (index - pdf.length));
                    URL.revokeObjectURL(allPDFs[index]);
                    return updatedFiles;
                });
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete PDF. Please try again.');
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
                className={styles.PDFInfo}
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

    const allPDFs = [
        ...pdf.map(i => i.url),
        ...newFiles.map(file => URL.createObjectURL(file))
    ];

    const handleNextPDF = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % allPDFs.length);
    };

    const handlePreviousPDF = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + allPDFs.length) % allPDFs.length);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <label htmlFor="pdfFileInput" className={styles.uploadLabel}>
                    <span>{label}</span>
                </label>
            </div>
            <input
                id="pdfFileInput"
                type="file"
                multiple
                accept="application/pdf"
                onChange={handleFileChange}
                className={styles.fileInput}
            />
            <div className={styles.previewBox}>
                {allPDFs.length > 0 ? (
                    <>
                        <div className={styles.previewContainer}>
                            <div className={styles.PDFContainer}>
                                <button
                                    name="arrow-previous"
                                    className={styles.button}
                                    onClick={handlePreviousPDF}
                                    disabled={allPDFs.length <= 1}
                                >
                                    ‹
                                </button>
                                {allPDFs[currentIndex] ? (
                                    <embed
                                        key={allPDFs[currentIndex]}
                                        src={allPDFs[currentIndex]}
                                        type="application/pdf" 
                                        className={styles.previewPDF}
                                    />
                                ) : (
                                    <div className={styles.placeholder}>
                                        No PDF available
                                    </div>
                                )}
                                <button
                                    name="arrow-next"
                                    className={styles.button}
                                    onClick={handleNextPDF}
                                    disabled={allPDFs.length <= 1}
                                >
                                    ›
                                </button>
                            </div>
                        </div>
                        <button
                                name="delete"
                                className={styles.button}
                                onClick={() => handleDeletePDF(currentIndex)}
                            >
                                ✕
                            </button>
                        <div className={styles.PDFInfo}>
                            <FileNameWithTooltip filename={allPDFs[currentIndex]} />
                        </div>
                        <div className={styles.pagination}>
                            {allPDFs.map((_, index) => (
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
                        Upload PDFs to get started
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductPDFManager;