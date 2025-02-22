"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const square_1 = require("../models/square");
const router = new Router();
router.get('/square/application-id', square_1.Square.getApplicationId);
router.get('/square/birthday-deposit', square_1.Square.getBirthdayPackageDeposit);
router.post('/square/payment', square_1.Square.processPayment);
router.post('/square/ticket-item', square_1.Square.getItemByTicketItemId);
exports.default = router.routes();
//# sourceMappingURL=square-public.js.map