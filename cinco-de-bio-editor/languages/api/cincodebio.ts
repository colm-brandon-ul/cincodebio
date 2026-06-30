/********************************************************************************
 * Copyright (c) 2025 Cinco Cloud.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

/**
 * THIS IS A GENERATED FILE! DO NOT CHANGE IT!
 * If you want to request a generated-method, you can do it here: https://gitlab.com/scce/cinco-cloud/-/issues
 **/
import {
    GraphModel,
    Edge,
    ModelElement,
    Node,
    PrimeReference,
    Container,
    UserDefinedType
} from '@cinco-glsp/cinco-glsp-api';
import {
    cellValues,
    getNodeSpecOf,
    AnyObject,
    deletableValue
} from '@cinco-glsp/cinco-glsp-common';

export abstract class SibValue<
    ConflictTolerant extends boolean = true
> extends UserDefinedType<ConflictTolerant> {
    override readonly type: string = 'cincodebio:sibvalue';
}

export namespace SibValue {
    /**
     * Checks if an object has 'SibValue' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is SibValue<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:sibvalue')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): SibValue<ConflictTolerant> {
        const wrapper: object | undefined =
            object.type === 'cincodebio:stringvalue'
                ? new StringValue<ConflictTolerant>()
                : object.type === 'cincodebio:enumvalue'
                  ? new EnumValue<ConflictTolerant>()
                  : object.type === 'cincodebio:integervalue'
                    ? new IntegerValue<ConflictTolerant>()
                    : object.type === 'cincodebio:colorvalue'
                      ? new ColorValue<ConflictTolerant>()
                      : undefined;
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as SibValue<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'SibValue'`);
    }
}

export class ControlFlow<
    ConflictTolerant extends boolean = true
> extends Edge<ConflictTolerant> {
    override readonly type: string = 'cincodebio:controlflow';

    get label(): string {
        return this.getProperty('label');
    }
    set label(attr: string) {
        this.setProperty('label', attr);
    }
    override set source(newSource: SIB<ConflictTolerant>) {
        if (this.canConnectToSource(newSource)) {
            this.sourceID = newSource.id;
        }
    }

    override get source(): SIB<ConflictTolerant> {
        const node = cellValues(
            this.index!.findNodeOrError(
                this.sourceID,
                sourceID =>
                    `Edge with id ${this.id} has an undefined sourceID ${sourceID}.`
            )
        )[0];
        if (node) {
            if (AutomatedSIB.is<ConflictTolerant>(node)) {
                return AutomatedSIB.wrap<ConflictTolerant>(node);
            }
            if (InteractiveSIB.is<ConflictTolerant>(node)) {
                return InteractiveSIB.wrap<ConflictTolerant>(node);
            }
            if (SIB.is<ConflictTolerant>(node)) {
                return SIB.wrap<ConflictTolerant>(node);
            }

            throw new Error('Illegal Node type.');
        } else {
            throw new Error(`Cannot find source for Edge with id ${this.id}.`);
        }
    }
    override set target(newTarget: SIB<ConflictTolerant>) {
        if (this.canConnectToTarget(newTarget)) {
            this.targetID = newTarget.id;
            this.delete();
            this.getGraphModel().edges.push(this);
        }
    }

    override get target(): SIB<ConflictTolerant> {
        const node = cellValues(
            this.index!.findNodeOrError(
                this.targetID,
                targetID =>
                    `Edge with id ${this.id} has an undefined sourceID ${targetID}.`
            )
        )[0];
        if (node) {
            if (AutomatedSIB.is<ConflictTolerant>(node)) {
                return AutomatedSIB.wrap<ConflictTolerant>(node);
            }
            if (InteractiveSIB.is<ConflictTolerant>(node)) {
                return InteractiveSIB.wrap<ConflictTolerant>(node);
            }
            if (SIB.is<ConflictTolerant>(node)) {
                return SIB.wrap<ConflictTolerant>(node);
            }

            throw new Error('Illegal Node type.');
        } else {
            throw new Error(`Cannot find target for Edge with id ${this.id}.`);
        }
    }
}

export namespace ControlFlow {
    /**
     * Checks if an object has 'ControlFlow' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is ControlFlow<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:controlflow')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): ControlFlow<ConflictTolerant> {
        const wrapper: object | undefined = new ControlFlow();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as ControlFlow<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'ControlFlow'`);
    }

    export function create<ConflictTolerant extends boolean = true>(
        sourceId: string,
        targetId: string
    ): ControlFlow<ConflictTolerant> {
        const edge = new Edge<ConflictTolerant>();
        edge.initialize({
            type: 'cincodebio:controlflow',
            sourceID: sourceId,
            targetID: targetId
        });
        return ControlFlow.wrap<ConflictTolerant>(edge);
    }
}

export class DataFlow<
    ConflictTolerant extends boolean = true
> extends Edge<ConflictTolerant> {
    override readonly type: string = 'cincodebio:dataflow';
    override set source(newSource: OutputPort<ConflictTolerant>) {
        if (this.canConnectToSource(newSource)) {
            this.sourceID = newSource.id;
        }
    }

    override get source(): OutputPort<ConflictTolerant> {
        const node = cellValues(
            this.index!.findNodeOrError(
                this.sourceID,
                sourceID =>
                    `Edge with id ${this.id} has an undefined sourceID ${sourceID}.`
            )
        )[0];
        if (node) {
            if (OutputPort.is<ConflictTolerant>(node)) {
                return OutputPort.wrap<ConflictTolerant>(node);
            }

            throw new Error('Illegal Node type.');
        } else {
            throw new Error(`Cannot find source for Edge with id ${this.id}.`);
        }
    }
    override set target(newTarget: InputPort<ConflictTolerant>) {
        if (this.canConnectToTarget(newTarget)) {
            this.targetID = newTarget.id;
            this.delete();
            this.getGraphModel().edges.push(this);
        }
    }

    override get target(): InputPort<ConflictTolerant> {
        const node = cellValues(
            this.index!.findNodeOrError(
                this.targetID,
                targetID =>
                    `Edge with id ${this.id} has an undefined sourceID ${targetID}.`
            )
        )[0];
        if (node) {
            if (InputPort.is<ConflictTolerant>(node)) {
                return InputPort.wrap<ConflictTolerant>(node);
            }

            throw new Error('Illegal Node type.');
        } else {
            throw new Error(`Cannot find target for Edge with id ${this.id}.`);
        }
    }
}

export namespace DataFlow {
    /**
     * Checks if an object has 'DataFlow' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is DataFlow<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:dataflow')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): DataFlow<ConflictTolerant> {
        const wrapper: object | undefined = new DataFlow();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as DataFlow<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'DataFlow'`);
    }

    export function create<ConflictTolerant extends boolean = true>(
        sourceId: string,
        targetId: string
    ): DataFlow<ConflictTolerant> {
        const edge = new Edge<ConflictTolerant>();
        edge.initialize({
            type: 'cincodebio:dataflow',
            sourceID: sourceId,
            targetID: targetId
        });
        return DataFlow.wrap<ConflictTolerant>(edge);
    }
}

export class CincoDeBioGraphModel<
    ConflictTolerant extends boolean = true
> extends GraphModel<ConflictTolerant> {
    override readonly type: string = 'cincodebio:cincodebiographmodel';
    createAutomatedSIB(
        x: number,
        y: number,
        primeRef: PrimeReference
    ): AutomatedSIB<ConflictTolerant> {
        const node = AutomatedSIB.create<ConflictTolerant>(
            { x: x, y: y },
            primeRef
        );
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as CincoDeBioGraphModel
        );
        return node;
    }
    get containedAutomatedSIBElements(): ReadonlyArray<
        AutomatedSIB<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => AutomatedSIB.is<ConflictTolerant>(element))
            .map(element => AutomatedSIB.wrap<ConflictTolerant>(element));
    }
    createInteractiveSIB(
        x: number,
        y: number,
        primeRef: PrimeReference
    ): InteractiveSIB<ConflictTolerant> {
        const node = InteractiveSIB.create<ConflictTolerant>(
            { x: x, y: y },
            primeRef
        );
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as CincoDeBioGraphModel
        );
        return node;
    }
    get containedInteractiveSIBElements(): ReadonlyArray<
        InteractiveSIB<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => InteractiveSIB.is<ConflictTolerant>(element))
            .map(element => InteractiveSIB.wrap<ConflictTolerant>(element));
    }
    get readonlyNodes(): ReadonlyArray<Node<ConflictTolerant>> {
        const _nodes = this.containments.map(element =>
            deletableValue(element)
        );
        return _nodes;
    }
    get containedSIBElements(): ReadonlyArray<SIB<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => SIB.is<ConflictTolerant>(element))
            .map(element => SIB.wrap<ConflictTolerant>(element));
    }
    override get edgeElements(): Edge<ConflictTolerant>[] {
        const edges = this.edges.map(deletableValue);
        return edges
            .map(edge => {
                if (ControlFlow.is(edge)) {
                    return ControlFlow.wrap<ConflictTolerant>(edge);
                }
                if (DataFlow.is(edge)) {
                    return DataFlow.wrap<ConflictTolerant>(edge);
                }
                return undefined;
            })
            .filter(
                element => element !== undefined
            ) as Edge<ConflictTolerant>[];
    }
}

export namespace CincoDeBioGraphModel {
    /**
     * Checks if an object has 'CincoDeBioGraphModel' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is CincoDeBioGraphModel<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:cincodebiographmodel')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): CincoDeBioGraphModel<ConflictTolerant> {
        const wrapper: object | undefined = new CincoDeBioGraphModel();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as CincoDeBioGraphModel<ConflictTolerant>;
        }
        throw new Error(
            `'${object.type}' is not of type 'CincoDeBioGraphModel'`
        );
    }

    // TODO: Generate create Method for CincoDeBioGraphModel GraphModel.
}
type _SIBLabelContainer<ConflictTolerant extends boolean = true> =
    SIB<ConflictTolerant>;

export class SIBLabel<
    ConflictTolerant extends boolean = true
> extends Node<ConflictTolerant> {
    override readonly type: string = 'cincodebio:siblabel';

    get label(): string {
        return this.getProperty('label') ?? '<unnamed>';
    }
    set label(attr: string) {
        this.setProperty('label', attr);
    }
    get icon(): string {
        return this.getProperty('icon') ?? 'icons/service.png';
    }
    set icon(attr: string) {
        this.setProperty('icon', attr);
    }
    get container(): _SIBLabelContainer<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as _SIBLabelContainer<ConflictTolerant>)
            : undefined;
    }
    moveTo(
        target: _SIBLabelContainer<ConflictTolerant>,
        x?: number,
        y?: number
    ): void {
        if (target.canContain(this.type)) {
            if (this.parent) {
                this.parent.containments = this.parent.containments.filter(
                    element => deletableValue(element).id !== this.id
                );
                target.containments.push(this);
            }
            this.position = {
                x: x ?? this.position.x,
                y: y ?? this.position.y
            };
        } else {
            throw new Error(
                `Can not contain Element of type '${this.type}' in target '${target.id}'`
            );
        }
    }
}

export namespace SIBLabel {
    /**
     * Checks if an object has 'SIBLabel' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is SIBLabel<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:siblabel')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): SIBLabel<ConflictTolerant> {
        const wrapper: object | undefined = new SIBLabel();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as SIBLabel<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'SIBLabel'`);
    }

    export function create<ConflictTolerant extends boolean = true>(position: {
        x: number;
        y: number;
    }): SIBLabel<ConflictTolerant> {
        const node = new SIBLabel<ConflictTolerant>();
        const specification = getNodeSpecOf('cincodebio:siblabel');
        node.size = {
            width: node.size.width ?? specification?.width ?? 100,
            height: node.size.height ?? specification?.height ?? 100
        };

        node.position = {
            // center
            x: position.x - node.size.width / 2,
            y: position.y - node.size.height / 2
        };
        node.initializeProperties();

        return node;
    }
}

export abstract class SIB<
    ConflictTolerant extends boolean = true
> extends Container<ConflictTolerant> {
    override readonly type: string = 'cincodebio:sib';

    get label(): string {
        return this.getProperty('label') ?? '<unnamed>';
    }
    set label(attr: string) {
        this.setProperty('label', attr);
    }
    get name(): string {
        return this.getProperty('name') ?? '<unnamed>';
    }
    set name(attr: string) {
        this.setProperty('name', attr);
    }
    get documentation(): string {
        return this.getProperty('documentation');
    }
    set documentation(attr: string) {
        this.setProperty('documentation', attr);
    }
    get validBranches(): string[] {
        return this.getProperty('validBranches');
    }
    set validBranches(attr: string[]) {
        this.setProperty('validBranches', attr);
    }
    createSIBLabel(x: number, y: number): SIBLabel<ConflictTolerant> {
        const node = SIBLabel.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as SIB
        );
        return node;
    }
    get containedSIBLabelElements(): ReadonlyArray<SIBLabel<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => SIBLabel.is<ConflictTolerant>(element))
            .map(element => SIBLabel.wrap<ConflictTolerant>(element));
    }
    get readonlyNodes(): ReadonlyArray<Node<ConflictTolerant>> {
        const _nodes = this.containments.map(element =>
            deletableValue(element)
        );
        return _nodes;
    }
    get containedIOElements(): ReadonlyArray<IO<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => IO.is<ConflictTolerant>(element))
            .map(element => IO.wrap<ConflictTolerant>(element));
    }
    get containedInputPortElements(): ReadonlyArray<
        InputPort<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => InputPort.is<ConflictTolerant>(element))
            .map(element => InputPort.wrap<ConflictTolerant>(element));
    }
    get containedOutputPortElements(): ReadonlyArray<
        OutputPort<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => OutputPort.is<ConflictTolerant>(element))
            .map(element => OutputPort.wrap<ConflictTolerant>(element));
    }
    createControlFlow(
        target:
            | AutomatedSIB<ConflictTolerant>
            | InteractiveSIB<ConflictTolerant>
            | SIB<ConflictTolerant>
    ): ControlFlow<ConflictTolerant> {
        const edge = ControlFlow.create<ConflictTolerant>(this.id, target.id);
        edge.contextBundle = this.contextBundle;
        this.getGraphModel().edges.push(edge);
        edge.contextBundle?.modelState.index.indexEdges(
            this.getGraphModel() as GraphModel<true>
        );
        return edge;
    }
    get outgoingControlFlowEdges(): ControlFlow<ConflictTolerant>[] {
        return this.outgoingEdges
            .filter(edge => ControlFlow.is<ConflictTolerant>(edge))
            .map(edge => ControlFlow.wrap<ConflictTolerant>(edge));
    }
    get incomingControlFlowEdges(): ControlFlow<ConflictTolerant>[] {
        return this.incomingEdges
            .filter(edge => ControlFlow.is<ConflictTolerant>(edge))
            .map(edge => ControlFlow.wrap<ConflictTolerant>(edge));
    }

    get AutomatedSIBSucessors(): AutomatedSIB<ConflictTolerant>[] {
        return this.successors
            .filter(node => AutomatedSIB.is<ConflictTolerant>(node))
            .map(node => AutomatedSIB.wrap<ConflictTolerant>(node));
    }

    get InteractiveSIBSucessors(): InteractiveSIB<ConflictTolerant>[] {
        return this.successors
            .filter(node => InteractiveSIB.is<ConflictTolerant>(node))
            .map(node => InteractiveSIB.wrap<ConflictTolerant>(node));
    }

    get SIBSucessors(): SIB<ConflictTolerant>[] {
        return this.successors
            .filter(node => SIB.is<ConflictTolerant>(node))
            .map(node => SIB.wrap<ConflictTolerant>(node));
    }

    get AutomatedSIBPredecessors(): AutomatedSIB<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => AutomatedSIB.is<ConflictTolerant>(node))
            .map(node => AutomatedSIB.wrap<ConflictTolerant>(node));
    }

    get InteractiveSIBPredecessors(): InteractiveSIB<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => InteractiveSIB.is<ConflictTolerant>(node))
            .map(node => InteractiveSIB.wrap<ConflictTolerant>(node));
    }

    get SIBPredecessors(): SIB<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => SIB.is<ConflictTolerant>(node))
            .map(node => SIB.wrap<ConflictTolerant>(node));
    }
    get container(): CincoDeBioGraphModel<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as CincoDeBioGraphModel<ConflictTolerant>)
            : undefined;
    }
    moveTo(
        target: CincoDeBioGraphModel<ConflictTolerant>,
        x?: number,
        y?: number
    ): void {
        if (target.canContain(this.type)) {
            if (this.parent) {
                this.parent.containments = this.parent.containments.filter(
                    element => deletableValue(element).id !== this.id
                );
                target.containments.push(this);
            }
            this.position = {
                x: x ?? this.position.x,
                y: y ?? this.position.y
            };
        } else {
            throw new Error(
                `Can not contain Element of type '${this.type}' in target '${target.id}'`
            );
        }
    }
}

export namespace SIB {
    /**
     * Checks if an object has 'SIB' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is SIB<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:sib')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): SIB<ConflictTolerant> {
        const wrapper: object | undefined =
            object.type === 'cincodebio:automatedsib'
                ? new AutomatedSIB<ConflictTolerant>()
                : object.type === 'cincodebio:interactivesib'
                  ? new InteractiveSIB<ConflictTolerant>()
                  : undefined;
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as SIB<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'SIB'`);
    }
}
type _IOContainer<ConflictTolerant extends boolean = true> =
    SIB<ConflictTolerant>;

export abstract class IO<
    ConflictTolerant extends boolean = true
> extends Node<ConflictTolerant> {
    override readonly type: string = 'cincodebio:io';

    get name(): string {
        return this.getProperty('name') ?? 'port';
    }
    set name(attr: string) {
        this.setProperty('name', attr);
    }
    get list(): string {
        return this.getProperty('list') ?? 'false';
    }
    set list(attr: string) {
        this.setProperty('list', attr);
    }
    get container(): _IOContainer<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as _IOContainer<ConflictTolerant>)
            : undefined;
    }
    moveTo(
        target: _IOContainer<ConflictTolerant>,
        x?: number,
        y?: number
    ): void {
        if (target.canContain(this.type)) {
            if (this.parent) {
                this.parent.containments = this.parent.containments.filter(
                    element => deletableValue(element).id !== this.id
                );
                target.containments.push(this);
            }
            this.position = {
                x: x ?? this.position.x,
                y: y ?? this.position.y
            };
        } else {
            throw new Error(
                `Can not contain Element of type '${this.type}' in target '${target.id}'`
            );
        }
    }
}

export namespace IO {
    /**
     * Checks if an object has 'IO' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is IO<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:io')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): IO<ConflictTolerant> {
        const wrapper: object | undefined =
            object.type === 'cincodebio:inputport'
                ? new InputPort<ConflictTolerant>()
                : object.type === 'cincodebio:outputport'
                  ? new OutputPort<ConflictTolerant>()
                  : undefined;
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as IO<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'IO'`);
    }
}

export class StringValue<
    ConflictTolerant extends boolean = true
> extends SibValue<ConflictTolerant> {
    override readonly type: string = 'cincodebio:stringvalue';

    get value(): string {
        return this.getProperty('value');
    }
    set value(attr: string) {
        this.setProperty('value', attr);
    }
}

export namespace StringValue {
    /**
     * Checks if an object has 'StringValue' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is StringValue<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:stringvalue')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): StringValue<ConflictTolerant> {
        const wrapper: object | undefined = new StringValue();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as StringValue<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'StringValue'`);
    }
}

export class EnumValue<
    ConflictTolerant extends boolean = true
> extends SibValue<ConflictTolerant> {
    override readonly type: string = 'cincodebio:enumvalue';

    get enum_values(): string {
        return this.getProperty('enum_values');
    }
    set enum_values(attr: string) {
        this.setProperty('enum_values', attr);
    }
    get value(): string {
        return this.getProperty('value');
    }
    set value(attr: string) {
        this.setProperty('value', attr);
    }
}

export namespace EnumValue {
    /**
     * Checks if an object has 'EnumValue' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is EnumValue<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:enumvalue')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): EnumValue<ConflictTolerant> {
        const wrapper: object | undefined = new EnumValue();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as EnumValue<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'EnumValue'`);
    }
}

export class IntegerValue<
    ConflictTolerant extends boolean = true
> extends SibValue<ConflictTolerant> {
    override readonly type: string = 'cincodebio:integervalue';

    get min_scale(): number {
        return this.getProperty('min_scale') ?? 1;
    }
    set min_scale(attr: number) {
        this.setProperty('min_scale', attr);
    }
    get max_scale(): number {
        return this.getProperty('max_scale') ?? 10;
    }
    set max_scale(attr: number) {
        this.setProperty('max_scale', attr);
    }
    get scale(): number {
        return this.getProperty('scale') ?? 5;
    }
    set scale(attr: number) {
        this.setProperty('scale', attr);
    }
}

export namespace IntegerValue {
    /**
     * Checks if an object has 'IntegerValue' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is IntegerValue<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:integervalue')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): IntegerValue<ConflictTolerant> {
        const wrapper: object | undefined = new IntegerValue();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as IntegerValue<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'IntegerValue'`);
    }
}

export class ColorValue<
    ConflictTolerant extends boolean = true
> extends SibValue<ConflictTolerant> {
    override readonly type: string = 'cincodebio:colorvalue';

    get hex(): string {
        return this.getProperty('hex') ?? '5';
    }
    set hex(attr: string) {
        this.setProperty('hex', attr);
    }
}

export namespace ColorValue {
    /**
     * Checks if an object has 'ColorValue' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is ColorValue<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:colorvalue')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): ColorValue<ConflictTolerant> {
        const wrapper: object | undefined = new ColorValue();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as ColorValue<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'ColorValue'`);
    }
}

export class AutomatedSIB<
    ConflictTolerant extends boolean = true
> extends SIB<ConflictTolerant> {
    override readonly type: string = 'cincodebio:automatedsib';
    createSIBLabel(x: number, y: number): SIBLabel<ConflictTolerant> {
        const node = SIBLabel.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as AutomatedSIB
        );
        return node;
    }
    override get containedSIBLabelElements(): ReadonlyArray<
        SIBLabel<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => SIBLabel.is<ConflictTolerant>(element))
            .map(element => SIBLabel.wrap<ConflictTolerant>(element));
    }
    createInputPort(x: number, y: number): InputPort<ConflictTolerant> {
        const node = InputPort.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as AutomatedSIB
        );
        return node;
    }
    override get containedInputPortElements(): ReadonlyArray<
        InputPort<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => InputPort.is<ConflictTolerant>(element))
            .map(element => InputPort.wrap<ConflictTolerant>(element));
    }
    createOutputPort(x: number, y: number): OutputPort<ConflictTolerant> {
        const node = OutputPort.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as AutomatedSIB
        );
        return node;
    }
    override get containedOutputPortElements(): ReadonlyArray<
        OutputPort<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => OutputPort.is<ConflictTolerant>(element))
            .map(element => OutputPort.wrap<ConflictTolerant>(element));
    }
    override get readonlyNodes(): ReadonlyArray<Node<ConflictTolerant>> {
        const _nodes = this.containments.map(element =>
            deletableValue(element)
        );
        return _nodes;
    }
    override get containedIOElements(): ReadonlyArray<IO<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => IO.is<ConflictTolerant>(element))
            .map(element => IO.wrap<ConflictTolerant>(element));
    }
    override createControlFlow(
        target:
            | AutomatedSIB<ConflictTolerant>
            | InteractiveSIB<ConflictTolerant>
            | SIB<ConflictTolerant>
    ): ControlFlow<ConflictTolerant> {
        const edge = ControlFlow.create<ConflictTolerant>(this.id, target.id);
        edge.contextBundle = this.contextBundle;
        this.getGraphModel().edges.push(edge);
        edge.contextBundle?.modelState.index.indexEdges(
            this.getGraphModel() as GraphModel<true>
        );
        return edge;
    }
    override get outgoingControlFlowEdges(): ControlFlow<ConflictTolerant>[] {
        return this.outgoingEdges
            .filter(edge => ControlFlow.is<ConflictTolerant>(edge))
            .map(edge => ControlFlow.wrap<ConflictTolerant>(edge));
    }
    override get incomingControlFlowEdges(): ControlFlow<ConflictTolerant>[] {
        return this.incomingEdges
            .filter(edge => ControlFlow.is<ConflictTolerant>(edge))
            .map(edge => ControlFlow.wrap<ConflictTolerant>(edge));
    }

    override get AutomatedSIBSucessors(): AutomatedSIB<ConflictTolerant>[] {
        return this.successors
            .filter(node => AutomatedSIB.is<ConflictTolerant>(node))
            .map(node => AutomatedSIB.wrap<ConflictTolerant>(node));
    }

    override get InteractiveSIBSucessors(): InteractiveSIB<ConflictTolerant>[] {
        return this.successors
            .filter(node => InteractiveSIB.is<ConflictTolerant>(node))
            .map(node => InteractiveSIB.wrap<ConflictTolerant>(node));
    }

    override get SIBSucessors(): SIB<ConflictTolerant>[] {
        return this.successors
            .filter(node => SIB.is<ConflictTolerant>(node))
            .map(node => SIB.wrap<ConflictTolerant>(node));
    }

    override get AutomatedSIBPredecessors(): AutomatedSIB<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => AutomatedSIB.is<ConflictTolerant>(node))
            .map(node => AutomatedSIB.wrap<ConflictTolerant>(node));
    }

    override get InteractiveSIBPredecessors(): InteractiveSIB<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => InteractiveSIB.is<ConflictTolerant>(node))
            .map(node => InteractiveSIB.wrap<ConflictTolerant>(node));
    }

    override get SIBPredecessors(): SIB<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => SIB.is<ConflictTolerant>(node))
            .map(node => SIB.wrap<ConflictTolerant>(node));
    }
    override get container():
        | CincoDeBioGraphModel<ConflictTolerant>
        | undefined {
        return this.parent
            ? (this.parent as CincoDeBioGraphModel<ConflictTolerant>)
            : undefined;
    }
    override moveTo(
        target: CincoDeBioGraphModel<ConflictTolerant>,
        x?: number,
        y?: number
    ): void {
        if (target.canContain(this.type)) {
            if (this.parent) {
                this.parent.containments = this.parent.containments.filter(
                    element => deletableValue(element).id !== this.id
                );
                target.containments.push(this);
            }
            this.position = {
                x: x ?? this.position.x,
                y: y ?? this.position.y
            };
        } else {
            throw new Error(
                `Can not contain Element of type '${this.type}' in target '${target.id}'`
            );
        }
    }
}

export namespace AutomatedSIB {
    /**
     * Checks if an object has 'AutomatedSIB' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is AutomatedSIB<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:automatedsib')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): AutomatedSIB<ConflictTolerant> {
        const wrapper: object | undefined = new AutomatedSIB();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as AutomatedSIB<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'AutomatedSIB'`);
    }

    export function create<ConflictTolerant extends boolean = true>(
        position: { x: number; y: number },
        primeRef: PrimeReference
    ): AutomatedSIB<ConflictTolerant> {
        const node = new AutomatedSIB<ConflictTolerant>();
        const specification = getNodeSpecOf('cincodebio:automatedsib');
        node.size = {
            width: node.size.width ?? specification?.width ?? 100,
            height: node.size.height ?? specification?.height ?? 100
        };

        node.position = {
            // center
            x: position.x - node.size.width / 2,
            y: position.y - node.size.height / 2
        };
        node.initializeProperties(primeRef);

        return node;
    }
}

export class InteractiveSIB<
    ConflictTolerant extends boolean = true
> extends SIB<ConflictTolerant> {
    override readonly type: string = 'cincodebio:interactivesib';
    createSIBLabel(x: number, y: number): SIBLabel<ConflictTolerant> {
        const node = SIBLabel.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as InteractiveSIB
        );
        return node;
    }
    override get containedSIBLabelElements(): ReadonlyArray<
        SIBLabel<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => SIBLabel.is<ConflictTolerant>(element))
            .map(element => SIBLabel.wrap<ConflictTolerant>(element));
    }
    createInputPort(x: number, y: number): InputPort<ConflictTolerant> {
        const node = InputPort.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as InteractiveSIB
        );
        return node;
    }
    override get containedInputPortElements(): ReadonlyArray<
        InputPort<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => InputPort.is<ConflictTolerant>(element))
            .map(element => InputPort.wrap<ConflictTolerant>(element));
    }
    createOutputPort(x: number, y: number): OutputPort<ConflictTolerant> {
        const node = OutputPort.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as InteractiveSIB
        );
        return node;
    }
    override get containedOutputPortElements(): ReadonlyArray<
        OutputPort<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => OutputPort.is<ConflictTolerant>(element))
            .map(element => OutputPort.wrap<ConflictTolerant>(element));
    }
    override get readonlyNodes(): ReadonlyArray<Node<ConflictTolerant>> {
        const _nodes = this.containments.map(element =>
            deletableValue(element)
        );
        return _nodes;
    }
    override get containedIOElements(): ReadonlyArray<IO<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => IO.is<ConflictTolerant>(element))
            .map(element => IO.wrap<ConflictTolerant>(element));
    }
    override createControlFlow(
        target:
            | AutomatedSIB<ConflictTolerant>
            | InteractiveSIB<ConflictTolerant>
            | SIB<ConflictTolerant>
    ): ControlFlow<ConflictTolerant> {
        const edge = ControlFlow.create<ConflictTolerant>(this.id, target.id);
        edge.contextBundle = this.contextBundle;
        this.getGraphModel().edges.push(edge);
        edge.contextBundle?.modelState.index.indexEdges(
            this.getGraphModel() as GraphModel<true>
        );
        return edge;
    }
    override get outgoingControlFlowEdges(): ControlFlow<ConflictTolerant>[] {
        return this.outgoingEdges
            .filter(edge => ControlFlow.is<ConflictTolerant>(edge))
            .map(edge => ControlFlow.wrap<ConflictTolerant>(edge));
    }
    override get incomingControlFlowEdges(): ControlFlow<ConflictTolerant>[] {
        return this.incomingEdges
            .filter(edge => ControlFlow.is<ConflictTolerant>(edge))
            .map(edge => ControlFlow.wrap<ConflictTolerant>(edge));
    }

    override get AutomatedSIBSucessors(): AutomatedSIB<ConflictTolerant>[] {
        return this.successors
            .filter(node => AutomatedSIB.is<ConflictTolerant>(node))
            .map(node => AutomatedSIB.wrap<ConflictTolerant>(node));
    }

    override get InteractiveSIBSucessors(): InteractiveSIB<ConflictTolerant>[] {
        return this.successors
            .filter(node => InteractiveSIB.is<ConflictTolerant>(node))
            .map(node => InteractiveSIB.wrap<ConflictTolerant>(node));
    }

    override get SIBSucessors(): SIB<ConflictTolerant>[] {
        return this.successors
            .filter(node => SIB.is<ConflictTolerant>(node))
            .map(node => SIB.wrap<ConflictTolerant>(node));
    }

    override get AutomatedSIBPredecessors(): AutomatedSIB<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => AutomatedSIB.is<ConflictTolerant>(node))
            .map(node => AutomatedSIB.wrap<ConflictTolerant>(node));
    }

    override get InteractiveSIBPredecessors(): InteractiveSIB<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => InteractiveSIB.is<ConflictTolerant>(node))
            .map(node => InteractiveSIB.wrap<ConflictTolerant>(node));
    }

    override get SIBPredecessors(): SIB<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => SIB.is<ConflictTolerant>(node))
            .map(node => SIB.wrap<ConflictTolerant>(node));
    }
    override get container():
        | CincoDeBioGraphModel<ConflictTolerant>
        | undefined {
        return this.parent
            ? (this.parent as CincoDeBioGraphModel<ConflictTolerant>)
            : undefined;
    }
    override moveTo(
        target: CincoDeBioGraphModel<ConflictTolerant>,
        x?: number,
        y?: number
    ): void {
        if (target.canContain(this.type)) {
            if (this.parent) {
                this.parent.containments = this.parent.containments.filter(
                    element => deletableValue(element).id !== this.id
                );
                target.containments.push(this);
            }
            this.position = {
                x: x ?? this.position.x,
                y: y ?? this.position.y
            };
        } else {
            throw new Error(
                `Can not contain Element of type '${this.type}' in target '${target.id}'`
            );
        }
    }
}

export namespace InteractiveSIB {
    /**
     * Checks if an object has 'InteractiveSIB' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is InteractiveSIB<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:interactivesib')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): InteractiveSIB<ConflictTolerant> {
        const wrapper: object | undefined = new InteractiveSIB();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as InteractiveSIB<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'InteractiveSIB'`);
    }

    export function create<ConflictTolerant extends boolean = true>(
        position: { x: number; y: number },
        primeRef: PrimeReference
    ): InteractiveSIB<ConflictTolerant> {
        const node = new InteractiveSIB<ConflictTolerant>();
        const specification = getNodeSpecOf('cincodebio:interactivesib');
        node.size = {
            width: node.size.width ?? specification?.width ?? 100,
            height: node.size.height ?? specification?.height ?? 100
        };

        node.position = {
            // center
            x: position.x - node.size.width / 2,
            y: position.y - node.size.height / 2
        };
        node.initializeProperties(primeRef);

        return node;
    }
}
type _InputPortContainer<ConflictTolerant extends boolean = true> =
    | AutomatedSIB<ConflictTolerant>
    | InteractiveSIB<ConflictTolerant>;

export class InputPort<
    ConflictTolerant extends boolean = true
> extends IO<ConflictTolerant> {
    override readonly type: string = 'cincodebio:inputport';

    get typeName(): string {
        return this.getProperty('typeName') ?? '??';
    }
    set typeName(attr: string) {
        this.setProperty('typeName', attr);
    }
    get incomingDataFlowEdges(): DataFlow<ConflictTolerant>[] {
        return this.incomingEdges
            .filter(edge => DataFlow.is<ConflictTolerant>(edge))
            .map(edge => DataFlow.wrap<ConflictTolerant>(edge));
    }

    get OutputPortPredecessors(): OutputPort<ConflictTolerant>[] {
        return this.predecessors
            .filter(node => OutputPort.is<ConflictTolerant>(node))
            .map(node => OutputPort.wrap<ConflictTolerant>(node));
    }
    override get container():
        | _InputPortContainer<ConflictTolerant>
        | undefined {
        return this.parent
            ? (this.parent as _InputPortContainer<ConflictTolerant>)
            : undefined;
    }
    override moveTo(
        target: _InputPortContainer<ConflictTolerant>,
        x?: number,
        y?: number
    ): void {
        if (target.canContain(this.type)) {
            if (this.parent) {
                this.parent.containments = this.parent.containments.filter(
                    element => deletableValue(element).id !== this.id
                );
                target.containments.push(this);
            }
            this.position = {
                x: x ?? this.position.x,
                y: y ?? this.position.y
            };
        } else {
            throw new Error(
                `Can not contain Element of type '${this.type}' in target '${target.id}'`
            );
        }
    }
}

export namespace InputPort {
    /**
     * Checks if an object has 'InputPort' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is InputPort<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:inputport')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): InputPort<ConflictTolerant> {
        const wrapper: object | undefined = new InputPort();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as InputPort<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'InputPort'`);
    }

    export function create<ConflictTolerant extends boolean = true>(position: {
        x: number;
        y: number;
    }): InputPort<ConflictTolerant> {
        const node = new InputPort<ConflictTolerant>();
        const specification = getNodeSpecOf('cincodebio:inputport');
        node.size = {
            width: node.size.width ?? specification?.width ?? 100,
            height: node.size.height ?? specification?.height ?? 100
        };

        node.position = {
            // center
            x: position.x - node.size.width / 2,
            y: position.y - node.size.height / 2
        };
        node.initializeProperties();

        return node;
    }
}
type _OutputPortContainer<ConflictTolerant extends boolean = true> =
    | AutomatedSIB<ConflictTolerant>
    | InteractiveSIB<ConflictTolerant>;

export class OutputPort<
    ConflictTolerant extends boolean = true
> extends IO<ConflictTolerant> {
    override readonly type: string = 'cincodebio:outputport';

    get typeName(): string {
        return this.getProperty('typeName') ?? '??';
    }
    set typeName(attr: string) {
        this.setProperty('typeName', attr);
    }
    createDataFlow(
        target: InputPort<ConflictTolerant>
    ): DataFlow<ConflictTolerant> {
        const edge = DataFlow.create<ConflictTolerant>(this.id, target.id);
        edge.contextBundle = this.contextBundle;
        this.getGraphModel().edges.push(edge);
        edge.contextBundle?.modelState.index.indexEdges(
            this.getGraphModel() as GraphModel<true>
        );
        return edge;
    }
    get outgoingDataFlowEdges(): DataFlow<ConflictTolerant>[] {
        return this.outgoingEdges
            .filter(edge => DataFlow.is<ConflictTolerant>(edge))
            .map(edge => DataFlow.wrap<ConflictTolerant>(edge));
    }

    get InputPortSucessors(): InputPort<ConflictTolerant>[] {
        return this.successors
            .filter(node => InputPort.is<ConflictTolerant>(node))
            .map(node => InputPort.wrap<ConflictTolerant>(node));
    }
    override get container():
        | _OutputPortContainer<ConflictTolerant>
        | undefined {
        return this.parent
            ? (this.parent as _OutputPortContainer<ConflictTolerant>)
            : undefined;
    }
    override moveTo(
        target: _OutputPortContainer<ConflictTolerant>,
        x?: number,
        y?: number
    ): void {
        if (target.canContain(this.type)) {
            if (this.parent) {
                this.parent.containments = this.parent.containments.filter(
                    element => deletableValue(element).id !== this.id
                );
                target.containments.push(this);
            }
            this.position = {
                x: x ?? this.position.x,
                y: y ?? this.position.y
            };
        } else {
            throw new Error(
                `Can not contain Element of type '${this.type}' in target '${target.id}'`
            );
        }
    }
}

export namespace OutputPort {
    /**
     * Checks if an object has 'OutputPort' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is OutputPort<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'cincodebio:outputport')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): OutputPort<ConflictTolerant> {
        const wrapper: object | undefined = new OutputPort();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as OutputPort<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'OutputPort'`);
    }

    export function create<ConflictTolerant extends boolean = true>(position: {
        x: number;
        y: number;
    }): OutputPort<ConflictTolerant> {
        const node = new OutputPort<ConflictTolerant>();
        const specification = getNodeSpecOf('cincodebio:outputport');
        node.size = {
            width: node.size.width ?? specification?.width ?? 100,
            height: node.size.height ?? specification?.height ?? 100
        };

        node.position = {
            // center
            x: position.x - node.size.width / 2,
            y: position.y - node.size.height / 2
        };
        node.initializeProperties();

        return node;
    }
}
