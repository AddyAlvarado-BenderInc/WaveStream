import React, { useState } from 'react';
import { ProductManager, IconData } from '../../../../types/productManager';
import AdvancedDescription from './AdvancedDescriptionEditor/component';
import ProductIconManager from './ProductIconManager/component';
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

interface PropertyInterfaceTableProps {
    productManager: ProductManager;
    formData: any;
    iconData: any;
    setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
    setIconData: React.Dispatch<React.SetStateAction<IconDataState>>;
}

const PropertyInterfaceTable: React.FC<PropertyInterfaceTableProps> = ({ productManager, formData, iconData, setFormData, setIconData }) => {

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
                                    iconPreview: result.remainingIcons.map((f: string) => ({
                                        filename: f,
                                        url: `${BASE_URL}/api/files/${encodeURIComponent(f)}`
                                    }))
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
                        setIconData(prev => ({
                            ...prev,
                            newFiles: [...prev.newFiles, ...files],
                            iconPreview: [
                                ...prev.iconPreview,
                                ...files.map(file => ({
                                    filename: `temp-${Date.now()}-${file.name}`,
                                    url: URL.createObjectURL(file)
                                }))
                            ]
                        }));
                    }}
                />
            </div>
            <ToastContainer />
        </div>
    );
};

export default PropertyInterfaceTable;