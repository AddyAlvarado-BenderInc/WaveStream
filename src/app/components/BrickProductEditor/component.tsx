import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import styles from './component.module.css';
import { AppDispatch } from '@/app/store/store';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ProductManager } from '../../../../types/productManager';

interface BrickEditorProps {
    productManager: ProductManager
}

const BrickEditor: React.FC<BrickEditorProps> = ({ productManager }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [formData, setFormData] = useState({
        displayAs: productManager.displayAs || '',
        productId: productManager.productId || '',
        intentRange: productManager.intentRange || '',
        selectorMode: productManager.selectorMode || 'default',
        itemTemplate: productManager.itemTemplate || '',
        descriptionFooter: productManager.descriptionFooter || '',
        buyNowButtonText: productManager.buyNowButtonText || '',
        description: productManager.description || '',
        initialJS: productManager.initialJS || '',
        initialCSS: productManager.initialCSS || '',
        initialHTML: productManager.initialHTML || '',
        icon: productManager.icon || '',
        label: productManager.label || '',
        iconPreview: productManager.iconPreview || null,
    });
    return (
        <></>
    )
}

export default BrickEditor;