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
const SystemService_1 = require("../services/SystemService");
const ResponseService_1 = require("../services/ResponseService");
const constants_1 = require("../common/constants");
class System {
    static updateMasterTicketInventory(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.updateMasterTicketInventory(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getSystemUserList(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getSystemUserList();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static searchSystemUsers(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield SystemService_1.SystemService.searchSystemUsers(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getSystemUserById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield SystemService_1.SystemService.getSystemUserById(ctx.params.userId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static editSystemUserSkaterWaiverById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield SystemService_1.SystemService.editSystemUserSkaterWaiverById(ctx.params.id, ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getSystemPasses(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getSystemPasses();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getSystemSkaterWaivers(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getSystemSkaterWaivers();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getSystemSkaterWaiverById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getSystemSkaterWaiverById(ctx.params.waiverId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getSystemPassById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getSystemPassById(ctx.params.passId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static searchSystemSkaterWaivers(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const performDeepSearch = ctx.query.performDeepSearch === '1' ? true : false;
            const res = yield SystemService_1.SystemService.searchSystemSkaterWaivers(ctx.params.query, performDeepSearch);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static searchSystemUserPasses(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.searchSystemUserPasses(ctx.params.query);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBirthdayBookingStatuses(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getBirthdayBookingStatuses();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateBirthdayStatus(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.updateBirthdayStatus(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static createSystemUser(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.createSystemUser(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateSystemUser(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.updateSystemUser(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBirthdayBookingById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getBirthdayBookingById(ctx.params.bookingId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateBirthdayBooking(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.updateBirthdayBooking(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getNumberOfPackagePizzas(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getNumberOfPackagePizzas(ctx.params.packageId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static addBirthdayBooking(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.addBirthdayBooking(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getTickets(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getTickets();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getDomoTickets(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getDomoTickets();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static searchTickets(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.searchTickets(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static searchDomoTickets(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.searchDomoTickets(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getTicketById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getTicketById(ctx.params.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getDomoTicketById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getDomoTicketById(ctx.params.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getLessons(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getLessons();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getLessonById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getLessonById(ctx.params.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static searchLessons(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.searchLessons(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static logPassUsageWithConfirmationNumber(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.logPassUsageWithConfirmationNumber(ctx.params.confirmationNumber);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getDomoPassByConfirmationNumber(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getDomoPassByConfirmationNumber(ctx.params.confirmationNumber);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBirthdayBookingByConfirmationNumber(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getBirthdayBookingByConfirmationNumber(ctx.params.confirmationNumber);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static searchBirthdayBookings(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.searchBirthdayBookings(ctx.request.body.searchTerm);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static sendSeasonBarcodeReminders(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.sendSeasonBarcodeReminders();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateUserTicketSession(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.updateUserTicketSession(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getSquareTransactionById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getSquareTransactionById(ctx.params.transactionId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBirthdaySessions(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.getBirthdaySessions();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateBirthdaySessionAvailability(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.updateBirthdaySessionAvailability(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static createCoupon(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.createCoupon(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateCoupon(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.updateCoupon(ctx.params.id, ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static deleteCouponById(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield SystemService_1.SystemService.deleteCouponById(ctx.params.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.System = System;
