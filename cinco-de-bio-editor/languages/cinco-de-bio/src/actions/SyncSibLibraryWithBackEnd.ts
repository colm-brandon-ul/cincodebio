import { CustomActionHandler, LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import { Action, CustomAction } from '@cinco-glsp/cinco-glsp-common';
import { HashValid } from '../protocol/sm_protocol';
import { REMOTE_HOST, SIB_DIRECTORY_NAME} from '../protocol/values';
import { cacheLocalSibLibraryModels, getAllInstalledSibLibs, hideFolderInWorkspace, updateLocalSibLibs, validateSibLibrary } from '../helper/siblibrary_helper';

export class SyncSibLibraryWithBackEnd extends CustomActionHandler {
    override CHANNEL_NAME: string | undefined = 'SyncSib [' + this.modelState.root.id + ']';

    override async execute(action: CustomAction, ...args: any): Promise<Action[]> {
        this.log("connecting to: " + REMOTE_HOST);

        // // hide sibs folder
        hideFolderInWorkspace("**/" + SIB_DIRECTORY_NAME.slice(0, -1), "/", this);
        // create .siblib directory if it doesn't exist
        if (!this.existsDirectory(SIB_DIRECTORY_NAME)) {
            this.createDirectory(SIB_DIRECTORY_NAME);
        }

        // get all local sib file names (readDirectory returns undefined for empty dirs)
        const allLocalSibLibFiles: string[] = this.readDirectory(SIB_DIRECTORY_NAME) ?? [];
        this.log("All Local SIB Library Files:\n" + JSON.stringify(allLocalSibLibFiles, undefined, 4));

        try {
            // requesting remote for all installed sib files
            const missingRemoteFiles = await getAllInstalledSibLibs({
                file_ids: allLocalSibLibFiles
            }, this);
            const remoteFileKeys = Object.keys(missingRemoteFiles?.files ?? {});
            const hashResults = await validateSibLibrary(
                allLocalSibLibFiles.filter(f => !remoteFileKeys.includes(f)),
                this
            );
            const updatedFiles = await updateLocalSibLibs(
                Object.keys(hashResults ?? {}).filter((a) => (hashResults ?? {})[a] != HashValid.VALID),
                missingRemoteFiles?.files ?? {},
                this
            );
            this.log("Updated SIB Library Files:\n" + JSON.stringify(updatedFiles, undefined, 4));

            const finalSibLibFiles: string[] = this.readDirectory(SIB_DIRECTORY_NAME) ?? [];
            const cachedFiles = await cacheLocalSibLibraryModels(this, finalSibLibFiles);
            this.log("Cached SIB Library Model Files:\n" + JSON.stringify(cachedFiles, undefined, 4));
        } catch (error) {
            this.log("SyncSibLibraryWithBackEnd: could not sync SIB library with back end: " + error);
        }

        return [{
            kind: 'requestContextActions',
            contextId: 'tool-palette',
            editorContext: { selectedElementIds: [] }
        } as unknown as Action]
    }
    
    override canExecute(action: CustomAction, ...args: unknown[]): Promise<boolean> | boolean {
        return true;
    }
}

LanguageFilesRegistry.register(SyncSibLibraryWithBackEnd)
