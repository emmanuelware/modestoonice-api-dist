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
const ResponseService_1 = require("./ResponseService");
class CouponService {
    static getCoupons() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [coupons] = yield global.db.query('SELECT * FROM coupon');
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
                const [[coupon]] = yield global.db.query('SELECT amount, type FROM coupon WHERE code = :code', {
                    code: code
                });
                if (coupon) {
                    return ResponseService_1.ResponseBuilder(coupon, null, false);
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
    static addCoupon(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('INSERT INTO coupon (amount, type, code, dateEntered) VALUES (:amount, :type, :code, NOW())', {
                    amount: payload.amount,
                    type: payload.type,
                    code: payload.code
                });
                return ResponseService_1.ResponseBuilder(null, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static updateCoupon(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('UPDATE coupon SET amount = :amount, type = :type, code = :code WHERE id = :id', {
                    id: payload.id,
                    amount: payload.amount,
                    type: payload.type,
                    code: payload.code
                });
                return ResponseService_1.ResponseBuilder(null, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static deleteCoupon(couponId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('DELETE FROM coupon WHERE id = :id', {
                    id: couponId
                });
                return ResponseService_1.ResponseBuilder(null, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
}
exports.CouponService = CouponService;
