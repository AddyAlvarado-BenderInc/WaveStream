import React, { useState } from 'react';
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
    icon: string[];
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const mainIcon = icon.length > 0 
    ? `${process.env.NEXTAUTH_URL}/api/files/${encodeURIComponent(icon[0])}`
    : iconDefault;

    const ConfirmationModal: React.FC<{
        show: boolean;
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    }> = ({ show, message, onConfirm, onCancel }) => {
        if (!show) return null;

        return (
            <div
                className={style.modalOverlay}
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <div
                    className={style.modal}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <h3>Confirm Action</h3>
                    <p>{message}</p>
                    <div className={style.modalActions}>
                        <button className={style.button} onClick={onConfirm}>
                            Confirm
                        </button>
                        <button className={style.button} onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    };


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
                        src={mainIcon}
                        alt={icon.length > 0 ? `Product Icon: ${name}` : "No icon available"}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = iconDefault;
                        }}
                    />
                    {icon.length > 1 && (
                        <div className={style.badge}>
                            +{icon.length - 1}
                        </div>
                    )}
                </div>
            </div>
            <div className={style.status}>
                <button
                    className={style.button}
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
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
            <ConfirmationModal
                show={showDeleteConfirm}
                message="Are you sure you want to delete this manager? This action cannot be undone."
                onConfirm={() => onDelete(_id, productType)}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div>
    );
};

export default ProductTemplate;