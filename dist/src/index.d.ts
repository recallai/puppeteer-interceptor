import Protocol from 'devtools-protocol';
import { Page } from 'puppeteer/lib/cjs/puppeteer/common/Page';
import { CDPSession } from 'puppeteer/lib/cjs/puppeteer/common/Connection';
export * from './types';
export * from './request-patterns';
export declare namespace Interceptor {
    interface OnResponseReceivedEvent {
        request: Protocol.Network.Request;
        response: InterceptedResponse;
    }
    interface OnInterceptionEvent extends Protocol.Fetch.RequestPausedEvent {
    }
    interface EventHandlers {
        onResponseReceived?: (event: OnResponseReceivedEvent) => Promise<InterceptedResponse | void> | InterceptedResponse | void;
        onInterception?: (event: OnInterceptionEvent, control: ControlCallbacks) => Promise<void> | void;
    }
    interface Options {
        ignoreRedirects?: boolean;
        ignore4xxResponses?: boolean;
    }
    interface ResponseOptions {
        responseHeaders?: Protocol.Fetch.HeaderEntry[];
        binaryResponseHeaders?: string;
        body?: string;
        responsePhrase?: string;
        encodedBody?: string;
    }
    interface ControlCallbacks {
        abort: (msg: Protocol.Network.ErrorReason) => void;
        fulfill: (responseCode: number, responseOptions?: ResponseOptions) => void;
    }
    interface InterceptedResponse {
        body: string;
        headers: Protocol.Fetch.HeaderEntry[] | undefined;
        errorReason?: Protocol.Network.ErrorReason;
        statusCode: number;
        base64Body?: string;
        statusMessage?: string;
    }
}
export declare class InterceptionHandler {
    page: Page;
    patterns: Protocol.Fetch.RequestPattern[];
    eventHandlers: Interceptor.EventHandlers;
    options: Interceptor.Options;
    client?: CDPSession;
    disabled: boolean;
    constructor(page: Page, patterns?: Protocol.Fetch.RequestPattern[], eventHandlers?: Interceptor.EventHandlers, options?: Interceptor.Options);
    disable(): void;
    enable(): void;
    initialize(): Promise<void>;
}
export declare function intercept(page: Page, patterns?: Protocol.Fetch.RequestPattern[], eventHandlers?: Interceptor.EventHandlers, options?: Interceptor.Options): Promise<InterceptionHandler>;
