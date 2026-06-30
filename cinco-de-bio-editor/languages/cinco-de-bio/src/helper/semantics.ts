export interface PortLike {
    name?: string;
    typeName?: string;
    isList?: boolean | string;
    list?: boolean | string;
}

export interface BranchLabelIssues {
    invalidLabels: string[];
    duplicateLabels: string[];
}

export function normalizeIsList(value: boolean | string | undefined): boolean {
    return value === true || value === 'true';
}

function portListValue(port: PortLike): boolean | string | undefined {
    return port.isList ?? port.list;
}

export function portSignature(port: PortLike): string {
    return `${port.name ?? ''} ${port.typeName ?? ''} ${normalizeIsList(portListValue(port)) ? 'list' : 'single'}`;
}

export function portsCompatible(source: PortLike, target: PortLike): boolean {
    return source.typeName === target.typeName && normalizeIsList(portListValue(source)) === normalizeIsList(portListValue(target));
}

export function startNodeCountIsValid(sibCount: number, noPredecessorCount: number): boolean {
    return sibCount === 0 || noPredecessorCount === 1;
}

export function branchLabelIssues(validBranches: string[] | undefined, outgoingLabels: Array<string | undefined>): BranchLabelIssues {
    const valid = validBranches ?? [];
    const labels = outgoingLabels.map(label => label ?? '');
    const invalidLabels = labels.filter(label => !valid.includes(label) && !(valid.length === 0 && label === ''));
    const duplicateLabels = Array.from(new Set(labels.filter((label, index) => labels.indexOf(label) !== index)));
    return { invalidLabels, duplicateLabels };
}

export function stablePropertiesSignature(properties: { [key: string]: unknown } | undefined): string {
    const safeProperties = properties ?? {};
    const entries = Object.keys(safeProperties)
        .sort()
        .map(key => [key, safeProperties[key]]);
    return JSON.stringify(entries);
}

export function containmentSignature(kind: string, properties: { [key: string]: unknown } | undefined): string {
    return `${kind}:${stablePropertiesSignature(properties)}`;
}