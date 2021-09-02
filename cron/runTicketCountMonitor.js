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
const logging_1 = require("../utils/logging");
const random_second_1 = require("../common/random-second");
const rx_helpers_1 = require("../common/rx.helpers");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const environmentName = 'Crontab';
const processName = 'inventoryChangeListener';
function inventoryChangeListener() {
    return __awaiter(this, void 0, void 0, function* () {
        while (true) {
            logging_1.generateLogs(environmentName, processName, '', 'Starting process.');
            yield new Promise((resolve, reject) => {
                SquareService_1.SquareService.findCalendarDateSessions()
                    .then((res) => __awaiter(this, void 0, void 0, function* () {
                    if (!res.err) {
                        for (let i = 0; i < res.data.length; i++) {
                            const session = res.data[i];
                            logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Checking date: ${session.itemData.name}`);
                            yield rx_helpers_1.wait(300).catch(err => console.error(err));
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
                            const adultTicketSum = +session.itemData.variations[0].inventory.counts[0].quantity;
                            const kidTicketSum = +session.itemData.variations[1].inventory.counts[0].quantity;
                            const currentMasterTicketSum = adultTicketSum + kidTicketSum - 160;
                            const masterTicketSum = +session.itemData.variations[2].inventory.counts[0].quantity;
                            if (currentMasterTicketSum >= 0 && currentMasterTicketSum !== masterTicketSum) {
                                logging_1.generateLogs(environmentName, processName, 'findCalendarDateSessions', `Updating master count for: ${session.itemData.name}`);
                                yield rx_helpers_1.wait(random_second_1.getRandomMilliseconds()).catch(err => console.error(err));
                                yield SquareService_1.SquareService.updateMasterCount(currentMasterTicketSum, masterTicketSum, session.itemData.variations[2].id).catch(err => console.error(err));
                            }
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
