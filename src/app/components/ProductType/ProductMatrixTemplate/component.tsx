import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateProductManager } from "../../../store/productManagerSlice";
import { ProductManager } from '../../../../../types/productManager';
import styles from './component.module.css';
import AdvancedDescription from '../../AdvancedDescriptionEditor/component';
import ProductIconManager from '../../ProductIconManager/component';
import ProductInformationForm from '../../ProductInformation/component';
import { AppDispatch } from '@/app/store/store';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ProductMatrixTemplateProps {
    productManager: ProductManager;
}

const ProductMatrixTemplate: React.FC<ProductMatrixTemplateProps> = ({ productManager }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [formData, setFormData] = useState({
        displayAs: productManager.displayAs || '',
        productId: productManager.productId || '',
        intentRange: productManager.intentRange || '',
        selectorMode: productManager.selectorMode || 'default',
        itemTemplate: productManager.itemTemplate || '',
        descriptionFooter: productManager.descriptionFooter || '',
        initialProductLink: productManager.initialProductLink || '',
        buyNowButtonText: productManager.buyNowButtonText || '',
        description: productManager.description || '',
        initialJS: productManager.initialJS || '',
        initialCSS: productManager.initialCSS || '',
        initialHTML: productManager.initialHTML || '',
        icon: productManager.icon || '',
        label: productManager.label || '',
        iconPreview: productManager.iconPreview || null,
    });

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
                if (key === 'icon' && value instanceof File) {
                    formDataPayload.append(key, value);
                } else if (value !== null && value !== undefined) {
                    formDataPayload.append(key, value.toString());
                }
            });

            console.log("FormData Payload before sending:", formDataPayload);

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
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
            } else {
                const error = await response.json();
                toast.error(`Error saving product: ${error.message}`, {
                    position: 'bottom-right',
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
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
                const response = await fetch(`/api/productManager/${productManager.productType}/${productManager._id}`);
                if (response.ok) {
                    const data = await response.json();
                    setFormData({
                        displayAs: data.displayAs || '',
                        productId: data.productId || '',
                        intentRange: data.intentRange || '',
                        selectorMode: data.selectorMode || 'default',
                        itemTemplate: data.itemTemplate || '',
                        descriptionFooter: data.descriptionFooter || '',
                        initialProductLink: data.initialProductLink || '',
                        buyNowButtonText: data.buyNowButtonText || '',
                        description: data.description || '',
                        initialJS: data.initialJS || '',
                        initialCSS: data.initialCSS || '',
                        initialHTML: data.initialHTML || '',
                        iconPreview: typeof productManager.icon === 'string' ? productManager.icon : null,
                        icon: data.icon || '',
                        label: data.label || '',
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

    return (
        <div className={styles.container}>
            <div className={styles.leftContainer}>
                <ProductInformationForm
                    formData={formData}
                    handleInputChange={handleInputChange}
                    productName={productManager.name}
                />
                <ToastContainer />
            </div>
            <div className={styles.divider} />
            <div className={styles.middleContainer}>
                <AdvancedDescription
                    description={formData.description}
                    initialJS={formData.initialJS}
                    initialCSS={formData.initialCSS}
                    initialHTML={formData.initialHTML}
                    onUpdate={handleAdvancedDescriptionUpdate}
                />
            </div>
            <div className={styles.divider} />
            <div className={styles.rightContainer}>
                <ProductIconManager
                    icon={formData.iconPreview || (typeof formData.icon === "string" ? formData.icon : "")}
                    label="Product Icon"
                    onUpload={(file: File) => {
                        const previewURL = URL.createObjectURL(file);

                        setFormData((prev) => ({
                            ...prev,
                            icon: file,
                            iconPreview: previewURL,
                        }));
                        console.log("Icon uploaded:", file);
                    }}
                />
                <button className={styles.saveButton} onClick={handleSave}>
                    Save
                </button>
            </div>
        </div>
    );
};

export default ProductMatrixTemplate;
