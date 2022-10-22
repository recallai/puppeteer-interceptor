"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_1 = __importDefault(require("puppeteer/lib/cjs/puppeteer"));
const src_1 = require("../src");
const assert_1 = __importDefault(require("assert"));
const test_server_1 = require("@jsoverson/test-server");
describe('interceptor', function () {
    let browser, context, page;
    let server;
    before(async () => {
        browser = await puppeteer_1.default.launch({ headless: true });
        server = await test_server_1.start(__dirname, 'server_root');
    });
    beforeEach(async () => {
        context = await browser.createIncognitoBrowserContext();
        page = await browser.newPage();
    });
    afterEach(async () => {
        return page.close();
    });
    after(async () => {
        await browser.close();
        await server.stop();
    });
    it('should not cause problems on the page', async function () {
        await page.goto(server.url('index.html'), {});
        src_1.intercept(page, src_1.patterns.All('*'));
        const title = await page.title();
        assert_1.default.equal(title, 'Test page');
        const staticHeader = await page.$('h1');
        const headerContents = await page.evaluate((header) => header.innerHTML, staticHeader);
        assert_1.default.equal(headerContents, 'Test header');
        const dynamicHeader = await page.$('#dynamic');
        const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
        assert_1.default.equal(dynamicContents, 'Dynamic header');
    });
    it('should call onInterception', async function () {
        const promise = new Promise((resolve, reject) => {
            src_1.intercept(page, src_1.patterns.Script('*dynamic.js'), {
                onInterception: resolve,
            });
        });
        await page.goto(server.url('index.html'), {});
        return promise;
    });
    it('should support adding multiple, unique interceptors', async function () {
        let dynamicIntercepted = 0;
        let consoleIntercepted = 0;
        src_1.intercept(page, src_1.patterns.Script('*dynamic.js'), {
            onResponseReceived: () => {
                dynamicIntercepted++;
            },
        });
        src_1.intercept(page, src_1.patterns.Script('*console.js'), {
            onResponseReceived: () => {
                consoleIntercepted++;
            },
        });
        await page.setCacheEnabled(false);
        await page.goto(server.url('index.html'), {});
        assert_1.default.equal(dynamicIntercepted, 1);
        assert_1.default.equal(consoleIntercepted, 1);
    });
    it('should support removing interceptions', async function () {
        let timesCalled = 0;
        const pattern = src_1.patterns.Script('*dynamic.js');
        const handlers = {
            onResponseReceived: () => {
                timesCalled++;
            },
        };
        const handler = await src_1.intercept(page, pattern, handlers);
        await page.setCacheEnabled(false);
        await page.goto(server.url('index.html'), {});
        assert_1.default.equal(timesCalled, 1);
        handler.disable();
        await page.goto(server.url('index.html'), {});
        assert_1.default.equal(timesCalled, 1);
    });
    it('should pass response to onResponseReceived', async function () {
        const promise = new Promise((resolve, reject) => {
            src_1.intercept(page, src_1.patterns.Script('*dynamic.js'), {
                onResponseReceived: (event) => {
                    assert_1.default(event.response.body.match('Dynamic'));
                    resolve();
                },
            });
        });
        await page.goto(server.url('index.html'), {});
        return promise;
    });
    it('should allow replacing response bodies', async function () {
        src_1.intercept(page, src_1.patterns.Script('*dynamic.js'), {
            onResponseReceived: (event) => {
                event.response.body = event.response.body.replace('Dynamic', 'Intercepted');
                return event.response;
            },
        });
        await page.goto(server.url('index.html'), {});
        const dynamicHeader = await page.$('#dynamic');
        const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
        assert_1.default.equal(dynamicContents, 'Intercepted header');
    });
    it('should support asynchronous transformers', async function () {
        src_1.intercept(page, src_1.patterns.Script('*dynamic.js'), {
            onResponseReceived: async (event) => {
                const value = await new Promise((resolve) => {
                    setTimeout(() => resolve('Delayed'), 100);
                });
                event.response.body = event.response.body.replace('Dynamic', value);
                return event.response;
            },
        });
        await page.goto(server.url('index.html'), {});
        const dynamicHeader = await page.$('#dynamic');
        const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
        assert_1.default.equal(dynamicContents, 'Delayed header');
    });
    it('should allow cancelling requests', async function () {
        src_1.intercept(page, src_1.patterns.Script('*'), {
            onInterception: (event, { abort }) => {
                if (event.request.url.match('dynamic.js'))
                    abort('Aborted');
            },
        });
        await page.goto(server.url('index.html'), {});
        const dynamicHeader = await page.$('#dynamic');
        const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
        assert_1.default.equal(dynamicContents, 'Unmodified header');
    });
    it('should allow fulfilling requests', async function () {
        const randomString = Math.random().toString(16);
        src_1.intercept(page, src_1.patterns.Document('*'), {
            onInterception: (event, { fulfill }) => {
                fulfill(200, { body: randomString });
            },
        });
        await page.goto(server.url('index.html'), {});
        const content = await page.content();
        assert_1.default(content.match(randomString), `content (${content}) should match ${randomString}`);
    });
});
//# sourceMappingURL=index.test.js.map