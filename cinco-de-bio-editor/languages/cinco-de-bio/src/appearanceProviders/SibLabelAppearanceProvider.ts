import { AppearanceProvider, LanguageFilesRegistry} from '@cinco-glsp/cinco-glsp-api';
import {
    Image,
    ContainerShape,
    View,
} from '@cinco-glsp/cinco-glsp-common';
import { AutomatedSIB, InteractiveSIB, SIB, SIBLabel } from "../../../api/cincodebio";


export class SibLabelAppearanceProvider extends AppearanceProvider {

    override async getAppearance(
        sibLabel: SIBLabel, ...args: unknown[]
    ): Promise<View | undefined>{
        const message = 'Element [' + sibLabel.type + ', ' + sibLabel.id + '] is changing appearance.';
        this.log(message);

        let sib = sibLabel.parent as SIB;
        sibLabel.label = sib.label;
        const labelShape = sibLabel.shape as ContainerShape;
        labelShape.children?.forEach(a => {
            if (Image.is(a)){
                if (AutomatedSIB.is(sib)){
                    a.path = 'icons/service.png'
                } else if(InteractiveSIB.is(sib)){
                    a.path = 'icons/task.png'
                }
                this.log(a.path)
            }
        })
        return sibLabel.view;
    }
}
// register into app
LanguageFilesRegistry.register(SibLabelAppearanceProvider);
