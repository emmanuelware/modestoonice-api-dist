"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const user_1 = require("../models/user");
router.post('/guest/session/book', user_1.User.bookGuestSession);
router.post('/skater-waiver/birthday', user_1.User.addSkaterWaiverForBirthdays);
router.post('/domo', user_1.User.addDomoBooking);
module.exports = router.middleware();
