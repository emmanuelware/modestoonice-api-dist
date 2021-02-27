"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const CouponService_1 = require("../services/CouponService");
const ResponseService_1 = require("../services/ResponseService");
class Coupon {
    static getCoupons(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield CouponService_1.CouponService.getCoupons();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getCouponByCode(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield CouponService_1.CouponService.getCouponByCode(ctx.params.code);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static addCoupon(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield CouponService_1.CouponService.addCoupon(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateCoupon(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield CouponService_1.CouponService.updateCoupon(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static deleteCoupon(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield CouponService_1.CouponService.deleteCoupon(ctx.params.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.Coupon = Coupon;
