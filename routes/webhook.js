"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const webhook_1 = require("../models/webhook");
const router = new Router();
router.post('/webhook/order-created', webhook_1.Webhook.orderCreated);
exports.default = router.routes();
