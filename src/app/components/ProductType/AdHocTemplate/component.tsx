import React from 'react';
import { ProductManager } from '../../../../../types/productManager';

interface AdHocTemplateProps {
    productManager: ProductManager;
}

const AdHocTemplate: React.FC<AdHocTemplateProps> = ({ productManager }) => {
    return (
        <div>
            <h2>Ad Hoc Product Details</h2>
            <p>Manager Name: {productManager.name}</p>
            <p>Additional Ad Hoc-specific information...</p>
        </div>
    );
};

export default AdHocTemplate;
