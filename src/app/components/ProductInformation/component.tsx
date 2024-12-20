import React, { useState } from 'react';
import ConfigModal from './config/config';
import styles from './component.module.css';

interface ProductInformationFormProps {
    formData: {
        displayAs: string;
        productId: string;
        intentRange: number | string;
        selectorMode: string;
        itemTemplate: string;
        descriptionFooter: string;
        buyNowButtonText: string;
    };
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    productName: string;
    handleOpenConfigModal: (field: string) => void;
}

const ProductInformationForm: React.FC<ProductInformationFormProps> = ({
    formData,
    handleInputChange,
    productName,
}) => {
    const [activeField, setActiveField] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openConfigModal = (field: string) => {
        setActiveField(field);
        setIsModalOpen(true);
    };

    const closeConfigModal = () => {
        setActiveField(null);
        setIsModalOpen(false);
    };

    const configIcon = "◉";

    return (
        <div>
            <header className={styles.header}>
                <h2>Product Information</h2>
                <button
                    type="button"
                    className={styles.button}
                    onClick={() => openConfigModal("global")}
                >
                    configure {configIcon}
                </button>
            </header>
            <table className={styles.table}>
                <tbody>
                    <tr>
                        <td>Product Name</td>
                        <td>
                            <input type="text" value={productName} readOnly />
                        </td>
                    </tr>
                    <tr>
                        <td>Display As</td>
                        <td>
                            <input
                                type="text"
                                name="displayAs"
                                value={formData.displayAs}
                                onChange={handleInputChange}
                            />
                        </td>
                        <td>
                            <button
                                className={styles.iconButton}
                                onClick={() => openConfigModal("displayAs")}
                            >
                                {configIcon}
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td>Product Id</td>
                        <td>
                            <input
                                type="text"
                                name="productId"
                                value={formData.productId}
                                onChange={handleInputChange}
                            />
                        </td>
                        <td>
                            <button
                                className={styles.iconButton}
                                onClick={() => openConfigModal("productId")}
                            >
                                {configIcon}
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td>Intent Range</td>
                        <td>
                            <input
                                type="number"
                                name="intentRange"
                                value={formData.intentRange}
                                onChange={handleInputChange}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Selector Mode</td>
                        <td>
                            <select
                                name="selectorMode"
                                value={formData.selectorMode}
                                onChange={handleInputChange}
                            >
                                <option value="default">Default</option>
                                <option value="custom">Custom</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Item Template</td>
                        <td>
                            <input
                                type="text"
                                name="itemTemplate"
                                value={formData.itemTemplate}
                                onChange={handleInputChange}
                            />
                        </td>
                        <td>
                            <button
                                className={styles.iconButton}
                                onClick={() => openConfigModal("itemTemplate")}
                            >
                                {configIcon}
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td>Description Footer</td>
                        <td>
                            <input
                                type="text"
                                name="descriptionFooter"
                                value={formData.descriptionFooter}
                                onChange={handleInputChange}
                            />
                        </td>
                        <td>
                            <button
                                className={styles.iconButton}
                                onClick={() => openConfigModal("descriptionFooter")}
                            >
                                {configIcon}
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <td>Buy Now Button Text</td>
                        <td>
                            <input
                                type="text"
                                name="buyNowButtonText"
                                value={formData.buyNowButtonText}
                                onChange={handleInputChange}
                            />
                        </td>
                        <td>
                            <button
                                className={styles.iconButton}
                                onClick={() => openConfigModal("buyNowButtonText")}
                            >
                                {configIcon}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
            {isModalOpen && (
                <ConfigModal
                    field={activeField}
                    value={formData[activeField as keyof typeof formData] || ""}
                    onClose={closeConfigModal}
                />
            )}
        </div>
    );
};

export default ProductInformationForm;
