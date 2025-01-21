export interface ProductManager {
    _id: string;
    name: string;
    managerId: string;
    productType: string;
    createdAt: string;
    isActive?: boolean;
    displayAs: string;
    productId: string;
    intentRange: number;
    selectorMode: string;
    itemTemplate: string;
    descriptionFooter: string;
    buyNowButtonText: string;
    description: string;
    initialHTML: string;
    initialJS: string;
    initialCSS: string;
    icon: string | File[];
    label: string;
    iconPreview?: string[];
    runManager?: boolean;
    targetValue: string;
    [key: string]: any;
}