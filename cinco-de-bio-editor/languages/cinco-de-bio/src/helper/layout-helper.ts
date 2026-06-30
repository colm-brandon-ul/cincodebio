import { Container, Node} from "@cinco-glsp/cinco-glsp-api";

/**
 * Layout helper for SIBs
 */

export const HEADER_HEIGHT: number = 20;
export const FOOTER_HEIGHT: number = 20;
export const IO_HEIGHT: number = 20;
export const LABEL_HEIGHT: number = 50;
export const PADDING: number = 5;

const map: Map<string,number> = new Map([
    ["cincodebio:inputport", IO_HEIGHT],
    ["cincodebio:siblabel", LABEL_HEIGHT],
    ["cincodebio:outputport", IO_HEIGHT]
]);

export function layout(sib: Container, ignore?: Node) {
    const width = sib.size.width;
    // const nodes = sib.containments.sort((a, b) => a.position.y - b.position.y);
    // parition into inputs, outputs and labels

    // Sort alphabetically by type, then numerically by y
    const nodes = sib.containments.sort((a, b) => {
        const result = a.type.replace('sib', '').localeCompare(b.type.replace('sib', ''));
        if (result !== 0) {
            return result;
        }
        return a.position.y - b.position.y;
    });

    var delta = HEADER_HEIGHT;

    for (let node of nodes) {
        // do not layout ignored slot
        if (node == ignore)
            continue;

        // make slot as wide as slottable
        const height = map.get(node.type);
        node.size = {
            width: width,
            height: height ?? 0
        };
        // and put into correct position
        node.position = {
            x: 0,
            y: delta
        };
        delta += (height ?? 0) + PADDING;
    }

    delta += FOOTER_HEIGHT;

    sib.size = {
        width: width,
        height: delta
    };
}
