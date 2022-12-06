"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const webhook_1 = require("../models/webhook");
const router = new Router();
router.post('/webhook/sync-stock/:eventName', webhook_1.Webhook.syncStock);
router.post('/webhook/recount-stock', webhook_1.Webhook.recountStock);
exports.default = router.routes();
