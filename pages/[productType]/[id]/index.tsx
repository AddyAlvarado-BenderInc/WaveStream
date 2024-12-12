import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { ProductManager } from '../../../types/productManager';
import AdHocTemplate from '../../../src/app/components/ProductType/AdHocTemplate/component';
import ProductMatrixTemplate from '../../../src/app/components/ProductType/ProductMatrixTemplate/component';
import StaticTemplate from '../../../src/app/components/ProductType/StaticTemplate/component';
import style from './index.module.css';
import "../../../src/app/globals.css";

export default function ProductTypePage() {
    const router = useRouter();
    const { productType, id } = router.query;

    const [productManager, setProductManager] = useState<ProductManager | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (productType && id) {
            fetch(`/api/productManager/${productType}/${id}`)
                .then((res) => {
                    if (!res.ok) throw new Error('Failed to fetch product manager');
                    return res.json();
                })
                .then((data) => setProductManager(data))
                .catch((err) => setError(err.message));
        }
    }, [productType, id]);

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!productManager) {
        return <div>Loading...</div>;
    }

    const renderProductType = () => {
        switch (productManager.productType) {
            case 'Ad-Hoc':
                return <AdHocTemplate productManager={productManager} />;
            case 'ProductMatrix':
                return <ProductMatrixTemplate productManager={productManager} />;
            case 'Static':
                return <StaticTemplate productManager={productManager} />;
            default:
                return <div>Unknown product type: {productManager.productType}</div>;
        }
    };

    return (
        <div className={style.page}>
            <header>
                <h1>{productManager.name}</h1>
                <p>{productManager._id}</p>
                <p>{productManager.productType}</p>
                <p>{new Date(productManager.createdAt).toLocaleDateString()}</p>
                <button onClick={() => router.back()}>Back</button>
            </header>
            <div className={style.content}>
                {renderProductType()}
            </div>
        </div>
    );
}
