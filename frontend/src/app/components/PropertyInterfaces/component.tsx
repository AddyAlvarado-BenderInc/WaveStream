import React, { useState } from 'react';
import { ProductManager, IconData, PDFData } from '../../../../types/productManager';
import AdvancedDescription from './AdvancedDescriptionEditor/component';
import ProductIconManager from './ProductIconManager/component';
import ProductPDFManager from './PDFUploadsManager/component';
import styles from './component.module.css';
import { BASE_URL } from '../../config';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface FormDataState {
    itemName: string;
    productId: string;
    description: string;
    initialJS: string;
    initialCSS: string;
    initialHTML: string;
    label: string;
}

interface IconDataState {
    icon: IconData[];
    iconPreview: IconData[];
    newFiles: File[];
}

interface PDFDataState {
    pdf: PDFData[];
    pdfPreview: PDFData[];
    newFiles: File[];
}

interface PropertyInterfaceTableProps {
    productManager: ProductManager;
    formData: any;
    iconData: IconDataState;
    pdfData: PDFDataState;
    setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
    setIconData: React.Dispatch<React.SetStateAction<IconDataState>>;
    setPDFData: React.Dispatch<React.SetStateAction<PDFDataState>>;
}

const PropertyInterfaceTable: React.FC<PropertyInterfaceTableProps> = ({ productManager, formData, iconData, pdfData, setFormData, setIconData, setPDFData }) => {
    const [descriptionName, setDescriptionName] = useState("");
    const handleDescriptionNameChange = (name: string) => {
        setDescriptionName(name);
    }

    const handleAdvancedDescriptionUpdate = (field: string, value: string) => {
        const updatedField = {
            css: 'initialCSS',
            html: 'initialHTML',
            js: 'initialJS',
        }[field];

        if (updatedField) {
            setFormData((prevData) => ({
                ...prevData,
                [updatedField]: value,
            }));
        }
    };

    const checkAndFilterCollisions = (
        filesToCheck: File[],
        existingOtherFiles: { filename: string }[],
        newOtherFiles: File[],
        fileType: 'PDF' | 'Icon',
        otherFileType: 'Icon' | 'PDF'
    ): File[] => {
        const otherFilenames = new Set([
            ...existingOtherFiles.map(f => f.filename),
            ...newOtherFiles.map(f => f.name)
        ]);

        const collisions = filesToCheck.filter(file => otherFilenames.has(file.name));
        const nonCollidingFiles = filesToCheck.filter(file => !otherFilenames.has(file.name));

        if (collisions.length > 0) {
            toast.error(
                `Cannot add ${fileType}(s) with the same name as existing ${otherFileType}(s): ${collisions.map(f => f.name).join(', ')}`,
                { autoClose: 5000 }
            );
        }
        return nonCollidingFiles;
    };

    const overwriteDescription = async (
        id: string,
        name: string,
        html: string,
        css: string,
        js: string,
        combinedHTML: string
    ) => {
        try {
            const response = await fetch(`/api/productManager/descriptions?descriptionId=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, html, css, js, combinedHTML }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Description overwritten successfully!');
            } else {
                const error = await response.json();
                toast.error(`Error: ${error.message}`);
            }
        } catch (error) {
            console.error('Overwrite Description Error:', error);
            toast.error('Failed to overwrite the description.');
        }
    };

    const descriptionSaveButton = async (
        name: string,
        html: string,
        css: string,
        js: string
    ): Promise<void> => {
        try {
            console.log("Inputs before validation:", { name, html, css, js });

            if (!name.trim() || !html.trim()) {
                toast.error("Name and HTML fields are required.");
                return;
            }

            const combinedHTML = `
            <html>
                <head><style>${css || ""}</style></head>
                <body>${html}${js ? `<script>${js}</script>` : ""}</body>
            </html>
            `;

            console.log("Combined HTML:", combinedHTML);

            const response = await fetch(`/api/productManager/descriptions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, html, css, js, combinedHTML }),
            });

            if (response.status === 409) {
                const { description } = await response.json();

                const overwrite = confirm(
                    `Description with the name "${name}" already exists. Do you want to overwrite it?`
                );

                if (overwrite) {
                    await overwriteDescription(description.id, name, html, css, js, combinedHTML);
                } else {
                    toast.info('Description overwrite canceled.');
                }
                return;
            }

            if (response.ok) {
                const data = await response.json();
                console.log("API Response Data:", data);
                toast.success("Description saved successfully!");
            } else {
                const error = await response.json();
                console.error("API Error:", error);
                toast.error(`Error: ${error.message}`);
            }
        } catch (error) {
            console.error("Save Description Error:", error);
            toast.error("An unexpected error occurred.");
        }
    };

    const descriptionClearButton = () => {
        if (confirm('Are you sure you want to clear the description?')) {
            setFormData((prev) => ({
                ...prev,
                initialCSS: '',
                initialHTML: '',
                initialJS: '',
                description: '',
            }));
            toast.success('Description cleared successfully');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.managerContainer}>
                <AdvancedDescription
                    descriptionName={descriptionName}
                    onDescriptionName={handleDescriptionNameChange}
                    description={formData.description}
                    initialJS={formData.initialJS}
                    initialCSS={formData.initialCSS}
                    initialHTML={formData.initialHTML}
                    onUpdate={handleAdvancedDescriptionUpdate}
                    handleSaveButton={(name, html, css, js) => {
                        console.log("handleSaveButton invoked with:", { name, html, css, js });
                        descriptionSaveButton(name, html, css, js);
                    }}
                    handleClearButton={descriptionClearButton}
                />
                <div className={styles.divider} />
                <ProductPDFManager
                    pdf={pdfData.pdf}
                    label="Product PDFs"
                    onDelete={async (filename: string) => {
                        const { productType, _id: productId } = productManager;

                        try {
                            const response = await fetch(
                                `/api/productManager/${productType}/${productId}/pdf?filename=${encodeURIComponent(filename)}`,
                                { method: 'DELETE' }
                            );

                            if (response.ok) {
                                const result = await response.json();

                                setPDFData(prev => ({
                                    ...prev,
                                    pdf: result.remainingPDFs.map((f: string) => ({
                                        filename: f,
                                        url: `${BASE_URL}/api/files/${encodeURIComponent(f)}`
                                    })),
                                    newFiles: prev.newFiles.filter(file => file.name !== filename)
                                }));

                                toast.success(result.message);
                            } else {
                                const error = await response.json();
                                toast.error(`Delete failed: ${error.error}`);
                            }
                        } catch (error) {
                            console.error('Delete error:', error);
                            toast.error('Failed to delete PDF. Please try again.');
                        }
                    }}
                    onUpload={(files: File[]) => {
                        const nonCollidingFiles = checkAndFilterCollisions(
                            files,
                            iconData.icon,
                            iconData.newFiles,
                            'PDF',
                            'Icon'
                        );

                        if (nonCollidingFiles.length === 0) return;

                        setPDFData(prev => ({
                            ...prev,
                            newFiles: [...prev.newFiles, ...nonCollidingFiles],
                        }));
                    }}
                />
                <div className={styles.divider} />
                <ProductIconManager
                    icon={iconData.icon}
                    label="Product Icons"
                    onDelete={async (filename: string) => {
                        const { productType, _id: productId } = productManager;

                        try {
                            const response = await fetch(
                                `/api/productManager/${productType}/${productId}/icon?filename=${encodeURIComponent(filename)}`,
                                { method: 'DELETE' }
                            );

                            if (response.ok) {
                                const result = await response.json();
                                setIconData(prev => ({
                                    ...prev,
                                    icon: result.remainingIcons.map((f: string) => ({
                                        filename: f,
                                        url: `${BASE_URL}/api/files/${encodeURIComponent(f)}`
                                    })),
                                    newFiles: prev.newFiles.filter(file => file.name !== filename)
                                }));
                                toast.success(result.message);
                            } else {
                                const error = await response.json();
                                toast.error(`Delete failed: ${error.error}`);
                            }
                        } catch (error) {
                            console.error('Delete error:', error);
                            toast.error('Failed to delete icon. Please try again.');
                        }
                    }}
                    onUpload={(files: File[]) => {
                        const nonCollidingFiles = checkAndFilterCollisions(
                            files,
                            pdfData.pdf, 
                            pdfData.newFiles, 
                            'Icon',
                            'PDF'
                        );

                        if (nonCollidingFiles.length === 0) return;

                        setIconData(prev => ({
                            ...prev,
                            newFiles: [...prev.newFiles, ...nonCollidingFiles],
                        }));
                    }}
                />
            </div>
            <ToastContainer />
        </div>
    );
};

export default PropertyInterfaceTable;