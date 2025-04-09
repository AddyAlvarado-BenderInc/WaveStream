import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store/store';
import { updateProductManager } from "../../store/productManagerSlice";
import { ProductManager, IconData } from '../../../../types/productManager';
import PropertyInterfaceTable from '../PropertyInterfaces/component';
import VariableManager from '../VariableManager/component';
import { BASE_URL } from '../../config';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface WaveManagerProps {
    productManager: ProductManager;
}

const WaveManager: React.FC<WaveManagerProps> = ({ productManager }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [formData, setFormData] = useState({
        itemName: productManager.itemName || '',
        productId: productManager.productId || '',
        description: productManager.description,
        initialJS: productManager.initialJS || '',
        initialCSS: productManager.initialCSS || '',
        initialHTML: productManager.initialHTML || '',
        label: productManager.label || '',
    });
    const [iconData, setIconData] = useState({
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
    const [variableData, setVariableData] = useState({
        tableSheet: (productManager.tableSheet)
    })

    const [showPropertyInterfaces, setShowPropertyInterfaces] = useState(false);

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

            iconData.icon.forEach(icon => {
                formDataPayload.append('icons', icon.filename);
            });

            iconData.newFiles.forEach(file => {
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

                setIconData((prev) => ({
                    ...prev,
                    icon: updatedProduct.icon,
                    iconPreview: updatedProduct.icon,
                    newFiles: []
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
            const controller = new AbortController();
            try {
                const response = await fetch(
                    `${BASE_URL}/api/productManager/${productManager.productType}/${productManager._id}`,
                    { signal: controller.signal }    
                );
                if (response.ok) {
                    const data = await response.json();
                    console.log('Fetched Product Manager:', data);
                    const icons = Array.isArray(data.icon)
                        ? data.icon.map((filename: string) =>
                            `${BASE_URL}/api/files/${encodeURIComponent(filename)}`
                        )
                        : [];

                    setFormData({
                        itemName: data.itemName || '',
                        productId: data.productId || '',
                        description: data.description || '',
                        initialJS: data.initialJS || '',
                        initialCSS: data.initialCSS || '',
                        initialHTML: data.initialHTML || '',
                        label: data.label || '',
                    });
                    setIconData({
                        iconPreview: icons,
                        icon: data.icon || [],
                        newFiles: []
                    });
                } else {
                    console.error('Failed to fetch product manager data');
                }
            } catch (error) {
                if (controller.signal.aborted) {
                    console.log('Fetch aborted');
                } else {
                    console.error('Error fetching product manager:', error);
                }
            }
            return () => controller.abort();
        };

        fetchProductManager();
    }, [productManager.productType, productManager._id]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.buttonContainer}>
                    <button
                        className={styles.propertyInterfacesButton}
                        onClick={() => setShowPropertyInterfaces(!showPropertyInterfaces)}
                    >
                        {showPropertyInterfaces ? 'Close Property Interfaces' : 'Open Property Interfaces'}
                    </button>
                    <button className={styles.saveButton} onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
            <VariableManager />
            {showPropertyInterfaces && (
                <div className={styles.propertyInterfacesContainer}>
                    {showPropertyInterfaces && (
                        <div className={styles.propertyInterfacesContainer}>
                            <PropertyInterfaceTable
                                productManager={productManager}
                                formData={formData}
                                setFormData={setFormData}
                                iconData={iconData}
                                setIconData={setIconData}
                            />
                        </div>
                    )}
                </div>
            )}
            <div className={styles.divider} />
            <ToastContainer />
        </div>
    );
};

export default WaveManager;