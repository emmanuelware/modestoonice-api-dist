"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const lesson_1 = require("../models/lesson");
router.get('/lesson', lesson_1.Lesson.getLessons);
router.post('/lesson/book', lesson_1.Lesson.bookLesson);
module.exports = router.middleware();
