"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const system_1 = require("../models/system");
const router = new Router();
router.post('/webhooks/order-created', system_1.System.orderCreated);
