"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patterns = {
    Document: patternGenerator('Document'),
    Stylesheet: patternGenerator('Stylesheet'),
    Image: patternGenerator('Image'),
    Media: patternGenerator('Media'),
    Font: patternGenerator('Font'),
    Script: patternGenerator('Script'),
    TextTrack: patternGenerator('TextTrack'),
    XHR: patternGenerator('XHR'),
    Fetch: patternGenerator('Fetch'),
    EventSource: patternGenerator('EventSource'),
    WebSocket: patternGenerator('WebSocket'),
    Manifest: patternGenerator('Manifest'),
    SignedExchange: patternGenerator('SignedExchange'),
    Ping: patternGenerator('Ping'),
    CSPViolationReport: patternGenerator('CSPViolationReport'),
    Other: patternGenerator('Other'),
    All: (patterns) => toArray(patterns).map((pattern) => ({
        urlPattern: pattern,
        requestStage: 'Response',
    })),
};
function patternGenerator(type) {
    return (patterns) => toArray(patterns).map(toPattern(type));
}
function toArray(o) {
    return Array.isArray(o) ? o : [o];
}
function toPattern(type) {
    return (urlPattern) => ({
        urlPattern,
        resourceType: type,
        requestStage: 'Response',
    });
}
//# sourceMappingURL=request-patterns.js.map