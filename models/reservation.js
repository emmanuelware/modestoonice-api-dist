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
const ReservationService_1 = require("../services/ReservationService");
const ResponseService_1 = require("../services/ResponseService");
class Reservation {
    static bookReservation(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield ReservationService_1.ReservationService.bookReservation(ctx.request.body, ctx.state.user.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBookedReservations(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield ReservationService_1.ReservationService.getBookedReservations();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.Reservation = Reservation;
//# sourceMappingURL=reservation.js.map