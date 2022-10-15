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
const constants_1 = require("../common/constants");
const rx_helpers_1 = require("../common/rx.helpers");
const args_1 = require("../utils/args");
const square_1 = require("square");
const Excel = require("exceljs");
const moment = require("moment");
const mysql = require("mysql2/promise");
const path = require('path');
require('dotenv').config({ path: args_1.getArgs().envPath || path.join(__dirname, '../.env') });
const accessToken = process.env.SQUARE_TOKEN;
const locationId = process.env.SQUARE_LOCATION_ID;
const squareConnect = new square_1.Client({
    environment: square_1.Environment.Production,
    accessToken
});
const { catalogApi, ordersApi } = squareConnect;
const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};
global.connectionPool = mysql.createPool(config);
const sessionCache = new Map();
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const db = (global.db = yield global.connectionPool.getConnection());
        db.connection.config.namedPlaceholders = true;
        yield global.db.query('UPDATE appCache SET squareReportTotalResults = 0, squareReportCurrentIndex = 0');
        const currentDate = moment('2021-09-01');
        const endDate = moment('2022-01-31');
        let workbook = new Excel.Workbook();
        let worksheet = workbook.addWorksheet('Transactions');
        worksheet.columns = [
            { header: 'Id', key: 'id' },
            { header: 'Date', key: 'date' },
            { header: 'Time', key: 'time' },
            { header: 'Session', key: 'session' },
            { header: 'First name', key: 'firstName' },
            { header: 'Last name', key: 'lastName' },
            { header: 'Email', key: 'email' },
            { header: 'Phone', key: 'phone' },
            { header: 'Confirmation number', key: 'confirmationNumber' },
            { header: 'Adult tickets', key: 'adultTickets' },
            { header: 'Child tickets', key: 'childTickets' },
            { header: 'Pass type', key: 'passType' },
            { header: 'Total', key: 'total' },
            { header: 'Transaction type', key: 'transactionType' }
        ];
        worksheet.columns.forEach(column => {
            column.width = column.header.length < 12 ? 12 : column.header.length;
        });
        while (currentDate.isSameOrBefore(endDate)) {
            console.log('\n');
            console.log('Processing', currentDate.format('YYYY-MM-DD'));
            const startAt = currentDate.format('YYYY-MM-DD') + 'T00:00:00+00:00';
            const endAt = currentDate.format('YYYY-MM-DD') + 'T23:59:59+00:00';
            console.log('startAt', startAt, 'endAt', endAt);
            const data = yield ordersApi.searchOrders({
                locationIds: [locationId],
                returnEntries: false,
                limit: 10000,
                query: {
                    filter: {
                        stateFilter: {
                            states: ['COMPLETED']
                        },
                        dateTimeFilter: {
                            closedAt: {
                                startAt,
                                endAt
                            }
                        }
                    },
                    sort: {
                        sortField: 'CLOSED_AT',
                        sortOrder: 'DESC'
                    }
                }
            });
            yield processOrdersForDate(data, worksheet, currentDate);
            currentDate.add(1, 'days');
        }
        console.log('Writing to filesystem');
        yield workbook.xlsx.writeFile('./out.xlsx');
        yield rx_helpers_1.wait(2500);
        process.exit(0);
    });
})();
function processOrdersForDate(data, worksheet, currentDate) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!data.result.orders) {
            console.warn('data.result.orders not an array', data.result.orders);
            return;
        }
        console.log('data.result.orders.length', data.result.orders.length);
        for (let i = 0; i < data.result.orders.length; i++) {
            console.log('Processing', i + 1, 'of', data.result.orders.length, 'for', currentDate.format('YYYY-MM-DD'));
            const order = data.result.orders[i];
            const dbRecord = yield findDbRecord(order.id);
            let sessionName = null;
            if (dbRecord && dbRecord.itemId) {
                if (sessionCache.get(dbRecord.itemId)) {
                    sessionName = sessionCache.get(dbRecord.itemId);
                }
                else {
                    const session = yield getItemById(dbRecord.itemId);
                    sessionName = session.itemData.name;
                    sessionCache.set(dbRecord.itemId, session.itemData.name);
                }
            }
            worksheet.addRow({
                id: order.id,
                date: moment(order.createdAt).format(constants_1.MOMENT_FORMAT_DATE),
                time: moment(order.createdAt).format(constants_1.MOMENT_FORMAT_TIME),
                session: sessionName,
                firstName: dbRecord ? dbRecord.firstName : '',
                lastName: dbRecord ? dbRecord.lastName : '',
                email: dbRecord ? dbRecord.email : '',
                phone: dbRecord ? dbRecord.phone : '',
                confirmationNumber: dbRecord ? dbRecord.confirmationNumber : '',
                adultTickets: dbRecord ? dbRecord.adultTickets : '',
                childTickets: dbRecord ? dbRecord.childTickets : '',
                passType: dbRecord ? dbRecord.passType : '',
                total: (Number(order.totalMoney.amount) / 100).toFixed(2),
                transactionType: dbRecord ? dbRecord.transactionType : 'ticketBooth'
            });
        }
    });
}
function getItemById(itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!itemId || !itemId.length || itemId === 'null') {
            console.error('itemId require');
            process.exit(1);
        }
        return yield new Promise(resolve => {
            const body = {};
            catalogApi.searchCatalogObjects(body).then(data => {
                let item = null;
                data.result.objects.map(object => {
                    if (object.id === itemId) {
                        item = object;
                    }
                });
                if (!item) {
                    console.error('Ticket item not found');
                    process.exit(1);
                }
                resolve(item);
            }, error => {
                console.error(error);
                process.exit(1);
            });
        });
    });
}
function findDbRecord(transactionId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!transactionId) {
            console.error('transactionId required');
            process.exit(1);
        }
        const [[ticketRecord]] = yield global.db.query('SELECT * FROM userTicket WHERE transactionId = :transactionId', {
            transactionId
        });
        if (ticketRecord) {
            return Object.assign(Object.assign({}, ticketRecord), { transactionType: 'userTicket' });
        }
        const [[birthdayBookingRecord]] = yield global.db.query(`
    SELECT
      userFirstName AS firstName, 
      userLastName as lastName, 
      userEmail AS email, 
      userPhone AS phone, 
      confirmationNumber
    FROM birthdayBooking
    WHERE transactionId = :transactionId`, {
            transactionId
        });
        if (birthdayBookingRecord) {
            return Object.assign(Object.assign({}, birthdayBookingRecord), { transactionType: 'birthdayBooking' });
        }
        const [[userPassRecord]] = yield global.db.query(`
    SELECT 
      u.name AS firstName,
      u.email AS email,
      u.phone AS phone,
      up.confirmationCode
    FROM userPass up
    LEFT JOIN user u ON u.id = up.userId
    WHERE up.transactionId = :transactionId`, {
            transactionId
        });
        if (userPassRecord) {
            return Object.assign(Object.assign({}, userPassRecord), { transactionType: 'userPass' });
        }
        const [[lessonBookingRecord]] = yield global.db.query('SELECT * FROM lessonBooking WHERE transactionId = :transactionId', {
            transactionId
        });
        if (lessonBookingRecord) {
            return Object.assign(Object.assign({}, lessonBookingRecord), { transactionType: 'lessonBooking' });
        }
    });
}
