import React from 'react';
import { ProductManager } from '../../../../../types/productManager';

interface ProductMatrixTemplateProps {
    productManager: ProductManager;
}

const AdHocTemplate: React.FC<ProductMatrixTemplateProps> = ({ productManager }) => {
    return (
        <div>
            <h2>Product Matrix Details</h2>
            <p>Manager Name: {productManager.name}</p>
            <p>Additional Product Matrix-specific information...</p>
        </div>
    );
};

export default AdHocTemplate;
