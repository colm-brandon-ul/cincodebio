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
    ModelElement,
    Node,
    Container
} from '@cinco-glsp/cinco-glsp-api';
import {
    getNodeSpecOf,
    AnyObject,
    deletableValue
} from '@cinco-glsp/cinco-glsp-common';

export class SIBLibrary<
    ConflictTolerant extends boolean = true
> extends GraphModel<ConflictTolerant> {
    override readonly type: string = 'siblibrary:siblibrary';
    createService(x: number, y: number): Service<ConflictTolerant> {
        const node = Service.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as SIBLibrary
        );
        return node;
    }
    get containedServiceElements(): ReadonlyArray<Service<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => Service.is<ConflictTolerant>(element))
            .map(element => Service.wrap<ConflictTolerant>(element));
    }
    createTask(x: number, y: number): Task<ConflictTolerant> {
        const node = Task.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as SIBLibrary
        );
        return node;
    }
    get containedTaskElements(): ReadonlyArray<Task<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => Task.is<ConflictTolerant>(element))
            .map(element => Task.wrap<ConflictTolerant>(element));
    }
    get readonlyNodes(): ReadonlyArray<Node<ConflictTolerant>> {
        const _nodes = this.containments.map(element =>
            deletableValue(element)
        );
        return _nodes;
    }
    get containedSIBDefElements(): ReadonlyArray<SIBDef<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => SIBDef.is<ConflictTolerant>(element))
            .map(element => SIBDef.wrap<ConflictTolerant>(element));
    }
}

export namespace SIBLibrary {
    /**
     * Checks if an object has 'SIBLibrary' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is SIBLibrary<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'siblibrary:siblibrary')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): SIBLibrary<ConflictTolerant> {
        const wrapper: object | undefined = new SIBLibrary();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as SIBLibrary<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'SIBLibrary'`);
    }

    // TODO: Generate create Method for SIBLibrary GraphModel.
}
type _LabelContainer<ConflictTolerant extends boolean = true> =
    SIBDef<ConflictTolerant>;

export class Label<
    ConflictTolerant extends boolean = true
> extends Node<ConflictTolerant> {
    override readonly type: string = 'siblibrary:label';

    get name(): string {
        return this.getProperty('name') ?? '<unnamed>';
    }
    set name(attr: string) {
        this.setProperty('name', attr);
    }
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
    get container(): _LabelContainer<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as _LabelContainer<ConflictTolerant>)
            : undefined;
    }
    moveTo(
        target: _LabelContainer<ConflictTolerant>,
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

export namespace Label {
    /**
     * Checks if an object has 'Label' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is Label<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'siblibrary:label')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): Label<ConflictTolerant> {
        const wrapper: object | undefined = new Label();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as Label<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'Label'`);
    }

    export function create<ConflictTolerant extends boolean = true>(position: {
        x: number;
        y: number;
    }): Label<ConflictTolerant> {
        const node = new Label<ConflictTolerant>();
        const specification = getNodeSpecOf('siblibrary:label');
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
type _BranchContainer<ConflictTolerant extends boolean = true> =
    SIBDef<ConflictTolerant>;

export class Branch<
    ConflictTolerant extends boolean = true
> extends Node<ConflictTolerant> {
    override readonly type: string = 'siblibrary:branch';

    get name(): string {
        return this.getProperty('name') ?? '<unnamed>';
    }
    set name(attr: string) {
        this.setProperty('name', attr);
    }
    get container(): _BranchContainer<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as _BranchContainer<ConflictTolerant>)
            : undefined;
    }
    moveTo(
        target: _BranchContainer<ConflictTolerant>,
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

export namespace Branch {
    /**
     * Checks if an object has 'Branch' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is Branch<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'siblibrary:branch')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): Branch<ConflictTolerant> {
        const wrapper: object | undefined = new Branch();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as Branch<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'Branch'`);
    }

    export function create<ConflictTolerant extends boolean = true>(position: {
        x: number;
        y: number;
    }): Branch<ConflictTolerant> {
        const node = new Branch<ConflictTolerant>();
        const specification = getNodeSpecOf('siblibrary:branch');
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

export abstract class SIBDef<
    ConflictTolerant extends boolean = true
> extends Container<ConflictTolerant> {
    override readonly type: string = 'siblibrary:sibdef';

    get name(): string {
        return this.getProperty('name') ?? '<unnamed>';
    }
    set name(attr: string) {
        this.setProperty('name', attr);
    }
    get label(): string {
        return this.getProperty('label') ?? '<unnamed>';
    }
    set label(attr: string) {
        this.setProperty('label', attr);
    }
    get documentation(): string {
        return this.getProperty('documentation');
    }
    set documentation(attr: string) {
        this.setProperty('documentation', attr);
    }
    createLabel(x: number, y: number): Label<ConflictTolerant> {
        const node = Label.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as SIBDef
        );
        return node;
    }
    get containedLabelElements(): ReadonlyArray<Label<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => Label.is<ConflictTolerant>(element))
            .map(element => Label.wrap<ConflictTolerant>(element));
    }
    createBranch(x: number, y: number): Branch<ConflictTolerant> {
        const node = Branch.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as SIBDef
        );
        return node;
    }
    get containedBranchElements(): ReadonlyArray<Branch<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => Branch.is<ConflictTolerant>(element))
            .map(element => Branch.wrap<ConflictTolerant>(element));
    }
    get readonlyNodes(): ReadonlyArray<Node<ConflictTolerant>> {
        const _nodes = this.containments.map(element =>
            deletableValue(element)
        );
        return _nodes;
    }
    get containedIODefElements(): ReadonlyArray<IODef<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => IODef.is<ConflictTolerant>(element))
            .map(element => IODef.wrap<ConflictTolerant>(element));
    }
    get containedInputElements(): ReadonlyArray<Input<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => Input.is<ConflictTolerant>(element))
            .map(element => Input.wrap<ConflictTolerant>(element));
    }
    get containedOutputElements(): ReadonlyArray<Output<ConflictTolerant>> {
        return this.readonlyNodes
            .filter(element => Output.is<ConflictTolerant>(element))
            .map(element => Output.wrap<ConflictTolerant>(element));
    }
    get container(): SIBLibrary<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as SIBLibrary<ConflictTolerant>)
            : undefined;
    }
    moveTo(target: SIBLibrary<ConflictTolerant>, x?: number, y?: number): void {
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

export namespace SIBDef {
    /**
     * Checks if an object has 'SIBDef' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is SIBDef<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'siblibrary:sibdef')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): SIBDef<ConflictTolerant> {
        const wrapper: object | undefined =
            object.type === 'siblibrary:service'
                ? new Service<ConflictTolerant>()
                : object.type === 'siblibrary:task'
                  ? new Task<ConflictTolerant>()
                  : undefined;
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as SIBDef<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'SIBDef'`);
    }
}
type _IODefContainer<ConflictTolerant extends boolean = true> =
    SIBDef<ConflictTolerant>;

export abstract class IODef<
    ConflictTolerant extends boolean = true
> extends Node<ConflictTolerant> {
    override readonly type: string = 'siblibrary:iodef';

    get name(): string {
        return this.getProperty('name') ?? '<unnamed>';
    }
    set name(attr: string) {
        this.setProperty('name', attr);
    }
    get typeName(): string {
        return this.getProperty('typeName') ?? '<untyped>';
    }
    set typeName(attr: string) {
        this.setProperty('typeName', attr);
    }
    get list(): string {
        return this.getProperty('list') ?? 'false';
    }
    set list(attr: string) {
        this.setProperty('list', attr);
    }
    get container(): _IODefContainer<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as _IODefContainer<ConflictTolerant>)
            : undefined;
    }
    moveTo(
        target: _IODefContainer<ConflictTolerant>,
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

export namespace IODef {
    /**
     * Checks if an object has 'IODef' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is IODef<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'siblibrary:iodef')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): IODef<ConflictTolerant> {
        const wrapper: object | undefined =
            object.type === 'siblibrary:input'
                ? new Input<ConflictTolerant>()
                : object.type === 'siblibrary:output'
                  ? new Output<ConflictTolerant>()
                  : undefined;
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as IODef<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'IODef'`);
    }
}

export class Service<
    ConflictTolerant extends boolean = true
> extends SIBDef<ConflictTolerant> {
    override readonly type: string = 'siblibrary:service';
    createLabel(x: number, y: number): Label<ConflictTolerant> {
        const node = Label.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as Service
        );
        return node;
    }
    override get containedLabelElements(): ReadonlyArray<
        Label<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => Label.is<ConflictTolerant>(element))
            .map(element => Label.wrap<ConflictTolerant>(element));
    }
    createInput(x: number, y: number): Input<ConflictTolerant> {
        const node = Input.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as Service
        );
        return node;
    }
    override get containedInputElements(): ReadonlyArray<
        Input<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => Input.is<ConflictTolerant>(element))
            .map(element => Input.wrap<ConflictTolerant>(element));
    }
    createOutput(x: number, y: number): Output<ConflictTolerant> {
        const node = Output.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as Service
        );
        return node;
    }
    override get containedOutputElements(): ReadonlyArray<
        Output<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => Output.is<ConflictTolerant>(element))
            .map(element => Output.wrap<ConflictTolerant>(element));
    }
    createBranch(x: number, y: number): Branch<ConflictTolerant> {
        const node = Branch.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as Service
        );
        return node;
    }
    override get containedBranchElements(): ReadonlyArray<
        Branch<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => Branch.is<ConflictTolerant>(element))
            .map(element => Branch.wrap<ConflictTolerant>(element));
    }
    override get readonlyNodes(): ReadonlyArray<Node<ConflictTolerant>> {
        const _nodes = this.containments.map(element =>
            deletableValue(element)
        );
        return _nodes;
    }
    override get containedIODefElements(): ReadonlyArray<
        IODef<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => IODef.is<ConflictTolerant>(element))
            .map(element => IODef.wrap<ConflictTolerant>(element));
    }
    override get container(): SIBLibrary<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as SIBLibrary<ConflictTolerant>)
            : undefined;
    }
    override moveTo(
        target: SIBLibrary<ConflictTolerant>,
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

export namespace Service {
    /**
     * Checks if an object has 'Service' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is Service<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'siblibrary:service')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): Service<ConflictTolerant> {
        const wrapper: object | undefined = new Service();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as Service<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'Service'`);
    }

    export function create<ConflictTolerant extends boolean = true>(position: {
        x: number;
        y: number;
    }): Service<ConflictTolerant> {
        const node = new Service<ConflictTolerant>();
        const specification = getNodeSpecOf('siblibrary:service');
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

export class Task<
    ConflictTolerant extends boolean = true
> extends SIBDef<ConflictTolerant> {
    override readonly type: string = 'siblibrary:task';
    createLabel(x: number, y: number): Label<ConflictTolerant> {
        const node = Label.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as Task
        );
        return node;
    }
    override get containedLabelElements(): ReadonlyArray<
        Label<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => Label.is<ConflictTolerant>(element))
            .map(element => Label.wrap<ConflictTolerant>(element));
    }
    createInput(x: number, y: number): Input<ConflictTolerant> {
        const node = Input.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as Task
        );
        return node;
    }
    override get containedInputElements(): ReadonlyArray<
        Input<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => Input.is<ConflictTolerant>(element))
            .map(element => Input.wrap<ConflictTolerant>(element));
    }
    createOutput(x: number, y: number): Output<ConflictTolerant> {
        const node = Output.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as Task
        );
        return node;
    }
    override get containedOutputElements(): ReadonlyArray<
        Output<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => Output.is<ConflictTolerant>(element))
            .map(element => Output.wrap<ConflictTolerant>(element));
    }
    createBranch(x: number, y: number): Branch<ConflictTolerant> {
        const node = Branch.create<ConflictTolerant>({ x: x, y: y });
        node.contextBundle = this.contextBundle;
        this.containments.push(node);
        node.contextBundle?.modelState.index.indexNode(
            node as Node<true>,
            this as Task
        );
        return node;
    }
    override get containedBranchElements(): ReadonlyArray<
        Branch<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => Branch.is<ConflictTolerant>(element))
            .map(element => Branch.wrap<ConflictTolerant>(element));
    }
    override get readonlyNodes(): ReadonlyArray<Node<ConflictTolerant>> {
        const _nodes = this.containments.map(element =>
            deletableValue(element)
        );
        return _nodes;
    }
    override get containedIODefElements(): ReadonlyArray<
        IODef<ConflictTolerant>
    > {
        return this.readonlyNodes
            .filter(element => IODef.is<ConflictTolerant>(element))
            .map(element => IODef.wrap<ConflictTolerant>(element));
    }
    override get container(): SIBLibrary<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as SIBLibrary<ConflictTolerant>)
            : undefined;
    }
    override moveTo(
        target: SIBLibrary<ConflictTolerant>,
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

export namespace Task {
    /**
     * Checks if an object has 'Task' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is Task<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'siblibrary:task')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): Task<ConflictTolerant> {
        const wrapper: object | undefined = new Task();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as Task<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'Task'`);
    }

    export function create<ConflictTolerant extends boolean = true>(position: {
        x: number;
        y: number;
    }): Task<ConflictTolerant> {
        const node = new Task<ConflictTolerant>();
        const specification = getNodeSpecOf('siblibrary:task');
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
type _InputContainer<ConflictTolerant extends boolean = true> =
    | Service<ConflictTolerant>
    | Task<ConflictTolerant>;

export class Input<
    ConflictTolerant extends boolean = true
> extends IODef<ConflictTolerant> {
    override readonly type: string = 'siblibrary:input';
    override get container(): _InputContainer<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as _InputContainer<ConflictTolerant>)
            : undefined;
    }
    override moveTo(
        target: _InputContainer<ConflictTolerant>,
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

export namespace Input {
    /**
     * Checks if an object has 'Input' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is Input<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'siblibrary:input')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): Input<ConflictTolerant> {
        const wrapper: object | undefined = new Input();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as Input<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'Input'`);
    }

    export function create<ConflictTolerant extends boolean = true>(position: {
        x: number;
        y: number;
    }): Input<ConflictTolerant> {
        const node = new Input<ConflictTolerant>();
        const specification = getNodeSpecOf('siblibrary:input');
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
type _OutputContainer<ConflictTolerant extends boolean = true> =
    | Service<ConflictTolerant>
    | Task<ConflictTolerant>;

export class Output<
    ConflictTolerant extends boolean = true
> extends IODef<ConflictTolerant> {
    override readonly type: string = 'siblibrary:output';
    override get container(): _OutputContainer<ConflictTolerant> | undefined {
        return this.parent
            ? (this.parent as _OutputContainer<ConflictTolerant>)
            : undefined;
    }
    override moveTo(
        target: _OutputContainer<ConflictTolerant>,
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

export namespace Output {
    /**
     * Checks if an object has 'Output' as a type or supertype.
     * If so, this method returns 'true' otherwise 'false'.
     **/
    export function is<ConflictTolerant extends boolean = true>(
        object: any
    ): object is Output<ConflictTolerant> {
        return (
            AnyObject.is(object) &&
            ModelElement.is<ConflictTolerant>(object) &&
            ModelElement.checkType(object, 'siblibrary:output')
        );
    }

    export function wrap<ConflictTolerant extends boolean = true>(
        object: ModelElement<ConflictTolerant>
    ): Output<ConflictTolerant> {
        const wrapper: object | undefined = new Output();
        if (wrapper) {
            return Object.assign(
                wrapper,
                object as unknown
            ) as Output<ConflictTolerant>;
        }
        throw new Error(`'${object.type}' is not of type 'Output'`);
    }

    export function create<ConflictTolerant extends boolean = true>(position: {
        x: number;
        y: number;
    }): Output<ConflictTolerant> {
        const node = new Output<ConflictTolerant>();
        const specification = getNodeSpecOf('siblibrary:output');
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
