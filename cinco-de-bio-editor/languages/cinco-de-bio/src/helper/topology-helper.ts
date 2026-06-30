
export const typeMap = new Map<string, string>();
const obj: Map<string, string> = new Map([
    ["siblibrary:service", "cincodebio:automatedsib"],
    ["siblibrary:task", "cincodebio:interactivesib"],
    ['siblibrary:input', "cincodebio:inputport"],
    ['siblibrary:output', "cincodebio:outputport"],
    ['siblibrary:label', 'cincodebio:siblabel']
]);
Object.entries(obj).forEach(([k, v]) => {
    typeMap.set(k, v)
    typeMap.set(v, k)
});
