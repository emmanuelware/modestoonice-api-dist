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
class ReservationService {
    static bookReservation(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query(`
        INSERT INTO reservationBooking (
          userId,
          userFirstName,
          userLastName,
          userEmail,
          userPhone,
          reservationDate,
          startingTime,
          endingTime,
          numberOfSkaters,
          notes,
          dateEntered
        ) VALUES (
          :userId,
          :userFirstName,
          :userLastName,
          :userEmail,
          :userPhone,
          :reservationDate,
          :startingTime,
          :endingTime,
          :numberOfSkaters,
          :notes,
          NOW()
        )
      `, {
                    userId: userId || null,
                    userFirstName: payload.firstName,
                    userLastName: payload.lastName,
                    userEmail: payload.email,
                    userPhone: payload.phone,
                    reservationDate: payload.reservationDate,
                    startingTime: payload.startingTime,
                    endingTime: payload.endingTime,
                    numberOfSkaters: payload.numberOfSkaters,
                    notes: payload.notes
                });
                return ResponseService_1.ResponseBuilder(payload, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getBookedReservations() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [todaysReservations] = yield global.db.query('SELECT * FROM reservationBooking WHERE reservationDate = CURDATE()');
                const [upcomingReservations] = yield global.db.query('SELECT * FROM reservationBooking WHERE reservationDate > CURDATE()');
                return ResponseService_1.ResponseBuilder({
                    todaysReservations,
                    upcomingReservations
                }, null, true);
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
exports.ReservationService = ReservationService;
