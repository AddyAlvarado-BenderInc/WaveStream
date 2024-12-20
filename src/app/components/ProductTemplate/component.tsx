import React from 'react';
import { useRouter } from 'next/navigation';
import style from './component.module.css';

interface ProductManager {
  _id: string;
  name: string;
  productType: string;
  createdAt: string;
  isActive?: boolean;
  intentRange?: string;
  selectorMode?: string;
  icon: string;
  descriptionFooter: string;
  label: string;
  displayAs: string;
  runManager: boolean;
}

interface ProductTemplateProps {
  manager: ProductManager;
  onClick: (id: string) => void;
  onDelete: (id: string, productType: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const iconDefault = 'https://placehold.co/200x200';

const ProductTemplate: React.FC<ProductTemplateProps> = ({ manager, onDelete, onToggleActive }) => {
  const router = useRouter();
  return (
    <div className={style.productTemplate}
      onClick={() => router.push(`/${manager.productType}/${manager._id}`)}>
      <h3 className={style.managerAccess}>{manager.name}</h3>
      <div className={style.managerInfo}>
        <div className={style.divider}>
          <p>ID: {manager._id}</p>
          <p>Display As: {manager.displayAs}</p>
          <p>Type: <span className={style.productType}>{manager.productType}</span></p>
          <p>Intent range: {manager.intentRange ? manager.intentRange : "N/A"}</p>
          <p>Selector mode: {manager.selectorMode ? manager.selectorMode : "N/A"}</p>
          <p>Created: {new Date(manager.createdAt).toLocaleDateString()}</p>
          <p>Footer Description: {manager.descriptionFooter}</p>
        </div>
        <div className={style.divider}>
          <img
            className={style.icon}
            src={manager.icon.startsWith('/uploads/')
              ? manager.icon
              : iconDefault}
            alt={manager.icon ? `Product Icon: ${manager.name}` : "No icon available"}
          />
        </div>
      </div>
      <div className={style.status}>
        <button
          className={style.button}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(manager._id, manager.productType);
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
        <button 
          className={style.runButton}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          Run
        </button>
      </div>
    </div>
  );
};


export default ProductTemplate;