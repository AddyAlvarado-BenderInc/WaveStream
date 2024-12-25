import React from 'react';
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
    handleFieldSelect: (field: string) => void;
    productName: string;
}

const ProductInformationForm: React.FC<ProductInformationFormProps> = ({
    formData,
    handleInputChange,
    handleFieldSelect,
    productName,
}) => {
    const configIcon = "◉";

    const handleIconClick = (e: React.MouseEvent, field: string) => {
        e.stopPropagation();
        handleFieldSelect(field);
    };

    return (
        <div
            className={styles.container}
        >
            <header className={styles.header}>
                <h2>Product Information</h2>
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
                                onClick={(e) => handleIconClick(e, "Display As")}
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
                                onClick={(e) => handleIconClick(e, "Product Id")}
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
                                onClick={(e) => handleIconClick(e, "Item Template")}
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
                                onClick={(e) => handleIconClick(e, "Description Footer")}
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
                                onClick={(e) => handleIconClick(e, "Buy Now Button Text")}
                            >
                                {configIcon}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default ProductInformationForm;