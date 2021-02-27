"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const user_1 = require("../models/user");
const router = new Router();
router.post('/guest/session/book', user_1.User.bookGuestSession);
router.post('/skater-waiver/birthday', user_1.User.addSkaterWaiverForBirthdays);
router.post('/domo', user_1.User.addDomoBooking);
exports.default = router.routes();
