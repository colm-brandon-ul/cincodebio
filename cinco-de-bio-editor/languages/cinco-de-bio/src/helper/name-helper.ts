
export const wordList = [
    'crop', 'resize', 'rotate', 'blur', 'sharpen', 'filter', 'transform', 'overlay',
    'compose', 'extract', 'mask', 'colorize', 'grayscale', 'invert', 'adjust', 'enhance',
    'optimize', 'compress', 'convert', 'batch', 'automate', 'process', 'analyze', 'detect',
    'recognize', 'classify', 'segment', 'track', 'measure', 'monitor', 'visualize',
    'generate', 'synthesize', 'manipulate', 'simulate', 'emulate', 'integrate', 'automate'
];

const nodeWordList = [
    'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew',
    'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'peach', 'quince', 'raspberry',
    'strawberry', 'tangerine', 'watermelon', 'zucchini'
];

export function getRandomDescriptiveWord(): string {
    return wordList[Math.floor(Math.random() * wordList.length)];
}

export const prefixes = [
    'I', 'T', 'C', 'A', 'E', 'S', 'P', 'M', 'D', 'N', 'B', 'F', 'H', 'J', 'L', 'R', 'V', 'X', 'Z'
];

export const suffixes = [
    'Manager', 'Service', 'Handler', 'Builder', 'Factory', 'Processor', 'Analyzer',
    'Adapter', 'Resolver', 'Provider', 'Transformer', 'Validator', 'Renderer', 'Engine'
];

export function getRandomTypeName(): string {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix}${suffix}`;
}


export function getRandomWord(): string {
    const randomIndex = Math.floor(Math.random() * nodeWordList.length);
    return nodeWordList[randomIndex];
}
