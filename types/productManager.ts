export interface ProductManager {
    _id: string;
    name: string;
    productType: string;
    createdAt: string;
    isActive?: boolean;
    displayAs: string;
    productId: string;
    intentRange: number;
    selectorMode: string;
    itemTemplate: string;
    descriptionFooter: string;
    initialProductLink: string;
    buyNowButtonText: string;
}