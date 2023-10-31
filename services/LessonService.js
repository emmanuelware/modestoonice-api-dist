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
class LessonService {
    static getLessons() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [lessons] = yield global.db.query('SELECT * FROM lessonPackage');
                for (let i = 0; i < lessons.length; i++) {
                    const [sessions] = yield global.db.query('SELECT lessonDate FROM lessonPackageItem WHERE lessonPackageId = :lessonPackageId', {
                        lessonPackageId: lessons[i].id
                    });
                    const [[bookedLessons]] = yield global.db.query('SELECT COUNT(*) AS total FROM lessonBookingParticipant WHERE lessonBookingId IN (SELECT id FROM lessonBooking WHERE lessonPackageId = :lessonPackageId)', {
                        lessonPackageId: lessons[i].id
                    });
                    lessons[i].sessions = sessions;
                    lessons[i].available = 15 - bookedLessons.total;
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
                yield UserService_1.UserService.storeSkaterWaiver(payload.waiver);
                let paymentResponse = null;
                logging_1.generateLogs('NodeApi', 'LessonService', 'bookLesson', `Total found: ${payload.amount}.`);
                try {
                    paymentResponse = yield SquareService_1.SquareService.processPayment({
                        amount: payload.amount,
                        locationId: payload.locationId,
                        sourceId: payload.sourceId
                    });
                }
                catch (e) {
                    return ResponseService_1.ResponseBuilder(e.message, 'Payment could not be processed', true);
                }
                const [insert] = yield global.db.query(`
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
                    transactionId: paymentResponse.data.payment.orderId || paymentResponse.data.payment.id
                });
                for (let i = 0; i < payload.participants.length; i++) {
                    const item = payload.participants[i];
                    yield global.db.query(`
          INSERT INTO lessonBookingParticipant (
            lessonBookingId,
            name,
            birthday,
            dateEntered
          ) VALUES (
            :lessonBookingId,
            :name,
            :birthday,
            NOW()
          )
        `, {
                        lessonBookingId: insert.insertId,
                        name: item.name,
                        birthday: moment(item.dob).format(constants_1.SQL_DATE_FORMAT)
                    });
                }
                const [lessonSessions] = yield global.db.query(`
        SELECT lpi.lessonDate, lp.lessonTimeStart, lp.lessonTimeEnd 
        FROM lessonPackageItem lpi
        JOIN lessonPackage lp ON lp.id = lpi.lessonPackageId
        WHERE lpi.lessonPackageId = :lessonPackageId`, {
                    lessonPackageId: payload.selectedPackageId
                });
                let lessonDates = '';
                for (let i = 0; i < lessonSessions.length; i++) {
                    lessonDates += `
          <li>
            ${moment(lessonSessions[i].lessonDate).format(constants_1.MOMENT_FORMAT_DATE)} from ${moment('1970-01-01 ' + lessonSessions[i].lessonTimeStart).format('HH:mm a')} to ${moment('1970-01-01 ' + lessonSessions[i].lessonTimeEnd).format('HH:mm a')}
          </li>\n`;
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

        <p>**** Skater Waiver ****</p>
        <p>All skaters are required to have a Waiver.  If additional waivers are needed under your Confirmation Number, please share the following link and your Confirmation number to everyone in your group for a smoother check-in when you arrive at the ice rink.  </p>

        <p>
          <a href="${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=session">Click here</a> or copy and paste this in your browser:
        </p>

        <p>${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=session</p>

        <hr>

        <p><i>Due to the limited availability, all sales are final. In some cases, based on availability, rescheduling of tickets and/or parties may be made by contacting Modesto On Ice.</i></p>

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
exports.LessonService = LessonService;
