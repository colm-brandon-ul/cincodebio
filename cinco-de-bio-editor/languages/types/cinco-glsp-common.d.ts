// Ambient declarations for @cinco-glsp/cinco-glsp-common
// These stubs allow VS Code to type-check language source files without
// a local node_modules installation. Derived from cinco-editor/cinco-glsp-common/src.
declare module '@cinco-glsp/cinco-glsp-common' {

    // ----------------------------------------------------------------
    // AnyObject  (protocol/type-utils.ts)
    // ----------------------------------------------------------------

    interface AnyObject { [key: string]: any; }
    namespace AnyObject {
        function is(object: any): object is AnyObject;
    }

    // ----------------------------------------------------------------
    // Base Action  (protocol/shared-protocol.ts)
    // ----------------------------------------------------------------

    interface Action {
        kind: string;
    }
    namespace Action {
        function is(object: any): object is Action;
        function hasKind(object: any, kind: string): boolean;
    }

    interface ManagedBaseAction extends Action {
        kind: string;
        modelElementId?: string;
    }

    interface Operation extends Action {
        isOperation: true;
    }
    namespace Operation {
        function is(object: any): object is Operation;
        function hasKind(object: any, kind: string): boolean;
    }

    // ----------------------------------------------------------------
    // Validation  (protocol/validation-protocol.ts)
    // ----------------------------------------------------------------

    enum ValidationStatus { Pass = 0, Info = 1, Warning = 2, Error = 3 }

    enum ValidationReason { ModelChange = 0, UI = 1 }

    interface ValidationMessage {
        status: ValidationStatus;
        name: string;
        message: string;
    }

    interface ValidationRequestAction extends ManagedBaseAction {
        kind: string;
        modelId: string;
        modelElementId: string;
        reason: ValidationReason | string;
        requestId: string;
    }
    namespace ValidationRequestAction {
        const KIND: string;
        function create(
            modelId: string,
            modelElementId: string,
            reason?: ValidationReason | string
        ): ValidationRequestAction;
    }

    interface ValidationResponseAction extends Action {
        kind: string;
        modelId: string;
        modelElementId: string;
        messages: ValidationMessage[];
        responseId: string;
    }
    namespace ValidationResponseAction {
        const KIND: string;
        function create(
            modelId: string,
            modelElementId: string,
            messages: ValidationMessage[],
            responseId?: string
        ): ValidationResponseAction;
        function getMaxSeverity(messages: ValidationMessage[]): ValidationStatus | undefined;
        function containsInfos(results: ValidationResponseAction[]): boolean;
        function containsWarnings(results: ValidationResponseAction[]): boolean;
        function containsErrors(results: ValidationResponseAction[]): boolean;
        function containsPass(results: ValidationResponseAction[]): boolean;
    }

    interface RevalidationRequestAction extends Action {
        kind: string;
        modelId: string;
        reason: ValidationReason | string;
        responseId: string;
    }
    namespace RevalidationRequestAction {
        const KIND: string;
        function create(modelId: string, reason?: ValidationReason | string): RevalidationRequestAction;
    }

    // ----------------------------------------------------------------
    // Generator  (protocol/generator-protocol.ts)
    // ----------------------------------------------------------------

    interface GeneratorAction extends ManagedBaseAction {
        kind: string;
        modelElementId: string;
        targetFolder?: string;
        args: any;
    }
    namespace GeneratorAction {
        const KIND: string;
        function is(object: any): object is GeneratorAction;
        function create(
            modelElementId: string,
            targetFolder?: string,
            args?: any
        ): GeneratorAction;
    }

    // ----------------------------------------------------------------
    // Custom actions  (protocol/custom-action-protocol.ts)
    // ----------------------------------------------------------------

    interface CustomAction extends ManagedBaseAction {
        kind: string;
        selectedElementIds: string[];
        modelElementId: string;
        handlerClass: string;
        args: any;
    }
    namespace CustomAction {
        const KIND: string;
        function is(object: any): object is CustomAction;
        function create(
            modelElementId: string,
            selectedElementIds: string[],
            handlerClass: string,
            args?: any
        ): CustomAction;
    }

    interface CustomActionRequest extends CustomAction {
        requestId: string;
    }
    namespace CustomActionRequest {
        const KIND: string;
        function is(object: any): object is CustomActionRequest;
        function create(
            modelElementId: string,
            selectedElementIds: string[],
            handlerClass: string,
            args?: any
        ): CustomActionRequest;
    }

    // ----------------------------------------------------------------
    // Double-click  (protocol/double-click-protocol.ts)
    // ----------------------------------------------------------------

    interface DoubleClickAction extends ManagedBaseAction {
        kind: string;
        modelElementId: string;
    }
    namespace DoubleClickAction {
        const KIND: string;
        function create(modelElementId: string): DoubleClickAction;
    }

    // ----------------------------------------------------------------
    // Appearance  (protocol/appearance-provider-protocol.ts)
    // ----------------------------------------------------------------

    interface AppearanceUpdateAction extends Action {
        kind: string;
        modelId: string;
        modelElementId: string;
        args?: any;
    }
    namespace AppearanceUpdateAction {
        const KIND: string;
        function is(object: any): object is AppearanceUpdateAction;
        function create(modelId: string, modelElementId: string, options?: { args: any }): AppearanceUpdateAction;
    }

    // ----------------------------------------------------------------
    // View & visual types  (meta-specification.ts)
    // ----------------------------------------------------------------

    interface Color { r: number; g: number; b: number; }
    interface Font { fontName: string; size?: number; isBold?: boolean; isItalic?: boolean; }

    interface Appearance {
        name?: string;
        parent?: string;
        foreground?: Color;
        background?: Color;
        filled?: boolean;
        font?: Font;
        lineStyle?: string;
        lineWidth?: number;
        transparency?: number;
        imagePath?: string;
    }

    interface Style {
        styleType: string;
        name: string;
        parameterCount?: number;
        appearanceProvider?: string;
    }
    namespace Style {
        const NODE_STYLE: string;
        const EDGE_STYLE: string;
        const GRAPHMODEL_STYLE: string;
        function is(object: any): object is Style;
    }

    interface NodeStyle extends Style { fixed?: boolean; shape?: any; }
    namespace NodeStyle { function is(object: any): object is NodeStyle; }

    interface EdgeStyle extends Style { appearance?: string | Appearance; type: string; decorator?: any[]; }
    namespace EdgeStyle { function is(object: any): object is EdgeStyle; }

    interface GraphModelStyle extends Style {}
    namespace GraphModelStyle { function is(object: any): object is GraphModelStyle; }

    interface View {
        cssClass?: string[];
        style?: string | Style;
        styleParameter?: string[];
    }
    namespace View {
        function is(object: any): object is View;
    }

    interface NodeView extends View { layoutOptions?: any; style?: string | NodeStyle; }
    namespace NodeView { function is(object: any): object is NodeView; }

    interface EdgeView extends View { routerKind?: string; style?: string | EdgeStyle; }
    namespace EdgeView { function is(object: any): object is EdgeView; }

    interface GraphModelView extends View {}
    namespace GraphModelView { function is(object: any): object is GraphModelView; }

    // ----------------------------------------------------------------
    // Meta-specification types  (meta-specification.ts)
    // ----------------------------------------------------------------

    interface ElementType {
        elementTypeId: string;
        superTypes?: string[];
        containments?: any[];
        attributes?: Attribute[];
    }

    interface NodeType extends ElementType {}
    namespace NodeType { const type: string; }

    interface EdgeType extends ElementType {}
    namespace EdgeType { const type: string; }

    interface GraphType extends ElementType {}
    namespace GraphType { const type: string; }

    interface UserDefinedType extends ElementType {}
    namespace UserDefinedType { const type: string; }

    interface ModelElementContainer extends ElementType {}
    namespace ModelElementContainer { const type: string; }

    interface Attribute {
        name: string;
        type: string;
        default?: any;
        list?: boolean;
    }

    type Deletable<T, ConflictTolerant extends boolean = boolean> = T | undefined;

    interface Cell<T, ConflictTolerant extends boolean = boolean> {
        values: T[];
    }

    namespace MetaSpecification {
        function set(metaSpecification: any, abstractElements?: any): void;
        function get(): any;
        function getSpecMap(): Map<string, ElementType>;
        function isNodeType(elementTypeId: string): boolean;
        function isEdgeType(elementTypeId: string): boolean;
        function isGraphType(elementTypeId: string): boolean;
        function getSpecOf(elementTypeId: string): ElementType | undefined;
        function getNodeSpecOf(elementTypeId: string): NodeType | undefined;
        function getEdgeSpecOf(elementTypeId: string): EdgeType | undefined;
        function getGraphSpecOf(elementTypeId: string): GraphType | undefined;
    }

    // ----------------------------------------------------------------
    // Helpers  (helper/* and meta-specification.ts)
    // ----------------------------------------------------------------

    function cellValues<ConflictTolerant extends boolean, T>(cell: Cell<T, ConflictTolerant>): ReadonlyArray<T>;
    function getNodeSpecOf(elementTypeId: string): NodeType | undefined;
    function getEdgeSpecOf(elementTypeId: string): EdgeType | undefined;
    function getGraphModelOfFileType(fileExtension: string): GraphType | undefined;
    function deletableValue<ConflictTolerant extends boolean, T>(deletable: Deletable<T, ConflictTolerant>): T;
    function isConflictFree(object: any): boolean;
    function isInstanceOf(object: any, type: string): boolean;
    function getSpecOf(type: string): ElementType | undefined;
    function hasArrayProp(object: any, prop: string): boolean;
    function hasStringProp(object: any, prop: string): boolean;
    function hasObjectProp(object: any, prop: string): boolean;
    function hasNumberProp(object: any, prop: string): boolean;
    function hasFunctionProp(object: any, prop: string): boolean;
    function getDiagramExtensions(): string[];
    function getAllHandlerNames(): string[];
    function getPackages(): string[];
    function checkConstraintsOn(element: any, targetType: string, elements: any[]): any[];
    function checkConstraints(element: any): any[];

    // Size / Position (shared between api and common)
    interface Size { width: number; height: number; }
    interface Point { x: number; y: number; }
}
