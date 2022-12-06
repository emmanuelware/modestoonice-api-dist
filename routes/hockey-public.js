"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const hockey_1 = require("../models/hockey");
const router = new Router();
router.get('/hockey', hockey_1.Hockey.getLessons);
router.post('/hockey/book', hockey_1.Hockey.bookLesson);
exports.default = router.routes();
//# sourceMappingURL=hockey-public.js.map