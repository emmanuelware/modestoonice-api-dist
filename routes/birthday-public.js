"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const birthday_1 = require("../models/birthday");
router.get('/birthday/session/:date', birthday_1.Birthday.getAvailableBirthdaySessionsByDate);
router.post('/birthday', birthday_1.Birthday.bookBirthday);
module.exports = router.middleware();
