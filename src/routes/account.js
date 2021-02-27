"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const account_1 = require("../models/account");
const router = new Router();
router.get('/account/barcode', account_1.Account.getAccountBarcodeNumber);
exports.default = router.routes();
