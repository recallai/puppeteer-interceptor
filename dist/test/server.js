"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serve_handler_1 = __importDefault(require("serve-handler"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const server = http_1.createServer((request, response) => {
    return serve_handler_1.default(request, response, {
        public: path_1.default.join(__dirname, 'server_root'),
    });
});
function start(port, cb) {
    server.listen(port, cb);
}
exports.start = start;
function stop(cb) {
    server.close(cb);
}
exports.stop = stop;
//# sourceMappingURL=server.js.map