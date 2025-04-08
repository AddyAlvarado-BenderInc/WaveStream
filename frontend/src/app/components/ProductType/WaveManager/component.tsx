import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateProductManager } from "../../../store/productManagerSlice";
import { ProductManager, IconData } from '../../../../../types/productManager';
import { BASE_URL } from '../../../config';
import styles from './component.module.css';
import AdvancedDescription from '../../AdvancedDescriptionEditor/component';
import ProductIconManager from '../../ProductIconManager/component';
import ProductInformationForm from '../../ProductInformation/component';
import BrickProductInfo from '../../BrickTypes/BrickProductInfo/component';
import BrickAdvancedDescription from '../../BrickTypes/BrickDescriptionEditor/component';
import BrickProductIcon from '../../BrickTypes/BrickProductIcon/component';
import { AppDispatch } from '@/app/store/store';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface WaveManagerProps {
    productManager: ProductManager;
}

const WaveManager: React.FC<WaveManagerProps> = ({ productManager }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [formData, setFormData] = useState({
        displayAs: productManager.displayAs || '',
        itemName: productManager.itemName || '',
        productId: productManager.productId || '',
        intentRange: productManager.intentRange || '',
        selectorMode: productManager.selectorMode || 'default',
        itemTemplate: productManager.itemTemplate || '',
        descriptionFooter: productManager.descriptionFooter || '',
        buyNowButtonText: productManager.buyNowButtonText || '',
        description: productManager.description,
        initialJS: productManager.initialJS || '',
        initialCSS: productManager.initialCSS || '',
        initialHTML: productManager.initialHTML || '',
        label: productManager.label || '',
        icon: (productManager.icon || []).map((icon: IconData) => ({
            filename: icon?.filename,
            url: `${BASE_URL}/api/files/${encodeURIComponent(icon?.filename)}`
        })),
        iconPreview: (productManager.iconPreview || []).map((icon: IconData) => ({
            filename: icon?.filename,
            url: `${BASE_URL}/api/files/${encodeURIComponent(icon?.filename)}`
        })),
        newFiles: [] as File[]
    });

    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [selectedBrickId, setSelectedBrickId] = useState<string | number | boolean>(String);
    const [descriptionName, setDescriptionName] = useState("");

    const handleDescriptionNameChange = (name: string) => {
        setDescriptionName(name);
    }

    const handleFieldSelection = (field: string) => {
        setSelectedField(field);

        const brickId = `${productManager._id}_${field}`;
        setSelectedBrickId(brickId);
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

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

    const handleSave = async () => {
        try {
            const { productType, _id } = productManager;
            const formDataPayload = new FormData();

            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'icon' || key === 'newFiles' || key === 'iconPreview') return;

                if (value !== null && value !== undefined) {
                    if (Array.isArray(value)) {
                        formDataPayload.append(key, JSON.stringify(value));
                    } else {
                        formDataPayload.append(key, value.toString());
                    }
                }
            });

            formData.icon.forEach(icon => {
                formDataPayload.append('icons', icon.filename);
            });

            formData.newFiles.forEach(file => {
                formDataPayload.append('files', file);
            });

            console.log("FormData Payload before sending:", Array.from(formDataPayload.entries()));

            const response = await fetch(`/api/productManager/${productType}/${_id}`, {
                method: 'PATCH',
                body: formDataPayload,
            });

            if (response.ok) {
                const updatedProduct = await response.json();
                console.log('Updated Product:', updatedProduct);

                setFormData((prev) => ({
                    ...prev,
                    ...updatedProduct,
                    iconPreview: updatedProduct.icon,
                }));

                dispatch(updateProductManager(updatedProduct));
                toast.success('Product saved successfully!', {
                    position: 'bottom-right',
                    autoClose: 5000,
                    hideProgressBar: true,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: false,
                    progress: undefined,
                });
            } else {
                const error = await response.json();
                toast.error(`Error saving product: ${error.message}`, {
                    position: 'bottom-right',
                    autoClose: 5000,
                    hideProgressBar: true,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: false,
                    progress: undefined,
                });
            }
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Failed to save the product. Please try again.');
        }
    };

    useEffect(() => {
        const fetchProductManager = async () => {
            try {
                const response = await fetch(`${BASE_URL}/api/productManager/${productManager.productType}/${productManager._id}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('Fetched Product Manager:', data);
                    const icons = Array.isArray(data.icon)
                        ? data.icon.map((filename: string) =>
                            `${BASE_URL}/api/files/${encodeURIComponent(filename)}`
                        )
                        : [];

                    setFormData({
                        displayAs: data.displayAs || '',
                        itemName: data.itemName || '',
                        productId: data.productId || '',
                        intentRange: data.intentRange || '',
                        selectorMode: data.selectorMode || 'default',
                        itemTemplate: data.itemTemplate || '',
                        descriptionFooter: data.descriptionFooter || '',
                        buyNowButtonText: data.buyNowButtonText || '',
                        description: data.description || '',
                        initialJS: data.initialJS || '',
                        initialCSS: data.initialCSS || '',
                        initialHTML: data.initialHTML || '',
                        iconPreview: icons,
                        icon: data.icon || [],
                        label: data.label || '',
                        newFiles: []
                    });
                } else {
                    console.error('Failed to fetch product manager data');
                }
            } catch (error) {
                console.error('Error fetching product manager:', error);
            }
        };

        fetchProductManager();
    }, []);

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

    const handleCloseEditor = () => {
        setSelectedField(null);
        setSelectedBrickId("");
    };

    const renderBrickComponent = () => {
        if (!selectedBrickId) {
            return <h1>Select A Field</h1>;
        }

        switch (selectedBrickId) {
            case `${productManager._id}_description`:
                return (
                    <BrickAdvancedDescription
                        brickId={selectedBrickId}
                        field="description"
                        targetValue={formData.description}
                        intentValue={formData.description}
                        specifiedIntentRange={0}
                        intentSelectionValue="default"
                        actionSelectionValue="default"
                        onClose={handleCloseEditor}
                        formData={formData}
                    />
                );
            case `${productManager._id}_icon`:
                return (
                    <BrickProductIcon
                        brickId={selectedBrickId}
                        field="icon"
                        targetValue={Array.isArray(formData.icon) ? formData.icon.join(', ') : formData.icon}
                        intentValue={Array.isArray(formData.iconPreview) ? formData.iconPreview.join(', ') : formData.iconPreview}
                        specifiedIntentRange={0}
                        intentSelectionValue="default"
                        actionSelectionValue="default"
                        onClose={handleCloseEditor}
                        formData={formData}
                    />
                );
            default:
                return (
                    <BrickProductInfo
                        brickId={selectedBrickId}
                        field={selectedField || ''}
                        targetValue={
                            Array.isArray(formData[selectedField as keyof typeof formData])
                                ? (formData[selectedField as keyof typeof formData] as Array<string | File>).join(', ')
                                : (formData[selectedField as keyof typeof formData] as string | number | File | null) || ''
                        }
                        intentValue={
                            Array.isArray(formData[selectedField as keyof typeof formData])
                                ? (formData[selectedField as keyof typeof formData] as Array<string | File>).join(', ')
                                : (formData[selectedField as keyof typeof formData] as string | number | File | null) || ''
                        }
                        specifiedIntentRange={0}
                        intentSelectionValue="default"
                        actionSelectionValue="default"
                        onClose={handleCloseEditor}
                        formData={formData}
                    />

                );
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.managerContainer}>
                <div className={styles.leftContainer}>
                    <ProductInformationForm
                        formData={formData}
                        handleInputChange={handleInputChange}
                        productName={productManager.name}
                        handleFieldSelect={handleFieldSelection}
                    />
                </div>
                <div className={styles.divider} />
                <div className={styles.middleContainer}>
                    <AdvancedDescription
                        descriptionName={descriptionName}
                        onDescriptionName={handleDescriptionNameChange}
                        description={formData.description}
                        initialJS={formData.initialJS}
                        initialCSS={formData.initialCSS}
                        initialHTML={formData.initialHTML}
                        onUpdate={handleAdvancedDescriptionUpdate}
                        handleFieldSelect={handleFieldSelection}
                        handleSaveButton={(name, html, css, js) => {
                            console.log("handleSaveButton invoked with:", { name, html, css, js });
                            descriptionSaveButton(name, html, css, js);
                        }}
                        handleClearButton={descriptionClearButton}
                    />
                </div>
                <div className={styles.divider} />
                <div className={styles.rightContainer}>
                    <ProductIconManager
                        productType={productManager.productType}
                        productId={productManager._id}
                        icon={formData.icon}
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

                                    setFormData(prev => ({
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
                            setFormData(prev => ({
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
                        handleFieldSelect={handleFieldSelection}
                    />
                    <button className={styles.saveButton} onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
            {renderBrickComponent()}
            <ToastContainer />
        </div>
    );
};

export default WaveManager;