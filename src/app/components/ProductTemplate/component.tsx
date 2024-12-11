import React from 'react';
import style from './component.module.css';

interface ProductManager {
  _id: string;
  name: string;
  productType: string;
  createdAt: string;
  isActive?: boolean;
}

interface ProductTemplateProps {
  manager: ProductManager;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({ manager, onClick, onDelete, onToggleActive }) => {
  return (
    <div className={style.productTemplate}>
      <h3 className={style.managerAccess} onClick={() => onClick(manager._id)}>{manager.name}</h3>
      <p>ID: {manager._id}</p>
      <p>
        Type: 
        {manager.productType === "Ad-Hoc" && <i className="fas fa-random"></i>}
        {manager.productType === "Static" && <i className="fas fa-anchor"></i>}
        {manager.productType === "Product Matrix" && <i className="fas fa-th"></i>}
        {manager.productType}
      </p>
      <p>Created: {new Date(manager.createdAt).toLocaleDateString()}</p>
      <div className={style.status}>
        <button className={style.button} onClick={() => onDelete(manager._id)}>Delete</button>
        <button className={style.button} onClick={() => onToggleActive(manager._id, !manager.isActive)}>
          {manager.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
};

export default ProductTemplate;