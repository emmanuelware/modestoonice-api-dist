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
const CalendarService_1 = require("../services/CalendarService");
const ResponseService_1 = require("../services/ResponseService");
const constants_1 = require("../common/constants");
class Calendar {
    static addSession(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield CalendarService_1.CalendarService.addSession(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateSession(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield CalendarService_1.CalendarService.updateSession(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateSessionInventory(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield CalendarService_1.CalendarService.updateSessionInventory(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getSessionsByCalendarDate(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield CalendarService_1.CalendarService.getSessionsByCalendarDate(ctx.params.date);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static deleteSessionBySquareItemId(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield CalendarService_1.CalendarService.deleteSessionBySquareItemId(ctx.params.squareSessionItemId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.Calendar = Calendar;
