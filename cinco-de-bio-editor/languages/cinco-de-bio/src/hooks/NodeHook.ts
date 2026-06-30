import { Node, AbstractNodeHook, LanguageFilesRegistry, Container, ResizeBounds } from '@cinco-glsp/cinco-glsp-api';
import { Point } from 'sprotty-protocol';
import { layout } from '../helper/layout-helper';
import { getRandomWord } from '../helper/name-helper';
import { Branch, Input, Output } from "../../../api/siblibrary";

export class NodeHook extends AbstractNodeHook {
    override CHANNEL_NAME: string | undefined = 'NodeHook [' + this.modelState.root.id + ']';
   
    override postCreate(node: Node): void {
        if (Branch.is(node)) {
            node.name = getRandomWord();
        } else if (Input.is(node) || Output.is(node)) {
            node.name = getRandomWord().toLowerCase();
            node.typeName = getRandomWord().toUpperCase();
        }
        layout(node.parent as Container)
    }

    override postMove(node: Node, oldPosition?: Point | undefined): void {
        layout(node.parent as Container);
    }

    override postResize(node: Node, resizeBounds: ResizeBounds): void {
        layout(node.parent as Container);
    }

    override postDelete(node: Node): void {
        layout(node.parent as Container);
    }
}

LanguageFilesRegistry.register(NodeHook);
