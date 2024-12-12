'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateProductManager } from "../../../store/productManagerSlice";
import { ProductManager } from '../../../../../types/productManager';
import styles from './component.module.css';
import AdvancedDescription from '../../AdvancedDescriptionEditor/component';
import { AppDispatch } from '@/app/store/store';

interface AdHocTemplateProps {
    productManager: ProductManager;
}

const AdHocTemplate: React.FC<AdHocTemplateProps> = ({ productManager }) => {
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
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSave = async () => {
        try {
            const { productType, _id } = productManager;
    
            const updatedData = { ...productManager, ...formData };
    
            console.log('Sending PATCH data:', updatedData);
    
            const response = await fetch(`/api/productManager/${productType}/${_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });
    
            if (response.ok) {
                const updatedProduct = await response.json();
                dispatch(updateProductManager(updatedProduct));
                alert('Product saved successfully!');
            } else {
                const error = await response.json();
                alert(`Error saving product: ${error.message}`);
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save the product. Please try again.');
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
                    });
                } else {
                    console.error('Failed to fetch product manager data');
                }
            } catch (error) {
                console.error('Error fetching product manager:', error);
            }
        };

        if (productManager) {
            fetchProductManager();
        }
    }, [productManager]);

    return (
        <div className={styles.container}>
            <h2>Product Information</h2>
            <table className={styles.table}>
                <tbody>
                    <tr>
                        <td>Product Name:</td>
                        <td>
                            <input type="text" value={productManager.name} readOnly />
                        </td>
                    </tr>
                    <tr>
                        <td>Display As:</td>
                        <td>
                            <input
                                type="text"
                                name="displayAs"
                                value={formData.displayAs || ''}
                                onChange={handleInputChange}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Product Id:</td>
                        <td>
                            <input
                                type="text"
                                name="productId"
                                value={formData.productId || ''}
                                onChange={handleInputChange}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Intent Range:</td>
                        <td>
                            <input
                                type="number"
                                name="intentRange"
                                value={formData.intentRange || 0}
                                onChange={handleInputChange}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Selector Mode:</td>
                        <td>
                            <select
                                name="selectorMode"
                                value={formData.selectorMode || ''}
                                onChange={handleInputChange}
                            >
                                <option value="default">Default</option>
                                <option value="custom">Custom</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Item Template:</td>
                        <td>
                            <input
                                type="text"
                                name="itemTemplate"
                                value={formData.itemTemplate || ''}
                                onChange={handleInputChange}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Description Footer:</td>
                        <td>
                            <input
                                type="text"
                                name="descriptionFooter"
                                value={formData.descriptionFooter || ''}
                                onChange={handleInputChange}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Initial Product Link:</td>
                        <td>
                            <input
                                type="text"
                                name="initialProductLink"
                                value={formData.initialProductLink || ''}
                                onChange={handleInputChange}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Buy Now Button Text:</td>
                        <td>
                            <input
                                type="text"
                                name="buyNowButtonText"
                                value={formData.buyNowButtonText || 'Order Now'}
                                onChange={handleInputChange}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className={styles.briefDescription}>
                <AdvancedDescription description=" " />
            </div>
            <form className={styles.productIcon}>
                <input type="file" />
                <input type="submit" value="Upload" />
            </form>
            <button className={styles.saveButton} onClick={handleSave}>
                Save
            </button>
        </div>
    );
};

export default AdHocTemplate;