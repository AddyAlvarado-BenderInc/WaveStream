import React from 'react';
import style from './component.module.css';

interface ProductManager {
  _id: string;
  name: string;
  productType: string;
  createdAt: string;
  isActive?: boolean;
  intentRange?: string;
  selectorMode?: string;
  iconPreview?: string;
}

interface ProductTemplateProps {
  manager: ProductManager;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const iconDefault = 'https://via.placeholder.com/200x300/png';

const ProductTemplate: React.FC<ProductTemplateProps> = ({ manager, onClick, onDelete, onToggleActive }) => {
  return (
    <div className={style.productTemplate} onClick={() => onClick(manager._id)}>
      <h3 className={style.managerAccess}>{manager.name}</h3>
      <div className={style.managerInfo}>
        <div className={style.divider}>
          {/* 
      TODO: manager info will be filled with other information such as: 
      intent-range (defines how many items will be selected), 
      selector mode (defines the broad selector of the product multiple), 
      and icon preview. These values will be passed from the individual products.
          */}
          <p>ID: {manager._id}</p>
          <p>
            Type: <span className={style.productType}>{manager.productType}</span>
          </p>
          <p>Intent range: {manager.intentRange}</p>
          <p>Selector mode: {manager.selectorMode}</p>
          <p>Created: {new Date(manager.createdAt).toLocaleDateString()}</p>
        </div>
        <div className={style.divider}>
            <img className={style.icon}
            src={ manager.iconPreview || iconDefault } 
            alt={ manager.iconPreview ? `Product Icon: ${manager.iconPreview}` : "No icon available" } 
            /> {/* TODO: Replace with actual icon */}
        </div>
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