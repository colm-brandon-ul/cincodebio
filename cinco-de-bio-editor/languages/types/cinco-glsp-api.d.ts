// Ambient declarations for @cinco-glsp/cinco-glsp-api
// These stubs allow VS Code to type-check language source files without
// a local node_modules installation. Derived from cinco-editor/cinco-glsp-api/src.
declare module '@cinco-glsp/cinco-glsp-api' {

    // ----------------------------------------------------------------
    // Core graph model types
    // ----------------------------------------------------------------

    interface Size {
        width: number;
        height: number;
        widthFixed?: boolean;
        heightFixed?: boolean;
    }

    interface Point {
        x: number;
        y: number;
    }

    class ModelElement<ConflictTolerant extends boolean = boolean> {
        readonly id: string;
        readonly type: string;
        label: string;
        name: string;
        documentation: string;
        validBranches?: string[];
        isPrime: boolean;
        typeName: string;
        size: Size;
        view: any;
        primeReference: Promise<ModelElement | undefined>;
        containedElements: ModelElement[];
        containedInputPortElements: ModelElement[];
        containedOutputPortElements: ModelElement[];
        incomingEdges: Edge[];
        outgoingEdges: Edge[];
        readonly root: GraphModel;
        containments: ModelElement[];
        contextBundle: any;
        toJSON(): object;
        static is(object: any): object is ModelElement;
        static checkType(object: any, type: string): boolean;
    }

    namespace ModelElement {
        function is<ConflictTolerant extends boolean = boolean>(object: any): object is ModelElement<ConflictTolerant>;
        function checkType(object: any, type: string): boolean;
    }

    class GraphicalModelElement<ConflictTolerant extends boolean = boolean>
        extends ModelElement<ConflictTolerant> {}

    class Node<ConflictTolerant extends boolean = boolean>
        extends ModelElement<ConflictTolerant> {
        static is(object: any): object is Node;
    }

    class Edge<ConflictTolerant extends boolean = boolean>
        extends ModelElement<ConflictTolerant> {
        static is(object: any): object is Edge;
    }

    class Container<ConflictTolerant extends boolean = boolean>
        extends Node<ConflictTolerant> {
        containments: ModelElement[];
        static is(object: any): object is Container;
    }

    class ModelElementContainer<ConflictTolerant extends boolean = boolean>
        extends ModelElement<ConflictTolerant> {
        containments: ModelElement[];
        static is(object: any): object is ModelElementContainer;
    }

    class GraphModel<ConflictTolerant extends boolean = boolean>
        extends ModelElement<ConflictTolerant> {
        valid: Promise<boolean>;
        static is(object: any): object is GraphModel;
    }

    class PrimeReference<ConflictTolerant extends boolean = boolean>
        extends ModelElement<ConflictTolerant> {}

    class UserDefinedType<ConflictTolerant extends boolean = boolean>
        extends ModelElement<ConflictTolerant> {
        override readonly type: string;
    }

    // ----------------------------------------------------------------
    // GraphModelIndex
    // ----------------------------------------------------------------

    class GraphModelIndex<ConflictTolerant extends boolean = boolean> {
        findElement(id: string): ModelElement | undefined;
        getRoot(): GraphModel<ConflictTolerant>;
    }

    // ----------------------------------------------------------------
    // GraphModelState
    // ----------------------------------------------------------------

    class GraphModelState<ConflictTolerant extends boolean = false> {
        get graphModel(): GraphModel<ConflictTolerant>;
        get root(): GraphModel<ConflictTolerant>;
        readonly index: GraphModelIndex<ConflictTolerant>;
    }

    // ----------------------------------------------------------------
    // ResizeBounds  (cinco-glsp-api/src/api/types/resize-bounds.ts)
    // ----------------------------------------------------------------

    class ResizeBounds {
        top: number;
        right: number;
        bottom: number;
        left: number;
        constructor(
            oldX: number, oldY: number, oldW: number, oldH: number,
            newX: number, newY: number, newW: number, newH: number
        );
    }

    // ----------------------------------------------------------------
    // GraphModelWatcher  (cinco-glsp-api/src/api/watcher/graph-model-watcher.ts)
    // ----------------------------------------------------------------

    class GraphModelWatcher {
        static graphModelChangeCallbacks: Map<
            string,
            (dirtyFiles: { path: string; eventType: string }[]) => Promise<void>
        >;
        static initialized(): boolean;
        static addCallback(
            id: string,
            callback: (dirtyFiles: { path: string; eventType: string }[]) => Promise<void>
        ): string;
        static initializedWatcher(
            id?: string,
            folderToWatch?: string,
            options?: any
        ): Promise<void>;
    }

    // ----------------------------------------------------------------
    // APIBaseHandler  (cinco-glsp-api/src/api/handler/api-base-handler.ts)
    // ----------------------------------------------------------------

    abstract class APIBaseHandler {
        CHANNEL_NAME: string | undefined;
        get modelState(): GraphModelState;
        getElement(modelElementId: string): ModelElement;
        getSpecification(type: string): any | undefined;
        log(
            message: string,
            options?: {
                channelName?: string;
                show?: boolean;
                logLevel?: any;
                dispatchToClient?: boolean;
            }
        ): Promise<void>;
        error(message: string, options?: any): Promise<void>;
        notify(message: string, severity?: string): Promise<void>;
        dialog(title: string, content: string): Promise<void>;
        existsDirectory(name: string): boolean;
        createDirectory(name: string): void;
        readDirectory(name: string): string[] | undefined;
        createEdge(sourceId: string, targetId: string, elementTypeId: string): Promise<void>;
        createNode(elementTypeId: string, containerId: string, position?: Point): Promise<void>;
        deleteElement(elementId: string): Promise<void>;
        serializeModel(model: GraphModel): Promise<void>;
        triggerAppearanceForElements(elementIds: string[]): Promise<void>;
        executeCommand(commandId: string, args: any[]): Promise<void>;
    }

    // ----------------------------------------------------------------
    // Handlers
    // ----------------------------------------------------------------

    abstract class ValidationHandler extends APIBaseHandler {
        execute(action: any, ...args: unknown[]): Promise<any[]> | any[];
        canExecute(action: any, ...args: unknown[]): Promise<boolean> | boolean;
    }

    class CustomActionHandler extends APIBaseHandler {
        execute(action: any, ...args: unknown[]): Promise<any[]> | any[];
        canExecute(action: any, ...args: unknown[]): Promise<boolean> | boolean;
        getLabel(action: any, ...args: unknown[]): Promise<string | undefined> | string | undefined;
    }

    abstract class GeneratorHandler extends APIBaseHandler {
        execute(action: any, ...args: unknown[]): Promise<any[]> | any[];
        canExecute(action: any, ...args: unknown[]): Promise<boolean> | boolean;
    }

    abstract class AbstractHook extends APIBaseHandler {}

    abstract class AbstractNodeHook extends AbstractHook {
        canCreate(elementTypeId: string, container: any, position?: Point): Promise<boolean> | boolean;
        preCreate(elementTypeId: string, container: any, position?: Point): Promise<void> | void;
        postCreate(node: Node): Promise<void> | void;
        canDelete(node: Node): Promise<boolean> | boolean;
        preDelete(node: Node): Promise<void> | void;
        postDelete(node: Node): Promise<void> | void;
        canAttributeChange(node: Node, operation: any): Promise<boolean> | boolean;
        preAttributeChange(node: Node, operation: any): Promise<void> | void;
        postAttributeChange(node: Node, attributeName: string, oldValue: any): Promise<void> | void;
        canSelect(node: Node, isSelected: boolean): Promise<boolean> | boolean;
        onSelect(node: Node, isSelected: boolean): Promise<void> | void;
        postContentChange(model: Node): void;
        canResize(node: Node, resizeBounds: ResizeBounds): Promise<boolean> | boolean;
        preResize(node: Node, resizeBounds: ResizeBounds): Promise<void> | void;
        postResize(node: Node, resizeBounds: ResizeBounds): Promise<void> | void;
    }

    abstract class AbstractEdgeHook extends AbstractHook {
        canCreate(elementTypeId: string, sourceId: string, targetId: string): Promise<boolean> | boolean;
        postCreate(edge: Edge): Promise<void> | void;
        canDelete(edge: Edge): Promise<boolean> | boolean;
        postDelete(edge: Edge): Promise<void> | void;
    }

    abstract class DoubleClickHandler extends APIBaseHandler {
        execute(action: any, ...args: unknown[]): Promise<any[]> | any[];
        canExecute(action: any, ...args: unknown[]): Promise<boolean> | boolean;
    }

    abstract class AppearanceProvider extends APIBaseHandler {
        getAppearance(
            element: GraphicalModelElement<any>,
            ...args: unknown[]
        ): Promise<any | undefined> | any | undefined;
    }

    // ----------------------------------------------------------------
    // LanguageFilesRegistry  (cinco-glsp-api/src/semantics/language-files-registry.ts)
    // ----------------------------------------------------------------

    abstract class LanguageFilesRegistry {
        static register(cls: new (...args: any[]) => any): void;
        static init(onError?: (e: any) => void, options?: any): Promise<void>;
    }

    // ----------------------------------------------------------------
    // File utilities  (cinco-glsp-api/src/utils/file-helper.ts)
    // ----------------------------------------------------------------

    function readJson(
        filePath: string,
        options?: { hideError?: boolean; encoding?: string }
    ): Promise<object | undefined>;

    function readJsonSync(
        filePath: string,
        options?: { hideError?: boolean; encoding?: string }
    ): object | undefined;

    function readFile(filePath: string): string | undefined;

    function existsFile(filePath: string): Promise<boolean>;

    function getWorkspaceRootUri(): string;
}
