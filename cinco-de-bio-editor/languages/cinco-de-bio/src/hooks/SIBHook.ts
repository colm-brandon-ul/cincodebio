import { Node, AbstractNodeHook, LanguageFilesRegistry, Container, ResizeBounds } from '@cinco-glsp/cinco-glsp-api';
import { layout } from '../helper/layout-helper';
import { Branch, Input, Label, Output, Service, Task } from "../../../api/siblibrary";
import { AutomatedSIB, InputPort, InteractiveSIB, OutputPort, SIBLabel } from "../../../api/cincodebio";

export class SIBHook extends AbstractNodeHook {
    override CHANNEL_NAME: string | undefined = 'InteractiveSibHook [' + this.modelState.root.id + ']';

    override async postCreate(image: AutomatedSIB | InteractiveSIB): Promise<void> {
        if (image.isPrime && (AutomatedSIB.is(image) || InteractiveSIB.is(image))) {
            const reference = (await image.primeReference) as Service | Task | undefined;
            if (!reference) {
                this.error(`Could not initialize SIB ${image.id}: prime reference is missing.`);
                return;
            }
            var valid_branches: any[] = []

            // raise properties from reference
            image.size = reference.size
            image.name = reference.name;
            image.label = reference.label;
            image.documentation = reference.documentation;

            reference.containments.forEach((child: Node) => {
                if (Input.is(child)) {
                    let n = new InputPort();
                    n.initializeProperties();
                    n.position = child.position;
                    n.size = { width: image.size.width, height: child.size.height };

                    // raise attributes
                    n.name = child.name;
                    n.typeName = child.typeName;
                    n.list = child.list;

                    image.containments.push(n)
                } else if (Output.is(child)) {
                    let n = new OutputPort();
                    n.initializeProperties()
                    n.position = child.position;
                    n.size = { width: image.size.width, height: child.size.height };

                    // raise attributes
                    n.name = child.name;
                    n.typeName = child.typeName;
                    n.list = child.list;

                    image.containments.push(n)
                } else if (Label.is(child)) {
                    let n = new SIBLabel();
                    n.initializeProperties()
                    n.position = child.position;
                    n.size = { width: image.size.width, height: child.size.height };

                    // raise attributes
                    n.label = child.label;
                    n.icon = child.icon;

                    image.containments.push(n)
                } else if (Branch.is(child)) {
                    valid_branches.push(child.name);
                }
            });
            image.validBranches = valid_branches;

            // update layouts
            layout(image)
        }
    }

    override postResize(node: Node, _: ResizeBounds): void {
        layout(node as Container);
    }
}

LanguageFilesRegistry.register(SIBHook);
