/**
 * Creates a deep clone of an object, ensuring no references are shared
 * and removing any non-serializable values (like functions)
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        if (typeof obj !== 'object') {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => deepClone(item)) as unknown as T;
        }
        
        const result = {} as T;
        Object.keys(obj as object).forEach(key => {
            const value = (obj as any)[key];
            if (typeof value !== 'function') {
                (result as any)[key] = deepClone(value);
            }
        });
        
        return result;
    }
}