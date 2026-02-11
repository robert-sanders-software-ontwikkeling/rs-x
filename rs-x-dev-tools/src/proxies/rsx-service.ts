import { MessageType } from './message-type.enum';
import { IModelWithId } from './model-with-id.interface';

export class RsxService {
    private readonly _tabId: number;
    private static _instance: RsxService;

    private constructor() {
        this._tabId = chrome.devtools.inspectedWindow.tabId;
    }

    public static getInstance(): RsxService {
        if (!this._instance) {
            this._instance = new RsxService();
        }
        return this._instance;
    }

    public getModels(): Promise<IModelWithId[]> {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(
                this._tabId, 
                { type: MessageType.getModels },
                (response) => {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError);
                    }
                    resolve(response ?? []);
                }
            );
        });
    }
}

