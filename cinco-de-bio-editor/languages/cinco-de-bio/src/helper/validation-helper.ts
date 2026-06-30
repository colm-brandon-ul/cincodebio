import { Container, Node } from "@cinco-glsp/cinco-glsp-api";
import { ValidationMessage, ValidationStatus } from "@cinco-glsp/cinco-glsp-common";
import { SIB } from "../../../api/cincodebio";
import { branchLabelIssues } from './semantics';

export function hasAnyCycle(sibs: Node[]): boolean {
    const cache = {};
    for (let sib of sibs) {
        if (isCyclic(sib, [], cache))
            return true;
    }
    return false;
}

export function isCyclic(node: Node, path: Node[], cache: { [key: string]: boolean }): boolean {
    // Could make this more useful by identify the path which has cycles?

    // Check the cache first
    if (cache[node.id] !== undefined) {
        return cache[node.id];
    }

    // Add the current node to the path
    path.push(node);

    // Check if the current node is already in the path, indicating a cycle
    if (path.indexOf(node, 0) !== path.lastIndexOf(node)) {
        // Cycle found, cache the result
        cache[node.id] = true;
        return true;
    }

    // Recursively check the node's successors
    for (let successor of node.successors) {
        if (isCyclic(successor, path, cache)) {
            // Cycle found, cache the result
            cache[node.id] = true;
            return true;
        }
    }

    // No cycle found, remove the current node from the path and cache the result
    path.splice(path.indexOf(node, 0), 1);
    cache[node.id] = false;
    return false;
}

export function getAllPaths(egoNode: Container, pre: boolean = false): string[][] {
    const paths: string[][] = [];

    function dfs(node: Node, currentPath: string[]) {
        const newPath = [...currentPath, node.id];

        const outNodes = !pre ? node.successors : node.predecessors

        if (outNodes.length === 0 || currentPath.includes(node.id)) {
            paths.push(newPath);
            return;
        }

        for (const successor of outNodes) {
            dfs(successor, newPath);
        }
    }
    const outNodes = !pre ? egoNode.successors : egoNode.predecessors

    for (const suc of outNodes) {
        dfs(suc, [egoNode.id]);
    }

    return paths;
}

export function validateBranchLabels(sibs: SIB[]): ValidationMessage[] {
    var messages: ValidationMessage[] = []
    sibs.forEach(
        (sib) => {
            const valid_branch_labels: string[] = sib.validBranches ?? [];
            const out_branch_labels = sib.outgoingControlFlowEdges.map((a) => a.label);
            const issues = branchLabelIssues(valid_branch_labels, out_branch_labels);
            issues.invalidLabels.forEach((a => {
                messages.push({
                    name: `SIB ${sib.getProperty('label')}`,
                    message: `"${a}" is not a valid label for ControlFlow. Valid Options: ${valid_branch_labels.join(", ")}`,
                    status: ValidationStatus.Error
                })
            }))
            issues.duplicateLabels.forEach((a) => {
                messages.push({
                    name: `SIB ${sib.getProperty('label')}`,
                    message: `${a} is a duplicate branch, each branch can be used at most once. Other Options: ${valid_branch_labels.filter(b => b != a).join(", ")}`,
                    status: ValidationStatus.Error
                })
            })
        }
    );
    return messages
}

export function arraysHaveSameElements(arr1: any[], arr2: any[]): boolean {
    arr1 = arr1 ?? [];
    arr2 = arr2 ?? [];
    if (arr1.length !== arr2.length) {
        return false;
    }

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    if (set1.size !== set2.size) {
        return false;
    }

    return Array.from(set1).every(element => set2.has(element));
}
