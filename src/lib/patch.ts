export function buildPatch<T extends Record<string, any>>(
    original: T,
    next: T
): Partial<T> {
    const patch: Partial<T> = {};
    (Object.keys(next) as (keyof T)[]).forEach((k) => {
        const a = original[k];
        const b = next[k];
        const aJson = typeof a === "object" ? JSON.stringify(a) : String(a);
        const bJson = typeof b === "object" ? JSON.stringify(b) : String(b);
        if (aJson !== bJson) {
            patch[k] = b;
        }
    });
    return patch;
}

