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
const EmailService_1 = require("./EmailService");
const ResponseService_1 = require("./ResponseService");
const SquareService_1 = require("./SquareService");
const UserService_1 = require("./UserService");
const UtilService_1 = require("./UtilService");
const logging_1 = require("../utils/logging");
const constants_1 = require("../common/constants");
const email_constants_1 = require("../common/email.constants");
const moment = require("moment");
class HockeyService {
    static getLessons() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [lessons] = yield global.db.query(`
        SELECT hl.*, (hl.maxParticipants - IFNULL(hlbc.numBooked, 0)) as available
        FROM hockeyLesson hl 
        LEFT JOIN hockeyLessonBookingCount hlbc 
          ON hlbc.hockeyLessonId = hl.id
        WHERE (hl.maxParticipants - IFNULL(hlbc.numBooked, 0)) >= 0
      `);
                return ResponseService_1.ResponseBuilder(lessons, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static bookLesson(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logging_1.generateLogs('NodeApi', 'LessonService', 'bookLesson', `Starting to book lesson.`);
                const confirmationNumber = UtilService_1.UtilService.generateRandomString(12, {
                    numbers: true
                }).toUpperCase();
                yield UserService_1.UserService.storeSkaterWaiver(payload.waiver);
                let paymentResponse = null;
                logging_1.generateLogs('NodeApi', 'LessonService', 'bookLesson', `Total found: ${payload.amount}.`);
                paymentResponse = yield SquareService_1.SquareService.processPayment({
                    amount: payload.amount,
                    locationId: payload.locationId,
                    sourceId: payload.sourceId
                });
                const [insert] = yield global.db.query(`
        INSERT INTO
        hockeyLessonBooking (
            hockeyLessonId,
            firstName,
            lastName,
            email,
            phone,
            confirmationNumber,
            transactionId,
            dateEntered,
            totalPrice,
            isCanceled
        ) VALUES (
            :hockeyLessonId,
            :firstName,
            :lastName,
            :email,
            :phone,
            :confirmationNumber,
            :transactionId,
            NOW(),
            :totalPrice,
            :isCanceled
        )
        `, {
                    hockeyLessonId: payload.selectedLessonId || null,
                    firstName: payload.firstName || null,
                    lastName: payload.lastName || null,
                    email: payload.email || null,
                    phone: payload.phone || null,
                    confirmationNumber: confirmationNumber,
                    transactionId: paymentResponse.data.payment.id,
                    totalPrice: payload.amount,
                    isCanceled: 0
                });
                let participantsHtml = '';
                for (let i = 0; i < payload.participants.length; i++) {
                    const item = payload.participants[i];
                    yield global.db.query(`
          INSERT INTO hockeyLessonBookingParticipant (
            hockeyLessonBookingId,
            firstName,
            lastName,
            dateOfBirth,
            dateEntered
          ) VALUES (
            :hockeyLessonBookingId,
            :firstName,
            :lastName,
            :dateOfBirth,
            NOW()
          )
        `, {
                        hockeyLessonBookingId: insert.insertId,
                        firstName: item.firstName,
                        lastName: item.lastName,
                        dateOfBirth: moment(item.dateOfBirth).format(constants_1.SQL_DATE_FORMAT)
                    });
                    participantsHtml += `<li>${item.firstName} ${item.lastName}</li>\n`;
                }
                yield EmailService_1.EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Your Learn to Play Hockey Booking Information', `
        <h3>Thanks for booking Learn to Play Hockey with Modesto On Ice!</h3>

        <p>Below is your booking information</p>

        <p>Confirmation code: <b>${confirmationNumber}</b></p>

        <p>Participant(s) First and Last Name(s):</p>
    
        <ul>
          ${participantsHtml}
        </ul>
  
        <p>Total: <b>$${(payload.amount / 100).toFixed(2)}</b></p>

        <hr>

        <p>Use the barcode below to check-in at the ticket booth!</p>

        <img alt="Your barcode" src="https://www.webarcode.com/barcode/image.php?code=${confirmationNumber}&type=C128A&xres=1&height=100&width=200&font=3&output=png&style=197">
        
        <hr>

        <p class="attrition">Barcodes generated by <a href="https://www.webarcode.com">www.webarcode.com</a>.</p>
      `);
                return Object.assign(Object.assign({}, paymentResponse), { data: {
                        confirmationNumber: confirmationNumber
                    } });
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(err.message, "An error has occurred", true, {
                    error: err,
                    log: true
                });
            }
        });
    }
}
exports.HockeyService = HockeyService;
