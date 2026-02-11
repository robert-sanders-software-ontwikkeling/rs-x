
import { Container, IGuidFactory, RsXCoreInjectionTokens } from '@rs-x/core';
import { IExpressionManager, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { MessageType } from './message-type.enum';
import { IModelWithId } from './model-with-id.interface';





type RSXMessage = { type: MessageType, payload?: unknown };

class PageProxy {
    private readonly _guidFactory: IGuidFactory;
    private readonly _dispatchedModels = new Map<string, object>();
    private readonly handleMessage: Record<MessageType, (payload: unknown) => unknown>;

    constructor(
        private readonly _injectionContainer: Container,
        private readonly _expressionManager: IExpressionManager

    ) {
        this._expressionManager = this._injectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionManager);
        this._guidFactory = this._injectionContainer.get(RsXCoreInjectionTokens.IGuidFactory);

        this.handleMessage = {
            [MessageType.getModels]: this.getModels
        };
        chrome.runtime.onMessage.addListener(this.processMessage);
    }

    private processMessage = (msg: RSXMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean | void => {
        if (!this.handleMessage[msg.type]) {
            return;
        }

        const data = this.handleMessage[msg.type](msg.payload);
        sendResponse(data);
    }

    private getModels = (): IModelWithId[] => {
        this._dispatchedModels.clear();
        const models: IModelWithId[] = [];

        for (const model of this._expressionManager.ids()) {
            const id = this._guidFactory.create();
            models.push({
                id,
                model
            })
            this._dispatchedModels.set(id, model);
        }

        return models;
    }
}

(function () {
    const expressionManager: IExpressionManager = window.RSX_INJECTION_CONTAINER?.get(RsXExpressionParserInjectionTokens.IExpressionManager);
    if (!expressionManager) {
        console.log('RS-X not found on this page');
        return;
    }
    new PageProxy(
        window.RSX_INJECTION_CONTAINER,
        expressionManager
    );
})();

