import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/store/store';
import { updateProductManager } from "../../store/productManagerSlice";
import { ProductManager, IconData, tableSheetData } from '../../../../types/productManager';
import VariableManager from '../VariableManager/component';
import PropertyInterfaceTable from '../PropertyInterfaces/component';
import { BASE_URL } from '../../config';
import styles from './component.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface VariableDataState {
    tableSheet: tableSheetData[];
    variableClass: string[];
    mainKeyString: [string, any][];
}

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
    const [variableData, setVariableData] = useState<VariableDataState>({
        tableSheet: Array.isArray(productManager.tableSheet)
            ? productManager.tableSheet.map((value, index) => ({
                  index,
                  value: value.value,
                  isOrigin: false,
              }))
            : [],
        variableClass: productManager.variableClass || [],
        mainKeyString: productManager.mainKeyString || [],
    });

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
    
            if (Array.isArray(variableData.tableSheet) && variableData.tableSheet.length > 0) {
                variableData.tableSheet.forEach((item) => {
                    formDataPayload.append('tableSheet', item.index.toString());
                    formDataPayload.append('tableSheet', item.value);
                    formDataPayload.append('tableSheet', item.isOrigin.valueOf().toString());
                });
            };
    
            if (variableData.mainKeyString && variableData.mainKeyString.length > 0) {
                formDataPayload.append('mainKeyString', JSON.stringify(variableData.mainKeyString));
            } else {
                formDataPayload.append('mainKeyString', JSON.stringify([]));
            }
    
            variableData.variableClass.forEach(([key, value]) => {
                if (key === 'variable' || key === 'name' || key === 'value') return;
    
                if (value !== null && value !== undefined) {
                    if (Array.isArray(value)) {
                        formDataPayload.append(key, JSON.stringify(value));
                    } else {
                        formDataPayload.append(key, value);
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
    
                setVariableData((prev) => ({
                    ...prev,
                    tableSheet: Array.isArray(updatedProduct.tableSheet)
                        ? updatedProduct.tableSheet.map((value: string, index: number) => ({
                              index,
                              value: value,
                              isOrigin: false,
                          }))
                        : prev.tableSheet,
                    variableClass: updatedProduct.variableClass || prev.variableClass,
                    mainKeyString: updatedProduct.mainKeyString || prev.mainKeyString,
                }));
    
                dispatch(updateProductManager(updatedProduct));
                toast.success('Product saved successfully!', {
                    position: 'bottom-right',
                    autoClose: 5000,
                });
            } else {
                const error = await response.json();
                toast.error(`Error saving product: ${error.message}`, {
                    position: 'bottom-right',
                    autoClose: 5000,
                });
            }
        } catch (error) {
            toast.error('Failed to save the product. Please try again.');
        }
    };

    const [showPropertyInterfaces, setShowPropertyInterfaces] = useState(false);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.buttonContainer}>
                    <button
                        className={styles.propertyInterfacesButton}
                        onClick={() => setShowPropertyInterfaces(!showPropertyInterfaces)}
                    >
                        {showPropertyInterfaces ? 'Close Property Interface' : 'Open Property Interface'}
                    </button>
                    <button className={styles.saveButton} onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
            <VariableManager
                productManager={productManager}
                variableData={variableData}
                setVariableData={setVariableData}
            />
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
            <div className={styles.divider} />
            <ToastContainer />
        </div>
    );
};

export default WaveManager;