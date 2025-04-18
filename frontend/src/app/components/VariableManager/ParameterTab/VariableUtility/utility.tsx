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
        'Special Instructions': ['escapeSequence'],
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

export const generateCombinations = (groupedParams: Record<string, string[]>) => {
    const keys = Object.keys(groupedParams);
    const values = keys.map((key) => groupedParams[key]);
    const combinations = cartesianProduct(values);

    return combinations.map((combo) => {
        const result: Record<string, string> = {};
        keys.forEach((key, index) => {
            result[key] = combo[index];
        });
        return result;
    });
};

const cartesianProduct = (arrays: string[][]): string[][] => {
    return arrays.reduce(
        (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
        [[]] as string[][]
    );
};

export const handleCreateName = (name: string) => {
    const cleanedName = name.replace(/[^a-zA-Z0-9]/g, '');
    return cleanedName;
};