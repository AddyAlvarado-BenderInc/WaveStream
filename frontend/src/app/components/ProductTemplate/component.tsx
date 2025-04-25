import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import style from './component.module.css';
import dotenv from 'dotenv';
import path from "path";

dotenv.config({
    path: path.resolve(process.cwd(), '../../../../', '.env')
});

console.log("HERE IS OUR AUTHORIZED URL: ", process.env.NEXTAUTH_URL);

interface ProductManager {
    _id: string;
    name: string;
    itemName?: string;
    productType: string;
    createdAt: string;
    isActive?: boolean;
    intentRange?: string;
    selectorMode?: string;
    descriptionFooter: string;
    label: string;
    displayAs: string;
}

interface ProductTemplateProps {
    manager: ProductManager;
    onClick: (id: string) => void;
    onDelete: (id: string, productType: string) => void;
    onEditName: (id: string, newName: string) => void;
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({ manager, onDelete, onEditName }) => {
    const router = useRouter();
    const {
        _id,
        name,
        productType,
        createdAt,
        isActive = false,
    } = manager;
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditNameModal, setShowEditNameModal] = useState(false);

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

    const EditNameModal: React.FC<{
        show: boolean;
        onEditName: (id: string, newName: string) => void;
        onClose: () => void;
        setShowEditNameModal: React.Dispatch<React.SetStateAction<boolean>>;
        name: string;
        _id: string;
    }> = ({ show, onEditName, onClose, setShowEditNameModal, name, _id }) => {
        const [newName, setNewName] = useState(name);

        if (!show) return null;

        const handleEditName = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            onEditName(_id, newName);
            setShowEditNameModal(false);
        };

        return (
            <div className={style.modalOverlay}>
                <div className={style.modal}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <h3>Edit Name</h3>
                    <form
                        onSubmit={handleEditName}
                    >
                        <input
                            type="text"
                            placeholder="New Name"
                            onClick={(e) => e.stopPropagation()}
                            value={newName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setNewName(e.target.value);
                            }}
                        />
                        <button
                            className={style.button}
                            onSubmit={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            Save
                        </button>
                        <button
                            className={style.button}
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                        >
                            Close
                        </button>
                    </form>
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
                    <p>Created: {new Date(createdAt).toLocaleDateString()}</p>
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
                        setShowEditNameModal(true);
                    }}
                >
                    Rename
                </button>
                <button
                    className={style.button}
                    onClick={(e) => {
                        e.stopPropagation();
                        alert('Duplicate functionality not implemented yet.');
                    }}
                >
                    Duplicate
                </button>
            </div>
            <ConfirmationModal
                show={showDeleteConfirm}
                message="Are you sure you want to delete this manager? This action cannot be undone."
                onConfirm={() => onDelete(_id, productType)}
                onCancel={() => setShowDeleteConfirm(false)}
            />
            <EditNameModal
                show={showEditNameModal}
                name={name}
                _id={_id}
                onEditName={onEditName}
                onClose={() => setShowEditNameModal(false)}
                setShowEditNameModal={setShowEditNameModal}
            />
        </div>
    );
};

export default ProductTemplate;