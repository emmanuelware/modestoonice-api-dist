"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const email_1 = require("../models/email");
router.post('/email/payload/birthday', email_1.Email.sendBirthdayEmailUsingPayload);
router.post('/email/payload/pass', email_1.Email.sendPassEmailUsingPayload);
module.exports = router.middleware();
