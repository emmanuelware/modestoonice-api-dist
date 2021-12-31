#!/usr/bin/env node
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
const SquareService_1 = require("../services/SquareService");
const rx_helpers_1 = require("../common/rx.helpers");
const random_second_1 = require("../common/random-second");
const args_1 = require("../utils/args");
const logging_1 = require("../utils/logging");
const constants_1 = require("../common/constants");
const consts_1 = require("./consts");
const moment = require("moment");
const mysql = require("mysql2/promise");
const path = require('path');
require('dotenv').config({ path: args_1.getArgs().envPath || path.join(__dirname, '.env') });
const environmentName = 'Crontab';
const processName = 'ticketPreSaleMonitor';
const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};
function inventoryChangeListener() {
    return __awaiter(this, void 0, void 0, function* () {
        const pool = mysql.createPool(config);
        const db = yield pool.getConnection();
        db.connection.config.namedPlaceholders = true;
        yield db.query('SET SESSION sql_mode = "TRADITIONAL"');
        while (true) {
            logging_1.generateLogs(environmentName, processName, '', 'Starting process.');
            yield new Promise((resolve, reject) => {
                SquareService_1.SquareService.findCalendarDateSessions()
                    .then((res) => __awaiter(this, void 0, void 0, function* () {
                    if (!res.err) {
                        const currentDateString = moment().format('MMM DD');
                        logging_1.generateLogs(environmentName, processName, 'inventoryChangeListener', `currentDateString is ${currentDateString}`);
                        for (let i = 0; i < res.data.length; i++) {
                            const session = res.data[i];
                            logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Checking date: ${session.itemData.name}`);
                            yield rx_helpers_1.wait(30).catch(err => console.error(err));
                            if (consts_1.SESSIONS_TO_IGNORE.includes(session.itemData.name)) {
                                logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Skipping, found in SESSIONS_TO_IGNORE: ${session.itemData.name}`);
                            }
                            if (moment(session.itemData.name).isBefore(moment().add(30, 'minutes'))) {
                                logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Date is not at least one day in the future; skipping`);
                                continue;
                            }
                            if (!session.itemData.variations[0] ||
                                !session.itemData.variations[0].inventory ||
                                !session.itemData.variations[1] ||
                                !session.itemData.variations[1].inventory ||
                                !session.itemData.variations[2] ||
                                !session.itemData.variations[2].inventory) {
                                logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Session data not available for ${session.itemData.name}`);
                                continue;
                            }
                            if (!session.itemData.variations[2] || !session.itemData.variations[2].inventory) {
                                logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Session inventory not available for ${session.itemData.name}`);
                                continue;
                            }
                            let maximumSessionInventory = 160;
                            if (session.itemData.name.includes('Nov 19') ||
                                session.itemData.name === ('Dec 31 2021 22:15')) {
                                logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Setting maximumSessionInventory to 120 for: ${session.itemData.name}`);
                                maximumSessionInventory = 120;
                            }
                            const [[ticketingAppTicketCounts]] = yield db.query(`
                SELECT 
                  IFNULL(SUM(adultTickets), 0) AS adultTickets, 
                  IFNULL(SUM(childTickets), 0) AS childTickets 
                FROM userTicket 
                WHERE itemId = :itemId`, {
                                itemId: session.id
                            });
                            const mysqlDateTime = moment(session.itemData.name).format(constants_1.SQL_DATETIME_FORMAT);
                            const [[ticketingAppBirthdayCounts]] = yield db.query(`
                SELECT IFNULL(SUM(bp.skatersIncluded), 0) totalTickets
                FROM birthdayBooking bb
                LEFT JOIN birthdayPackage bp ON bp.id = bb.birthdayPackageId
                LEFT JOIN birthdaySession bs ON bs.id = bb.birthdaySessionId
                WHERE bs.datetime = '${mysqlDateTime}'`);
                            logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Ticket totals - adultTickets: ${ticketingAppTicketCounts.adultTickets}, childTickets: ${ticketingAppTicketCounts.childTickets}, ticketingAppBirthdayCounts: ${ticketingAppBirthdayCounts.totalTickets}`);
                            const adultPreSaleCount = Number(ticketingAppTicketCounts.adultTickets) + Number(ticketingAppBirthdayCounts.totalTickets);
                            const childPreSaleCount = Number(ticketingAppTicketCounts.childTickets);
                            const masterPreSaleCount = Number(adultPreSaleCount + childPreSaleCount);
                            const adultTicketRemainingQuantity = maximumSessionInventory - adultPreSaleCount;
                            const childTicketRemainingQuantity = maximumSessionInventory - childPreSaleCount;
                            const masterTicketRemainingQuantity = maximumSessionInventory - masterPreSaleCount;
                            logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Setting the following: adultTicketRemainingQuantity: ${adultTicketRemainingQuantity}, childTicketRemainingQuantity: ${childTicketRemainingQuantity}, masterTicketRemainingQuantity: ${masterTicketRemainingQuantity}`);
                            yield rx_helpers_1.wait(random_second_1.getRandomMilliseconds()).catch(err => console.error(err));
                            yield SquareService_1.SquareService.setMasterCount(adultTicketRemainingQuantity, childTicketRemainingQuantity, masterTicketRemainingQuantity, session.itemData.variations[0].id, session.itemData.variations[1].id, session.itemData.variations[2].id).catch(err => console.error(err));
                        }
                        resolve(null);
                    }
                    else {
                        console.error(res.err);
                        reject(res.err);
                    }
                }))
                    .catch(err => console.error(err));
            });
            logging_1.generateLogs(environmentName, processName, 'inventoryChangeListener', 'Ending process; waiting 2.5 minutes.');
            yield rx_helpers_1.wait(150000).catch(err => console.error(err));
            process.exit();
        }
    });
}
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield inventoryChangeListener().catch(err => console.error(err));
    });
})();
