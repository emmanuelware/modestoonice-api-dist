"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const user_1 = require("../models/user");
router.post('/auth/reset-password/magic-link', user_1.User.sendResetPasswordMagicLink);
router.put('/auth/reset-password/magic-link', user_1.User.resetPasswordThroughMagicLink);
module.exports = router.middleware();
