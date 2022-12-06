"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const coupon_1 = require("../models/coupon");
const router = new Router();
router.get('/coupon/:code', coupon_1.Coupon.getCouponByCode);
router.get('/coupon', coupon_1.Coupon.getCoupons);
exports.default = router.routes();
//# sourceMappingURL=coupon.js.map