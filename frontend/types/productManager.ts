export interface IconData {
    filename: string;
    url: string;
}

export interface tableSheetData {
    index: number;
    value: string;
    isOrigin: boolean;
}

export interface tableCellData {
    classKey: string;
    index: number;
    value: any;
    isComposite: boolean;
    isDefault?: boolean;
    isPackage: boolean;
}

export interface mainKeyString {
    type: string;
    value: string;
}

export interface variableClassArray {
    dataId: number;
    name: string;
    dataLength: number;
    variableData: Record<string, {
        dataId: number;
        value: any;
    } | null>;
}

export interface variablePackageArray {
    dataId: number;
    name: string;
    dataLength: number; 
    variableData: Record<string, {
        dataId: number;
        value: {
            filename: string[];
            url: string[];
        };
    } | null>;
}

export interface IGlobalVariablePackage {
    dataId: number;
    name?: string;
    dataLength?: number;
    variableData?: Map<string, {
        dataId?: number;
        value: string;
    }>;
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
    tableCellData: tableCellData[];
    variableClass: string[];
    variabelClassArray: variableClassArray;
    variablePackageArray: variablePackageArray;
    mainKeyString: mainKeyString[];
}