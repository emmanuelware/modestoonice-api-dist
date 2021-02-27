"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const faq_1 = require("../models/faq");
router.get('/faq', faq_1.Faq.getFaqs);
module.exports = router.middleware();
