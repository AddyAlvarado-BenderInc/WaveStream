import { variablePackageArray, IGlobalVariablePackage } from "../../../types/productManager";

export function convertToTableFormat(sourcePkg: variablePackageArray | null | undefined): IGlobalVariablePackage | null {
    if (!sourcePkg || typeof sourcePkg.dataId !== 'number') {
        return null;
    }

    let variableDataAsMap = new Map<string, { dataId?: number; value: string; }>();

    if (sourcePkg.variableData && typeof sourcePkg.variableData === 'object' && !(sourcePkg.variableData instanceof Map)) {
        for (const [entryKey, entryValue] of Object.entries(sourcePkg.variableData)) {
            if (entryValue && entryValue.value !== null && entryValue.value !== undefined) {
                try {
                    const valueToStore = typeof entryValue.value === 'string'
                        ? entryValue.value 
                        : JSON.stringify(entryValue.value); 

                    variableDataAsMap.set(entryKey, {
                        dataId: entryValue.dataId,
                        value: valueToStore
                    });
                } catch (e) {
                    console.error(`convertToTableFormat: Error processing value for key ${entryKey} in package ${sourcePkg.dataId}`, e, entryValue.value);
                }
            } else if (entryValue === null) {
                 console.warn(`convertToTableFormat: Null entry found for key ${entryKey} in package ${sourcePkg.dataId}`);
            }
        }
    } else {
        console.warn(`convertToTableFormat: sourcePkg.variableData was not a processable object for package ${sourcePkg.dataId}.`);
   }

   console.log(`convertToTableFormat DEBUG: Returning for ${sourcePkg.dataId}, Map:`, variableDataAsMap);

    return {
        dataId: sourcePkg.dataId,
        name: sourcePkg.name,
        dataLength: sourcePkg.dataLength,
        variableData: variableDataAsMap,
    };
}

export function convertToSaveFormat(tablePkg: IGlobalVariablePackage | null | undefined): variablePackageArray | null {
     if (!tablePkg || typeof tablePkg.dataId !== 'number') {
        return null;
    }

    const variableDataAsRecord: variablePackageArray['variableData'] = {};

     if (tablePkg.variableData instanceof Map) {
         tablePkg.variableData.forEach((mapValue, mapKey) => {
             if (mapValue && typeof mapValue.value === 'string') {
                 try {
                     const parsedValueObject = JSON.parse(mapValue.value);
                     variableDataAsRecord[mapKey] = {
                         dataId: typeof mapValue.dataId === 'number' ? mapValue.dataId : 0,
                         value: parsedValueObject, 
                     };
                 } catch (e) {
                     console.error(`convertToSaveFormat: Error parsing value for key ${mapKey} in package ${tablePkg.dataId}`, e);
                     variableDataAsRecord[mapKey] = null;
                 }
             } else {
                  variableDataAsRecord[mapKey] = null; 
             }
         });
     }

     return {
        dataId: tablePkg.dataId,
        name: tablePkg.name || "",
        dataLength: tablePkg.dataLength || 0,
        variableData: variableDataAsRecord,
     };
}
