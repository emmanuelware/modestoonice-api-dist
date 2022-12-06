"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const faq_1 = require("../models/faq");
const router = new Router();
router.get('/faq', faq_1.Faq.getFaqs);
exports.default = router.routes();
//# sourceMappingURL=faq-public.js.map