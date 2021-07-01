"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const square_1 = require("../models/square");
const router = new Router();
router.post('/square/transactions', square_1.Square.getTransactions);
exports.default = router.routes();
