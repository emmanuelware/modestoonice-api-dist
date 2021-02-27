"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const square_1 = require("../models/square");
router.get('/square/application-id', square_1.Square.getApplicationId);
router.get('/square/birthday-deposit', square_1.Square.getBirthdayPackageDeposit);
router.post('/square/payment', square_1.Square.processPayment);
router.post('/square/ticket-item', square_1.Square.getItemByTicketItemId);
module.exports = router.middleware();
