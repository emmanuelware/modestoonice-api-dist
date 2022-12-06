"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const faq_1 = require("../models/faq");
const router = new Router();
router.post('/faq', faq_1.Faq.upsertFaq);
router.put('/faq/reorder', faq_1.Faq.reorderFaqs);
router.delete('/faq/:id', faq_1.Faq.deleteFaq);
exports.default = router.routes();
//# sourceMappingURL=faq.js.map