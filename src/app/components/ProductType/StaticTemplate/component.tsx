import React from 'react';
import { ProductManager } from '../../../../../types/productManager';

interface StaticTemplateProps {
    productManager: ProductManager;
}

const AdHocTemplate: React.FC<StaticTemplateProps> = ({ productManager }) => {
    return (
        <div>
            <h2>Static Product Details</h2>
            <p>Manager Name: {productManager.name}</p>
            <p>Additional Static Product-specific information...</p>
        </div>
    );
};

export default AdHocTemplate;
