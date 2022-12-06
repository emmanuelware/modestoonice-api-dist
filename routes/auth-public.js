"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const user_1 = require("../models/user");
const router = new Router();
router.post('/auth/reset-password/magic-link', user_1.User.sendResetPasswordMagicLink);
router.put('/auth/reset-password/magic-link', user_1.User.resetPasswordThroughMagicLink);
exports.default = router.routes();
//# sourceMappingURL=auth-public.js.map