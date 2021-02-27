"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const email_1 = require("../models/email");
router.post('/email/contact-us', email_1.Email.handleContactUsSubmission);
module.exports = router.middleware();
