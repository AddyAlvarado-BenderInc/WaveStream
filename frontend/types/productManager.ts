export interface IconData {
    filename: string;
    url: string;
}

export interface tableSheetData {
    index: number;
    value: string;
    isOrigin: boolean;
}

export interface ProductManager {
    _id: string;
    name: string;
    managerId: string;
    productType: string;
    createdAt: string;
    isActive?: boolean;
    itemName?: string;
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
    icon: IconData[];
    iconPreview: IconData[];
    label: string;
    runManager?: boolean;
    targetValue: string;
    [key: string]: any;
    tableSheet: tableSheetData[];
    variableClass: string[];
    mainKeyString: [string, any][];
}