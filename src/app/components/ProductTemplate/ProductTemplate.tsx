import React from 'react';
import c from './ProductTemplate.module.css';

interface ProductTemplateProps {
  manager: {
    _id: string;
    name: string;
    createdAt: string;
  };
  onClick: (id: string) => void;
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({ manager, onClick }) => {
  return (
    <div className={c.productTemplate} onClick={() => onClick(manager._id)}>
      <h3>{manager.name}</h3>
      <p>ID: {manager._id}</p>
      <p>Created: {new Date(manager.createdAt).toLocaleDateString()}</p>
    </div>
  );
};

export default ProductTemplate;