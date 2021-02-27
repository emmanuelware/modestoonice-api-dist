"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const email_1 = require("../models/email");
const router = new Router();
router.post('/email/contact-us', email_1.Email.handleContactUsSubmission);
exports.default = router.routes();
