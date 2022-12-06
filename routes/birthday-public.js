"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const birthday_1 = require("../models/birthday");
const router = new Router();
router.get('/birthday/session/:date', birthday_1.Birthday.getAvailableBirthdaySessionsByDate);
router.post('/birthday', birthday_1.Birthday.bookBirthday);
exports.default = router.routes();
//# sourceMappingURL=birthday-public.js.map