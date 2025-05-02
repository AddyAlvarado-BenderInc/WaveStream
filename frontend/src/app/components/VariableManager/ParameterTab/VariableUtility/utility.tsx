export const cleanedInputValues = (object: any) => {
    if (!object || typeof object !== 'object') {
        return { value: '', detectVariables: [] };
    }

    const taskValue = object.task || '';
    const typeValue = object.type || '';

    const taskToKeys: Record<string, string[]> = {
        'Text Line': ['stringInput'],
        'Number': ['integerInput'],
        'Description': ['textareaInput'],
        'File Upload': ['linkedInput'],
    };

    const allowedKeys = taskToKeys[taskValue] || [];

    const filteredEntries = Object.entries(object)
        .filter(([key, value]) => {
            if (key === 'task' || key === 'type') return false;
            const isKeyAllowed = allowedKeys.includes(key);
            const isValueValid = value !== "" && value !== "0" && value !== false;
            return isKeyAllowed && isValueValid;
        });

    let value = `${taskValue}\n${typeValue}`;

    if (filteredEntries.length > 0) {
        const filteredObject = Object.fromEntries(filteredEntries);
        const otherValues = JSON.stringify(filteredObject, null, 2)
            .replace(/[{},"]/g, '')
            .trim();

        value += `\n\n${otherValues}`;
    }

    const inputNames = ['stringInput', 'integerInput', 'textareaInput', 'escapeSequence', 'linkedInput'];
    inputNames.forEach(name => {
        value = value.replace(new RegExp(`${name}:\\s?`, 'g'), '');
    });

    const detectVariables = value.match(/\%\w+/g) || [];
    return { value, detectVariables };
};

export const displayOnlyType = (value: string) => {
    const allowedKeys = [
        'Text Line',
        'Number',
        'Description',
        'Special Instructions',
        'File Upload',
        'String',
        'Integer',
        'Textarea',
        'EscapeSequence',
        'Linked'
    ];

    const keyPattern = new RegExp(
        `\\b(${allowedKeys.join('|')})\\b`,
        'gi'
    );

    const filteredParts = value
        .split(keyPattern)
        .filter(part => {
            const isAllowed = part && allowedKeys.includes(part.trim());
            return isAllowed;
        });

    return filteredParts.length > 0
        ? `${filteredParts[0]}${filteredParts.slice(1).map((p, i) =>
            i === 0 ? ` | ${p}` : ` ${p}`).join('')}`
        : '';
};

export const displayOnlyValue = (value: string) => {
    const removeKeys = [
        'Text Line',
        'Number',
        'Description',
        'Special Instructions',
        'File Upload',
        'String',
        'Integer',
        'Textarea',
        'EscapeSequence',
        'Linked'
    ];
    const keyPattern = new RegExp(
        `\\b(${removeKeys.join('|')})\\b`,
        'gi'
    );

    const filteredParts = value
        .split(keyPattern)
        .filter(part => {
            const isAllowed = part && removeKeys.includes(part.trim());
            return !isAllowed;
        });
    return filteredParts;
};

const canCombine = (tagsA: string[], tagsB: string[]): boolean => {
    const aIsEmpty = !tagsA || tagsA.length === 0;
    const bIsEmpty = !tagsB || tagsB.length === 0;
    const aHasAsterisk = tagsA && tagsA.includes('*');
    const bHasAsterisk = tagsB && tagsB.includes('*');

    if (aIsEmpty && bIsEmpty) {
        return true;
    }

    if (aIsEmpty && !bIsEmpty) {
        const result = !bHasAsterisk;
        return result;
    }
    if (!aIsEmpty && bIsEmpty) {
        const result = !aHasAsterisk;
        return result;
    }

    if (!aIsEmpty && !bIsEmpty) {
        const commonTagsExist = tagsA.some(tagA => tagA !== '*' && tagsB.includes(tagA));
        return commonTagsExist;
    }

    return false;
};

export const generateCombinations = (
    groupedParamsWithTags: Record<string, { value: string; tags: string[] }[]>
): Record<string, string>[] => {

    const variables = Object.keys(groupedParamsWithTags);
    if (variables.length === 0) {
        return [];
    }

    const results: Record<string, string>[] = [];

    const generate = (
        varIndex: number,
        currentCombination: Record<string, string>,
        currentCombinationTags: Record<string, string[]> 
    ) => {
        if (varIndex === variables.length) {
            results.push({ ...currentCombination });
            return;
        }

        const currentVariable = variables[varIndex];
        const itemsForCurrentVar = groupedParamsWithTags[currentVariable];

        itemsForCurrentVar.forEach(item => {
            let isCompatible = true;
            if (varIndex > 0) {
                 for (const existingVar in currentCombinationTags) {
                    if (!canCombine(item.tags, currentCombinationTags[existingVar])) {
                        isCompatible = false;
                        break; 
                    }
                }
            }

            if (isCompatible) {
                const nextCombination = {
                    ...currentCombination,
                    [currentVariable]: item.value 
                };
                const nextCombinationTags = {
                    ...currentCombinationTags,
                    [currentVariable]: item.tags
                };
                generate(varIndex + 1, nextCombination, nextCombinationTags);
            } else {
                console.log(`Skipping combination: Cannot add ${currentVariable}=${item.value} [${item.tags}] to`, currentCombination, currentCombinationTags);
            }
        });
    };
    generate(0, {}, {});

    console.log("generateCombinations Results:", results);
    return results;
};

/* const cartesianProduct = (arrays: string[][]): string[][] => {
    return arrays.reduce(
        (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
        [[]] as string[][]
    );
}; */

export const handleCreateName = (name: string) => {
    const cleanedName = name.replace(/[^a-zA-Z0-9]/g, '');
    return cleanedName;
};