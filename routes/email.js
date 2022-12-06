"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const email_1 = require("../models/email");
const router = new Router();
router.post('/email/payload/birthday', email_1.Email.sendBirthdayEmailUsingPayload);
router.post('/email/payload/pass', email_1.Email.sendPassEmailUsingPayload);
exports.default = router.routes();
//# sourceMappingURL=email.js.map