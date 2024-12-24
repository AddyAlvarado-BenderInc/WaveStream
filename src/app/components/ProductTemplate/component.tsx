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
  const {
      _id,
      name,
      productType,
      createdAt,
      isActive = false,
      intentRange = 'N/A',
      selectorMode = 'N/A',
      icon = iconDefault,
      descriptionFooter = '',
      displayAs = '',
  } = manager;

  return (
      <div className={style.productTemplate} onClick={() => router.push(`/${productType}/${_id}`)}>
          <h3 className={style.managerAccess}>{name}</h3>
          <div className={style.managerInfo}>
              <div className={style.divider}>
                  <p>ID: {_id}</p>
                  <p>Display As: {displayAs}</p>
                  <p>Type: <span className={style.productType}>{productType}</span></p>
                  <p>Intent range: {intentRange}</p>
                  <p>Selector mode: {selectorMode}</p>
                  <p>Created: {new Date(createdAt).toLocaleDateString()}</p>
                  <p>Footer Description: {descriptionFooter}</p>
              </div>
              <div className={style.divider}>
                  <img
                      className={style.icon}
                      src={icon.startsWith('/uploads/') ? icon : iconDefault}
                      alt={icon ? `Product Icon: ${name}` : "No icon available"}
                  />
              </div>
          </div>
          <div className={style.status}>
              <button
                  className={style.button}
                  onClick={(e) => {
                      e.stopPropagation();
                      onDelete(_id, productType);
                  }}
              >
                  Delete
              </button>
              <button
                  className={style.button}
                  onClick={(e) => {
                      e.stopPropagation();
                      onToggleActive(_id, !isActive);
                  }}
              >
                  {isActive ? 'Deactivate' : 'Activate'}
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