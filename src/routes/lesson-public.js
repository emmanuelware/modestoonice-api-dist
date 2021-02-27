"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const lesson_1 = require("../models/lesson");
const router = new Router();
router.get('/lesson', lesson_1.Lesson.getLessons);
router.post('/lesson/book', lesson_1.Lesson.bookLesson);
exports.default = router.routes();
