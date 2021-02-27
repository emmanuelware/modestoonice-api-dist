"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const faq_1 = require("../models/faq");
router.post('/faq', faq_1.Faq.upsertFaq);
router.put('/faq/reorder', faq_1.Faq.reorderFaqs);
router.delete('/faq/:id', faq_1.Faq.deleteFaq);
module.exports = router.middleware();
