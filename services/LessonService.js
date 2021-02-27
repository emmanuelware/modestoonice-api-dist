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
const EmailService_1 = require("./EmailService");
const ResponseService_1 = require("./ResponseService");
const SquareService_1 = require("./SquareService");
const UtilService_1 = require("./UtilService");
const email_constants_1 = require("../common/email.constants");
const logging_1 = require("../utils/logging");
const moment = require("moment");
const constants_1 = require("../common/constants");
class LessonService {
    static getLessons() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [lessons] = yield global.db.query('SELECT * FROM lessonPackage');
                for (let i = 0; i < lessons.length; i++) {
                    const [sessions] = yield global.db.query('SELECT lessonDate FROM lessonPackageItem WHERE lessonPackageId = :lessonPackageId', {
                        lessonPackageId: lessons[i].id
                    });
                    const [[bookedLessons]] = yield global.db.query('SELECT COUNT(*) AS total FROM lessonBooking WHERE lessonPackageId = :lessonPackageId', {
                        lessonPackageId: lessons[i].id
                    });
                    lessons[i].sessions = sessions;
                    lessons[i].available = 18 - bookedLessons.total;
                }
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
                let paymentResponse = null;
                logging_1.generateLogs('NodeApi', 'LessonService', 'bookLesson', `Total found: ${payload.amount}.`);
                paymentResponse = yield SquareService_1.SquareService.processPayment({
                    amount: payload.amount,
                    nonce: payload.nonce
                });
                if (!paymentResponse ||
                    !paymentResponse.data ||
                    !paymentResponse.data.transaction ||
                    !paymentResponse.data.transaction.id) {
                    console.log(paymentResponse);
                    return ResponseService_1.ResponseBuilder(null, 'Payment could not be processed', true);
                }
                yield global.db.query(`
        INSERT INTO lessonBooking (
          lessonPackageId,
          firstName,
          lastName,
          email,
          phone,
          confirmationNumber,
          transactionId,
          dateEntered
        ) VALUES (
          :lessonPackageId,
          :firstName,
          :lastName,
          :email,
          :phone,
          :confirmationNumber,
          :transactionId,
          NOW()
        )
      `, {
                    lessonPackageId: payload.selectedPackageId || null,
                    firstName: payload.firstName || null,
                    lastName: payload.lastName || null,
                    email: payload.email || null,
                    phone: payload.phone || null,
                    confirmationNumber: confirmationNumber,
                    transactionId: paymentResponse.data.transaction.id
                });
                const [lessonSessions] = yield global.db.query('SELECT lessonDate FROM lessonPackageItem WHERE lessonPackageId = :lessonPackageId', {
                    lessonPackageId: payload.selectedPackageId
                });
                let lessonDates = '';
                for (let i = 0; i < lessonSessions.length; i++) {
                    lessonDates += `<li>${moment(lessonSessions[i].lessonDate).format(constants_1.MOMENT_FORMAT_DATE)}</li>\n`;
                }
                yield EmailService_1.EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Your Lesson Information', `
        <h3>Thanks for booking a lesson with Modesto On Ice!</h3>

        <p>Below is your booking information.</p>

        <p>Confirmation code: <b>${confirmationNumber}</b></p>

        <p>Lesson dates:</p>
    
        <ul>
          ${lessonDates}
        </ul>
  
        <p>Total: <b>$${(payload.amount / 100).toFixed(2)}</b></p>

        <hr>

        <p><a href="${process.env.DOMAIN}/skater-waiver?type=lesson">Sign your skater waiver</a> before you get to the rink!</p>

        <p>Having trouble viewing the link? Copy and paste this in your browser: ${process.env.DOMAIN}/skater-waiver?type=lesson</p>
      `);
                return Object.assign({}, paymentResponse, { data: {
                        confirmationNumber: confirmationNumber
                    } });
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
}
exports.LessonService = LessonService;
