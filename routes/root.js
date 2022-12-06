"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const router = new Router();
router.get('/', function getRoot(ctx) {
    const resources = { auth: { _uri: '/auth' } };
    const authentication = '‘GET /auth’ to obtain JSON Web Token; subsequent requests require JWT auth';
    ctx.body = { resources: resources, authentication: authentication };
});
exports.default = router.routes();
//# sourceMappingURL=root.js.map