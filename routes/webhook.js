"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const webhook_1 = require("../models/webhook");
const router = new Router();
router.post('/webhook/sync-stock', webhook_1.Webhook.syncStock);
exports.default = router.routes();
