import { GetServerSideProps } from 'next';
import { ProductManager } from '../../../types/productManager';
import { Provider } from 'react-redux';
import { store } from '../../../src/app/store/store';
import style from './index.module.css';
import "../../../src/app/globals.css";
import dynamic from 'next/dynamic';

const WaveManager = dynamic<{ productManager: ProductManager }>(
    () => import('../../../src/app/components/WaveManager/component'),
    { ssr: false }
);

interface ProductTypePageProps {
    productManager: ProductManager | null;
    error: string | null;
}

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

export default function ProductTypePage({ productManager, error }: ProductTypePageProps) {
    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!productManager) {
        return <div>Loading...</div>;
    }

    return (
        <div className={style.page}>
            <header>
                <h1>{productManager.name}</h1>
                <p>{productManager._id}</p>
                <p>{productManager.productType}</p>
                <p>{new Date(productManager.createdAt).toLocaleDateString()}</p>
                <button onClick={() => window.history.back()}>Back</button>
            </header>
            <Provider store={store}>
                <div className={style.content}>
                    <WaveManager productManager={productManager} />
                </div>
            </Provider>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { productType, id } = context.params || {};

    if (!productType || !id) {
        return {
            props: {
                productManager: null,
                error: 'Invalid parameters.',
            },
        };
    }

    try {
        const res = await fetch(
            `${baseUrl}/api/productManager/${productType}/${id}`
        );
        if (!res.ok) {
            throw new Error('Failed to fetch product manager');
        }
        const productManager: ProductManager = await res.json();
        return { props: { productManager, error: null } };
    } catch (error: any) {
        return { props: { productManager: null, error: error.message } };
    }
};
