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
const ResponseService_1 = require("./ResponseService");
const SquareService_1 = require("./SquareService");
const constants_1 = require("../common/constants");
const moment = require("moment");
class CalendarService {
    static addSession(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                payload.date = moment(payload.date).format(constants_1.MOMENT_STORING_DATE);
                console.log('addSession:payload.date', payload.date);
                return yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                    yield SquareService_1.SquareService.addCalendarDateSession(payload).then(() => {
                        resolve(ResponseService_1.ResponseBuilder(null, null, false));
                    });
                }));
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static updateSession(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                payload.date = moment(payload.date).format(constants_1.MOMENT_STORING_DATE);
                return yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                    yield SquareService_1.SquareService.updateCalendarDateSession(payload).then(() => {
                        resolve(ResponseService_1.ResponseBuilder(null, null, false));
                    });
                }));
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getSessionsByCalendarDate(date) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let { data: items } = yield SquareService_1.SquareService.findCalendarDateSessionByDate(date);
                items = items.map(item => {
                    return Object.assign({}, item, { time: moment(item.item_data.name).format(constants_1.MOMENT_FORMAT_TIME), date: moment(item.item_data.name).format(constants_1.DEFAULT_MOMENT_FORMAT) });
                });
                items.sort((a, b) => moment(a.item_data.name).valueOf() - moment(b.item_data.name).valueOf());
                return ResponseService_1.ResponseBuilder(items, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static deleteSessionBySquareItemId(squareSessionItemId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                    SquareService_1.SquareService.deleteItemById(squareSessionItemId).then(() => {
                        resolve(ResponseService_1.ResponseBuilder(null, null, false));
                    });
                }));
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static updateSessionInventory(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data: session } = yield SquareService_1.SquareService.getItemById(payload.itemId);
                const sessionAdultTicketId = session.item_data.variations[0].id;
                const sessionChildTicketId = session.item_data.variations[1].id;
                const sessionMasterTicketId = session.item_data.variations[2].id;
                const { data: adultInventoryCounts } = yield SquareService_1.SquareService.getCalendarDateSessionInventoryCountByCatalogObject(sessionAdultTicketId);
                const { data: childInventoryCounts } = yield SquareService_1.SquareService.getCalendarDateSessionInventoryCountByCatalogObject(sessionChildTicketId);
                const { data: masterInventoryCounts } = yield SquareService_1.SquareService.getCalendarDateSessionInventoryCountByCatalogObject(sessionMasterTicketId);
                const adultInventoryCount = adultInventoryCounts.counts[0].quantity;
                const childInventoryCount = childInventoryCounts.counts[0].quantity;
                const masterInventoryCount = masterInventoryCounts.counts[0].quantity;
                yield SquareService_1.SquareService.updateTicketCounts([
                    {
                        catalog_object_id: sessionAdultTicketId,
                        quantity: adultInventoryCount - payload.inventoryCount
                    },
                    {
                        catalog_object_id: sessionChildTicketId,
                        quantity: childInventoryCount - payload.inventoryCount
                    },
                    {
                        catalog_object_id: sessionMasterTicketId,
                        quantity: masterInventoryCount - payload.inventoryCount
                    }
                ], 'remove');
                return ResponseService_1.ResponseBuilder(null, 'Updated inventory count', false);
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
exports.CalendarService = CalendarService;
