"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const hockey_1 = require("../models/hockey");
const router = new Router();
router.get('/hokey', hockey_1.Hokey.getLessons);
router.post('/hokey/book', hockey_1.Hokey.bookLesson);
exports.default = router.routes();
