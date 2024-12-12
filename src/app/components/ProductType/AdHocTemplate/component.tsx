import React, { useEffect, useState } from 'react';
import { ProductManager } from '../../../../../types/productManager';
import styles from './component.module.css';
import AdvancedDescription from '../../AdvancedDescriptionEditor/component';

interface AdHocTemplateProps {
    productManager: ProductManager;
}

const AdHocTemplate: React.FC<AdHocTemplateProps> = ({ productManager }) => {
    return (
        <div className={styles.container}>
            <h2>Product Information</h2>
            <table className={styles.table}>
                <td>
                    <tr>
                        <td>Product Name:</td>
                        <td>
                            <input type="text" value={productManager.name} readOnly />
                        </td>
                    </tr>
                    <tr>
                        <td>Display As:</td>
                        <td>
                            <input type="text" />
                        </td>
                    </tr>
                    <tr>
                        <td>Product Id:</td>
                        <td>
                            <input type="text" />
                        </td>
                    </tr>
                    <tr>
                        <td>Intent Range:</td>
                        <td>
                            <input type="text" />
                        </td>
                    </tr>
                    <tr>
                        <td>Selector Mode:</td>
                        <td>
                            <select>
                                <option value="default">Default</option>
                                <option value="custom">Custom</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td>Item Template:</td>
                        <td>
                            <input type="text" />
                        </td>
                    </tr>
                    <tr>
                        <td>Description Footer:</td>
                        <td>
                            <input type="text" />
                        </td>
                    </tr>
                    <tr>
                        <td>Initial Product Link:</td>
                        <td>
                            <input type="text" />
                        </td>
                    </tr>
                    <tr>
                        <td>Buy Now Button Text:</td>
                        <td>
                            <input type="text" />
                        </td>
                    </tr>
                </td>
            </table>
            <div className={styles.briefDescription}>
                <AdvancedDescription description=" " />
            </div>
            <form className={styles.productIcon}>
                <input type="file" />
                <input type="submit" value="Upload" />
            </form>
            <button className={styles.saveButton}>Save</button>
        </div>
    );
};

export default AdHocTemplate;
