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
const EmailService_1 = require("./services/EmailService");
const rx_helpers_1 = require("./common/rx.helpers");
const logging_1 = require("./utils/logging");
const fs = require("fs");
const moment = require("moment");
const mysql = require("mysql2/promise");
const pdfkit = require("pdfkit");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Starting report.');
            const styles = {
                headingFontSize: 24,
                subheadingFontSize: 18,
                textFontSize: 15,
                linePadding: 2,
                noDataPlaceholder: '-'
            };
            const config = {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_DATABASE
            };
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Creating database connection pool.');
            const pool = mysql.createPool(config);
            const db = yield pool.getConnection();
            db.connection.config.namedPlaceholders = true;
            yield db.query('SET SESSION sql_mode = "TRADITIONAL"');
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Connected to database.');
            const doc = new pdfkit();
            const key = 'test';
            const pdfDir = `${process.env.REPORT_DIR}/${key}.pdf`;
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', `Starting report at ${pdfDir}.`);
            if (!fs.existsSync(process.env.REPORT_DIR)) {
                logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', `Generating directory ${process.env.REPORT_DIR}.`);
                fs.mkdirSync(process.env.REPORT_DIR, {
                    recursive: true
                });
            }
            yield doc.pipe(fs.createWriteStream(pdfDir));
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Created write stream; creating cover page');
            doc.font('Helvetica-Bold');
            doc.moveDown(21);
            doc.fontSize(styles.headingFontSize).text('Daily Birthday Booking Report', {
                align: 'center'
            });
            doc.font('Helvetica');
            doc.fontSize(styles.textFontSize).text('Modesto On Ice', {
                align: 'center'
            });
            doc.text(moment().format('dddd, MMMM Do YYYY'), {
                align: 'center'
            });
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Creating session pages.');
            const formattedDate = moment().format('YYYY-MM-DD');
            const startDate = `${formattedDate} 00:00:00`;
            const endDate = `${formattedDate} 23:59:59`;
            const [sessions] = yield db.query(`
      SELECT 
        bb.*,
        bp.name AS packageName
      FROM birthdayBooking bb 
      LEFT JOIN birthdayPackage bp
      ON bp.id = bb.birthdayPackageId
      WHERE (bb.dateEntered BETWEEN :startDate AND :endDate)`, {
                startDate,
                endDate
            });
            for (let i = 0; i < sessions.length; i++) {
                logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', `Creating session page ${i + 1} of ${sessions.length}`);
                const session = sessions[i];
                const [pizzaRecords] = yield db.query('SELECT * FROM birthdayBookingPizza WHERE birthdayBookingId = :id', {
                    id: session.id
                });
                const pizzas = pizzaRecords.map(pizza => {
                    return pizza.pizzaType;
                });
                const [[birthdaySessionRecord]] = yield db.query('SELECT * FROM birthdaySession WHERE id = :id', {
                    id: session.birthdaySessionId
                });
                const [extras] = yield db.query(`
        SELECT 
          be.name AS extraName,
          bbe.quantity, 
          be.price AS extraPrice
        FROM birthdayBookingExtra bbe
        LEFT JOIN birthdayExtra be
        ON bbe.birthdayExtraId = be.id
        WHERE bbe.birthdayBookingId = :id
      `, {
                    id: session.id
                });
                doc.addPage();
                doc.font('Helvetica-Bold');
                doc.fontSize(styles.headingFontSize).text(`Birthday Booking #${i + 1}`, {
                    align: 'center'
                });
                doc.font('Helvetica');
                doc
                    .fontSize(styles.subheadingFontSize)
                    .text(`${moment(birthdaySessionRecord.datetime).format('dddd, MMMM Do YYYY, h:mm:ss a')}`, {
                    align: 'center'
                });
                doc.moveDown(styles.linePadding);
                doc.fontSize(styles.textFontSize);
                doc.font('Helvetica-Bold');
                doc.text('Confirmation number', {
                    align: 'left'
                });
                doc.font('Helvetica');
                doc.text(session.confirmationNumber || styles.noDataPlaceholder);
                doc.moveDown(styles.linePadding);
                doc
                    .font('Helvetica-Bold')
                    .text('User information')
                    .font('Helvetica');
                doc.text(`Name: ${session.userFirstName} ${session.userLastName}`);
                doc.text(`Phone: ${session.userPhone || styles.noDataPlaceholder}`);
                doc.text(`Email: ${session.userEmail || styles.noDataPlaceholder}`);
                if (extras.length) {
                    doc.moveDown(styles.linePadding);
                    doc
                        .font('Helvetica-Bold')
                        .text('Extras')
                        .font('Helvetica');
                    extras.map(extra => {
                        doc.text(`${extra.extraName}: ${extra.quantity} at $${extra.extraPrice.toFixed(2)} each`);
                    });
                }
                doc.moveDown(styles.linePadding);
                doc
                    .font('Helvetica-Bold')
                    .text('Package')
                    .font('Helvetica');
                doc.text(`Selected package: ${session.packageName || styles.noDataPlaceholder}`);
                doc.text(`Pizzas requested: ${pizzas.join(', ')}`);
                doc.moveDown(styles.linePadding);
                doc
                    .font('Helvetica-Bold')
                    .text('Notes')
                    .font('Helvetica');
                doc.text(`Notes: ${session.notes || styles.noDataPlaceholder}`);
            }
            yield doc.end();
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Done creating; waiting 5000 ms.');
            yield rx_helpers_1.wait(5000);
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Converting report to base64.');
            const base64Data = yield new Promise((resolve, reject) => {
                fs.readFile(pdfDir, function (err, data) {
                    if (err) {
                        reject(err);
                    }
                    resolve(data.toString('base64'));
                });
            });
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Waiting 1000 ms.');
            yield rx_helpers_1.wait(1000);
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Generated base64-encoded data.');
            const [dailyNotificationEmails] = yield db.query('SELECT * FROM birthdayReportEmailList');
            for (let i = 0; i < dailyNotificationEmails.length; i++) {
                logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', `Sending report to ${dailyNotificationEmails[i].email}.`);
                yield EmailService_1.EmailService.sendReportEmail(dailyNotificationEmails[i].email, moment(), base64Data);
            }
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', 'Done.');
        }
        catch (err) {
            logging_1.generateLogs('Cron', 'SessionReportService', 'generateSessionReport', `An error was produced: ${err}`);
            throw new Error(err);
        }
    });
}
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield main().catch(err => {
            throw new Error(err);
        });
    });
})();
