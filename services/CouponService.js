"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ResponseService_1 = require("./ResponseService");
const constants_1 = require("../common/constants");
const moment = require("moment");
const UserService_1 = require("./UserService");
class CouponService {
    static getCoupons() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [coupons] = yield global.db.query('SELECT * FROM coupon WHERE deletedFlag = 0');
                coupons.map(el => {
                    el = this.formatCouponDatesAndTimes(el);
                });
                return ResponseService_1.ResponseBuilder(coupons, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getCouponByCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[coupon]] = yield global.db.query('SELECT * FROM coupon WHERE code = :code AND deletedFlag = 0', {
                    code: code
                });
                if (coupon) {
                    const couponValidation = yield UserService_1.UserService.checkCouponCodeValidity([coupon.code]);
                    if (couponValidation.err) {
                        return couponValidation;
                    }
                    else {
                        return ResponseService_1.ResponseBuilder(this.formatCouponDatesAndTimes(coupon), null, false);
                    }
                }
                else {
                    return ResponseService_1.ResponseBuilder(null, 'Coupon code not found', true);
                }
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static formatCouponDatesAndTimes(coupon) {
        const { startDate, endDate, startTime, endTime } = coupon;
        return Object.assign(Object.assign({}, coupon), { startDate: startDate ? moment(startDate).format(constants_1.SQL_DATE_FORMAT) : null, endDate: endDate ? moment(endDate).format(constants_1.SQL_DATE_FORMAT) : null, startTime: startTime ? moment(`1970-01-01 ${startTime}`).format(constants_1.SQL_TIME_FORMAT) : null, endTime: endTime ? moment(`1970-01-01 ${endTime}`).format(constants_1.SQL_TIME_FORMAT) : null });
    }
}
exports.CouponService = CouponService;
