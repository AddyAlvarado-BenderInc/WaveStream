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
    <div className={style.productTemplate} onClick={() => onClick(manager._id)}>
      <h3 className={style.managerAccess}>{manager.name}</h3>
      <div className={style.managerInfo}>
        <p>ID: {manager._id}</p>
        <p>
          Type: <span className={style.productType}>{manager.productType}</span>
        </p>
        <p>Created: {new Date(manager.createdAt).toLocaleDateString()}</p>
      </div>
      <div className={style.status}>
        <button
          className={style.button}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(manager._id);
          }}
        >
          Delete
        </button>
        <button
          className={style.button}
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(manager._id, !manager.isActive);
          }}
        >
          {manager.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
};


export default ProductTemplate;