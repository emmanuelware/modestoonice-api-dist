"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const account_1 = require("../models/account");
router.get('/account/barcode', account_1.Account.getAccountBarcodeNumber);
module.exports = router.middleware();
