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
const BirthdayService_1 = require("../services/BirthdayService");
const ResponseService_1 = require("../services/ResponseService");
const constants_1 = require("../common/constants");
class Birthday {
    static bookBirthday(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.bookBirthday(ctx.request.body, ctx.state.user ? ctx.state.user.id : null);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBookedBirthdayById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.getBookedBirthdayById(ctx.params.birthdayId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getAllBookedBirthdaySessions(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield BirthdayService_1.BirthdayService.getAllBookedBirthdaySessions();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static upsertBirthdayImage(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.upsertBirthdayImage(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBirthdayCoverImageById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.getBirthdayCoverImageById(ctx.params.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static upsertBirthdayExtraImage(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.upsertBirthdayExtraImage(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getAvailableBirthdaySessionsByDate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.getAvailableBirthdaySessionsByDate(ctx.params.date);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    /**
     * Packages
     */
    static getBirthdayPackages(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.getBirthdayPackages();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBirthdayPackageById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.getBirthdayPackageById(ctx.params.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static addBirthdayPackage(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.addBirthdayPackage(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateBirthdayPackage(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield BirthdayService_1.BirthdayService.updateBirthdayPackage(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static deletePackageById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield BirthdayService_1.BirthdayService.deletePackageById(ctx.params.packageId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    /**
     * Extras
     */
    static getBirthdayExtras(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.getBirthdayExtras();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBirthdayExtraById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.getBirthdayExtraById(ctx.params.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static addBirthdayExtraBatch(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield BirthdayService_1.BirthdayService.addBirthdayExtraBatch(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateExtraById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield BirthdayService_1.BirthdayService.updateExtraById(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static deleteExtraById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield BirthdayService_1.BirthdayService.deleteExtraById(ctx.params.extraId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getTodayBirthdayBookings(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield BirthdayService_1.BirthdayService.getTodayBirthdayBookings();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.Birthday = Birthday;
//# sourceMappingURL=birthday.js.map