import atob from 'atob';
import btoa from 'btoa';

import DEBUG from 'debug';
import Protocol from 'devtools-protocol';
import { Page } from 'puppeteer/lib/cjs/puppeteer/common/Page';
import { CDPSession } from 'puppeteer/lib/cjs/puppeteer/common/Connection';

const debug = DEBUG('puppeteer-interceptor');

export * from './types';
export * from './request-patterns';

export namespace Interceptor {
  export interface OnResponseReceivedEvent {
    request: Protocol.Network.Request;
    response: InterceptedResponse;
  }

  export interface OnInterceptionEvent extends Protocol.Fetch.RequestPausedEvent {}

  export interface EventHandlers {
    onResponseReceived?: (
      event: OnResponseReceivedEvent,
    ) => Promise<InterceptedResponse | void> | InterceptedResponse | void;
    onInterception?: (event: OnInterceptionEvent, control: ControlCallbacks) => Promise<void> | void;
  }

  export interface Options {
    ignoreRedirects?: boolean;
    ignore4xxResponses?: boolean;
  }

  export interface ResponseOptions {
    responseHeaders?: Protocol.Fetch.HeaderEntry[];
    binaryResponseHeaders?: string;
    body?: string;
    responsePhrase?: string;
    encodedBody?: string;
  }

  export interface ControlCallbacks {
    abort: (msg: Protocol.Network.ErrorReason) => void;
    fulfill: (responseCode: number, responseOptions?: ResponseOptions) => void;
  }

  export interface InterceptedResponse {
    body: string;
    headers: Protocol.Fetch.HeaderEntry[] | undefined;
    errorReason?: Protocol.Network.ErrorReason;
    statusCode: number;
    base64Body?: string;
    statusMessage?: string;
  }
}

export class InterceptionHandler {
  page: Page;
  patterns: Protocol.Fetch.RequestPattern[] = [];
  eventHandlers: Interceptor.EventHandlers = {};
  options: Interceptor.Options = {};
  client?: CDPSession;
  disabled = false;
  constructor(
    page: Page,
    patterns: Protocol.Fetch.RequestPattern[] = [],
    eventHandlers: Interceptor.EventHandlers = {},
    options: Interceptor.Options = {},
  ) {
    this.page = page;
    this.patterns = patterns;
    this.eventHandlers = eventHandlers;
    this.options = options;
  }
  disable() {
    this.disabled = true;
  }
  enable() {
    this.disabled = false;
  }
  async initialize() {
    const client = await this.page.target().createCDPSession();
    await client.send('Fetch.enable', { patterns: this.patterns });
    client.on('Fetch.requestPaused', async (event: Protocol.Fetch.RequestPausedEvent) => {
      const { requestId, request } = event;

      if (this.disabled) {
        debug(`Interception handler disabled, continuing request.`);
        await client.send('Fetch.continueRequest', { requestId });
        return;
      }

      console.log(`DEBUG: Request ${event.request.url} (${requestId}) paused.`);

      if (this.eventHandlers.onInterception) {
        let errorReason: Protocol.Network.ErrorReason = 'Aborted';
        let shouldContinue = true;
        let fulfill: undefined | (() => Promise<void>) = undefined;
        const control = {
          abort: (msg: Protocol.Network.ErrorReason) => {
            shouldContinue = false;
            errorReason = msg;
          },
          fulfill: (responseCode: number, responseOptions?: Interceptor.ResponseOptions): void => {
            const fulfillOptions: Protocol.Fetch.FulfillRequestRequest = {
              requestId,
              responseCode,
            };
            if (responseOptions) {
              const keys = ['body', 'binaryResponseHeaders', 'responseHeaders', 'responsePhrase'];
              Object.assign(fulfillOptions, pick(responseOptions, keys));
              if (fulfillOptions.body) fulfillOptions.body = btoa(fulfillOptions.body);
              if (responseOptions.encodedBody) fulfillOptions.body = responseOptions.encodedBody;
            }
            fulfill = async () => {
              debug(`Fulfilling request ${requestId} with responseCode "${responseCode}"`);
              await client.send('Fetch.fulfillRequest', fulfillOptions);
            };
          },
        };

        await this.eventHandlers.onInterception(event, control);
        if (!shouldContinue) {
          debug(`Aborting request ${requestId} with reason "${errorReason}"`);
          await client.send('Fetch.failRequest', { requestId, errorReason });
          return;
        } else if (fulfill) {
          await fulfill!();
          return;
        }
      }

      let newResponse = null;

      if (this.eventHandlers.onResponseReceived) {
        if (!event.responseStatusCode) {
          debug(
            `Warning: onResponseReceived handler passed but ${requestId} intercepted at Request stage. Handler can not be called.`,
          );
        } else if (this.options.ignoreRedirects && event.responseStatusCode >= 300 && event.responseStatusCode < 400) {
          debug(
            `Warning: onResponseReceived handler passed but ${requestId} received redirect response. Handler can not be called.`,
          );
        } else if (
          this.options.ignore4xxResponses &&
          event.responseStatusCode >= 400 &&
          event.responseStatusCode < 500
        ) {
          debug(
            `Warning: onResponseReceived handler passed but ${requestId} received client error ${event.responseStatusCode} response. Handler can not be called.`,
          );
        } else {
          let responseCdp = null;
          try {
            responseCdp = (await client.send('Fetch.getResponseBody', {
              requestId,
            })) as Protocol.Fetch.GetResponseBodyResponse | null;
          } catch (err) {
            console.log(`INFO: Error in getting response body for ${requestId}`, err);
          }

          if (responseCdp) {
            const response: Interceptor.InterceptedResponse = {
              body: responseCdp.base64Encoded ? atob(responseCdp.body) : responseCdp.body,
              headers: event.responseHeaders,
              errorReason: event.responseErrorReason,
              statusCode: event.responseStatusCode,
            };
            newResponse = await this.eventHandlers.onResponseReceived({ response, request });
          }
        }
      }

      if (newResponse) {
        console.log(`DEBUG: Fulfilling request ${requestId} with response returned from onResponseReceived`);
        try {
          await client.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: newResponse.statusCode,
            responseHeaders: newResponse.headers,
            body: newResponse.base64Body ? newResponse.base64Body : btoa(newResponse.body),
            responsePhrase: newResponse.statusMessage,
          });
        } catch (err) {
          console.log(`INFO: Error in Fetch.fulfillRequest for ${requestId}`, err);
        }
      } else {
        try {
          await client.send('Fetch.continueRequest', { requestId });
        } catch (err) {
          console.log(`INFO: Error in Fetch.continueRequest for ${requestId}`, err);
        }
      }
    });
  }
}

export async function intercept(
  page: Page,
  patterns: Protocol.Fetch.RequestPattern[] = [],
  eventHandlers: Interceptor.EventHandlers = {},
  options: Interceptor.Options = {},
) {
  debug(`Registering interceptors for ${patterns.length} patterns`);
  const interceptionHandler = new InterceptionHandler(page, patterns, eventHandlers, options);
  await interceptionHandler.initialize();
  return interceptionHandler;
}

function pick(object: any, keys: any) {
  return keys.reduce((obj: any, key: any) => {
    if (object && object.hasOwnProperty(key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
}
