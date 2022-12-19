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
const UtilService_1 = require("./UtilService");
const constants_1 = require("../common/constants");
const rx_helpers_1 = require("../common/rx.helpers");
const args_1 = require("../utils/args");
const square_1 = require("square");
const logging_1 = require("../utils/logging");
const crypto_1 = require("crypto");
const Excel = require("exceljs");
const moment = require("moment");
const path = require('path');
const executableEnv = require('dotenv').config({ path: args_1.getArgs().envPath || path.join(__dirname, '../.env') });
const applicationId = process.env.SQUARE_APP_ID;
const accessToken = process.env.SQUARE_TOKEN;
exports.locationId = process.env.SQUARE_LOCATION_ID;
const squareConnect = new square_1.Client({
    environment: process.env.ENV_MODE === 'prod' ? square_1.Environment.Production : square_1.Environment.Sandbox,
    accessToken
});
const { catalogApi, inventoryApi, transactionsApi, ordersApi, paymentsApi } = squareConnect;
exports.catalogAPI = catalogApi;
exports.ordersAPI = ordersApi;
exports.inventoryAPI = inventoryApi;
exports.transactionsAPI = transactionsApi;
exports.paymentsAPI = paymentsApi;
function generateItemId() {
    return `#${UtilService_1.UtilService.generateRandomString(24).toUpperCase()}`;
}
function generateIdempotencyKey() {
    return crypto_1.randomBytes(64).toString('hex');
}
class SquareService {
    static getTicketVariationIDsByDate(_date) {
        return __awaiter(this, void 0, void 0, function* () {
            const date = moment(_date.split(' at ').join(' '), constants_1.MOMENT_FORMAT_DATE + ' ' + constants_1.MOMENT_FORMAT_TIME).format(constants_1.MOMENT_FORMAT_DATE + ' ' + constants_1.MOMENT_FORMAT_TIME);
            const body = {};
            const data = yield exports.catalogAPI.searchCatalogObjects(body);
            const [session] = data.result.objects.filter(object => {
                if (object && object.itemData && object.itemData.name && object.itemData.name === date) {
                    return object;
                }
            });
            const variationIDs = session.itemData.variations.map(ticketType => {
                return ticketType.id;
            });
            return variationIDs;
        });
    }
    static updateMasterTicketCount(catalogId, quantity) {
        return __awaiter(this, void 0, void 0, function* () {
            const timestamp = moment()
                .format('YYYY-MM-DDTHH:mm:ss.000Z')
                .toString();
            yield exports.inventoryAPI.batchChangeInventory({
                idempotencyKey: generateIdempotencyKey(),
                changes: [
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId: catalogId,
                            locationId: exports.locationId,
                            fromState: 'IN_STOCK',
                            toState: 'SOLD',
                            quantity: quantity.toString(),
                            occurredAt: timestamp
                        }
                    }
                ]
            });
        });
    }
    static updateTicketCounts(inventoryAdjustments, adjustmentType) {
        return __awaiter(this, void 0, void 0, function* () {
            const timestamp = moment()
                .format('YYYY-MM-DDTHH:mm:ss.000Z')
                .toString();
            const fromState = {
                add: 'NONE',
                remove: 'IN_STOCK'
            };
            const toState = {
                add: 'IN_STOCK',
                remove: 'SOLD'
            };
            yield exports.inventoryAPI
                .batchChangeInventory({
                idempotencyKey: generateIdempotencyKey(),
                changes: [
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId: inventoryAdjustments[0].catalogObjectId,
                            locationId: exports.locationId,
                            fromState: fromState[adjustmentType],
                            toState: toState[adjustmentType],
                            quantity: inventoryAdjustments[0].quantity.toString(),
                            occurredAt: timestamp
                        }
                    },
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId: inventoryAdjustments[1].catalogObjectId,
                            locationId: exports.locationId,
                            fromState: fromState[adjustmentType],
                            toState: toState[adjustmentType],
                            quantity: inventoryAdjustments[1].quantity.toString(),
                            occurredAt: timestamp
                        }
                    },
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId: inventoryAdjustments[2].catalogObjectId,
                            locationId: exports.locationId,
                            fromState: fromState[adjustmentType],
                            toState: toState[adjustmentType],
                            quantity: inventoryAdjustments[2].quantity.toString(),
                            occurredAt: timestamp
                        }
                    }
                ]
            })
                .catch(err => {
                console.error(err);
            });
        });
    }
    static updateMasterCount(currentMasterTicketSum, masterTicketSum, catalogObjectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const quantity = masterTicketSum - currentMasterTicketSum;
            const timestamp = moment()
                .format('YYYY-MM-DDTHH:mm:ss.000Z')
                .toString();
            yield exports.inventoryAPI
                .batchChangeInventory({
                idempotencyKey: generateIdempotencyKey(),
                changes: [
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId,
                            locationId: exports.locationId,
                            fromState: 'IN_STOCK',
                            toState: 'SOLD',
                            quantity: quantity.toString(),
                            occurredAt: timestamp
                        }
                    }
                ]
            })
                .then(counts => {
                logging_1.generateLogs('Crontab', 'SquareService', 'updateMasterCount', `Updated counts: ${counts}`);
            })
                .catch(err => console.log('ERROR, NOT UPDATED: ' + err));
        });
    }
    static setMasterCount(adultTicketPreSaleCount, childTicketPreSaleCount, masterTicketPreSaleCount, adultCatalogObjectId, childCatalogObjectId, masterCatalogObjectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const timestamp = moment()
                .format('YYYY-MM-DDTHH:mm:ss.000Z')
                .toString();
            yield exports.inventoryAPI
                .batchChangeInventory({
                idempotencyKey: generateIdempotencyKey(),
                ignoreUnchangedCounts: false,
                changes: [
                    {
                        type: 'PHYSICAL_COUNT',
                        physicalCount: {
                            catalogObjectId: adultCatalogObjectId,
                            locationId: exports.locationId,
                            state: 'IN_STOCK',
                            quantity: adultTicketPreSaleCount.toString(),
                            occurredAt: timestamp
                        }
                    },
                    {
                        type: 'PHYSICAL_COUNT',
                        physicalCount: {
                            catalogObjectId: childCatalogObjectId,
                            locationId: exports.locationId,
                            state: 'IN_STOCK',
                            quantity: childTicketPreSaleCount.toString(),
                            occurredAt: timestamp
                        }
                    },
                    {
                        type: 'PHYSICAL_COUNT',
                        physicalCount: {
                            catalogObjectId: masterCatalogObjectId,
                            locationId: exports.locationId,
                            state: 'IN_STOCK',
                            quantity: masterTicketPreSaleCount.toString(),
                            occurredAt: timestamp
                        }
                    }
                ]
            })
                .then(counts => {
                logging_1.generateLogs('Crontab', 'SquareService', 'updateMasterCount', `Updated counts: ${counts}`);
            })
                .catch(err => {
                console.error(err);
            });
        });
    }
    static processPayment(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const idempotencyKey = crypto_1.randomBytes(20).toString('hex');
            console.log('payload', payload);
            const payment = {
                idempotencyKey,
                locationId: payload.locationId,
                sourceId: payload.sourceId,
                amountMoney: {
                    amount: BigInt(payload.amount),
                    currency: 'USD',
                },
            };
            try {
                const { result, statusCode } = yield exports.paymentsAPI.createPayment(payment);
                console.log('Payment succeeded!', { result, statusCode });
                return ResponseService_1.ResponseBuilder(result, 'Payment successful', false);
            }
            catch (e) {
                if (e.errors) {
                    const message = e.errors.map(x => x.detail || x.code).join('\n');
                    throw new Error(`Payment failed.\n${message}`);
                }
                throw e;
            }
        });
    }
    static getCalendarDateSessionInventoryCountByCatalogObject(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield new Promise(resolve => {
                    exports.inventoryAPI.retrieveInventoryCount(itemId).then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data.result, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response ? error.response.text : null, null, true));
                    });
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static findCalendarDateSessionByDate(_date) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield new Promise(resolve => {
                    const body = {};
                    const date = moment(_date).format(constants_1.MOMENT_FORMAT_DATE);
                    exports.catalogAPI.searchCatalogObjects(body).then((data) => __awaiter(this, void 0, void 0, function* () {
                        if (!data.result.objects) {
                            resolve(ResponseService_1.ResponseBuilder([], null, false));
                            return;
                        }
                        const sessions = data.result.objects.filter(object => {
                            if (object.itemData && object.itemData.name && object.itemData.name.includes(date)) {
                                return object;
                            }
                        });
                        yield Promise.all(sessions.map((session) => __awaiter(this, void 0, void 0, function* () {
                            if (session.itemData.variations) {
                                yield Promise.all(session.itemData.variations.map((sessionVariation) => __awaiter(this, void 0, void 0, function* () {
                                    const { data: inventoryCount } = yield this.getCalendarDateSessionInventoryCountByCatalogObject(sessionVariation.id);
                                    sessionVariation.inventory = inventoryCount;
                                })));
                            }
                        })));
                        resolve(ResponseService_1.ResponseBuilder(sessions, null, false));
                    }), error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static findCalendarDateSessions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield new Promise(resolve => {
                    const body = {};
                    body.objectTypes = ['ITEM'];
                    exports.catalogAPI
                        .searchCatalogObjects(body)
                        .then((data) => __awaiter(this, void 0, void 0, function* () {
                        const months = ['Nov ', 'Dec ', 'Jan'];
                        let sessions = [];
                        if (!data.result.objects) {
                            resolve(ResponseService_1.ResponseBuilder([], null, false));
                            return;
                        }
                        for (let i = 0; i < 3; i++) {
                            const currentMonthSessions = data.result.objects.filter(object => {
                                if (object.itemData && object.itemData.name && object.itemData.name.includes(months[i])) {
                                    return object;
                                }
                            });
                            logging_1.generateLogs('Crontab', 'SquareService', 'findCalendarDateSessions', `Month has ${currentMonthSessions.length} sessions.`);
                            for (let i = 0; i < currentMonthSessions.length; i++) {
                                const session = currentMonthSessions[i];
                                logging_1.generateLogs('Crontab', 'SquareService', 'findCalendarDateSessions', `Processing session ${session.id} (${session.itemData.name}).`);
                                yield Promise.all(session.itemData.variations.map((sessionVariation) => __awaiter(this, void 0, void 0, function* () {
                                    yield rx_helpers_1.wait(300).catch(err => console.error(err));
                                    this.getCalendarDateSessionInventoryCountByCatalogObject(sessionVariation.id)
                                        .then(res => (sessionVariation.inventory = res.data))
                                        .catch(err => console.error(err));
                                }))).catch(err => console.error(err));
                            }
                            sessions = sessions.concat(currentMonthSessions);
                            logging_1.generateLogs('Crontab', 'SquareService', 'findCalendarDateSessions', `Found ${sessions.length} sessions`);
                            yield rx_helpers_1.wait(1500).catch(err => console.error(err));
                        }
                        resolve(ResponseService_1.ResponseBuilder(sessions, null, false));
                    }), error => {
                        resolve(ResponseService_1.ResponseBuilder(error, null, true));
                    })
                        .catch(err => console.error(err));
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static updateCalendarDateSession(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const currentCatalogObject = (yield exports.catalogAPI.retrieveCatalogObject(payload.id)).result;
                return yield new Promise(resolve => {
                    exports.catalogAPI
                        .upsertCatalogObject(Object.assign(Object.assign({}, currentCatalogObject), { idempotencyKey: generateIdempotencyKey(), object: {
                            id: payload.id,
                            type: 'ITEM',
                            itemData: {
                                name: moment(payload.date).format(constants_1.DEFAULT_MOMENT_FORMAT),
                                variations: currentCatalogObject.object.itemData.variations
                            },
                            version: payload.version
                        } }))
                        .then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data.result, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static addCalendarDateSession(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data: newCatalogObject } = yield new Promise(resolve => {
                    exports.catalogAPI
                        .upsertCatalogObject({
                        idempotencyKey: generateIdempotencyKey(),
                        object: {
                            id: generateItemId(),
                            type: 'ITEM',
                            itemData: {
                                name: moment(payload.date).format(constants_1.DEFAULT_MOMENT_FORMAT)
                            }
                        }
                    })
                        .then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data.result, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                const newDefaultVariationId = newCatalogObject.catalogObject.itemData.variations[0].id;
                console.log('newDefaultVariationId', newDefaultVariationId);
                const variationObjectIds = [newDefaultVariationId];
                const deleteBody = {
                    objectIds: variationObjectIds
                };
                const { data: deleteResponse } = yield new Promise(resolve => {
                    catalogApi.batchDeleteCatalogObjects(deleteBody).then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data.result, null, false));
                    });
                });
                const newCatalogObjectId = newCatalogObject.catalogObject.id;
                console.log('newCatalogObject.id', newCatalogObjectId);
                const { data: adultTicketData } = yield new Promise(resolve => {
                    exports.catalogAPI
                        .upsertCatalogObject({
                        idempotencyKey: generateIdempotencyKey(),
                        object: {
                            id: generateItemId(),
                            type: 'ITEM_VARIATION',
                            itemVariationData: {
                                itemId: newCatalogObjectId,
                                name: constants_1.ADULT_TICKET_VARIATION_NAME,
                                priceMoney: {
                                    amount: 1600,
                                    currency: 'USD'
                                },
                                pricingType: 'FIXED_PRICING',
                                trackInventory: true
                            }
                        }
                    })
                        .then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data.result, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                const newAdultTicketId = adultTicketData.catalogObject.id;
                console.log('newAdultTicketId', newAdultTicketId);
                const { data: childTicketData } = yield new Promise(resolve => {
                    exports.catalogAPI
                        .upsertCatalogObject({
                        idempotencyKey: generateIdempotencyKey(),
                        object: {
                            id: generateItemId(),
                            type: 'ITEM_VARIATION',
                            itemVariationData: {
                                itemId: newCatalogObjectId,
                                name: constants_1.CHILD_TICKET_VARIATION_NAME,
                                priceMoney: {
                                    amount: 1200,
                                    currency: 'USD'
                                },
                                pricingType: 'FIXED_PRICING',
                                trackInventory: true
                            }
                        }
                    })
                        .then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data.result, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                const newChildTicketId = childTicketData.catalogObject.id;
                console.log('newChildTicketId', newChildTicketId);
                const { data: masterTicketData } = yield new Promise(resolve => {
                    exports.catalogAPI
                        .upsertCatalogObject({
                        idempotencyKey: generateIdempotencyKey(),
                        object: {
                            id: generateItemId(),
                            type: 'ITEM_VARIATION',
                            itemVariationData: {
                                itemId: newCatalogObjectId,
                                name: constants_1.MASTER_VARIATION_NAME,
                                priceMoney: {
                                    amount: 0,
                                    currency: 'USD'
                                },
                                pricingType: 'FIXED_PRICING',
                                trackInventory: true
                            }
                        }
                    })
                        .then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data.result, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                const newMasterTicketId = masterTicketData.catalogObject.id;
                console.log('newMasterTicketId', newMasterTicketId);
                const timestamp = moment()
                    .format('YYYY-MM-DDTHH:mm:ss.000Z')
                    .toString();
                console.log('timestamp', timestamp);
                yield new Promise(resolve => {
                    exports.inventoryAPI
                        .batchChangeInventory({
                        idempotencyKey: generateIdempotencyKey(),
                        ignoreUnchangedCounts: false,
                        changes: [
                            {
                                type: 'PHYSICAL_COUNT',
                                physicalCount: {
                                    catalogObjectId: newAdultTicketId,
                                    state: 'IN_STOCK',
                                    locationId: exports.locationId,
                                    quantity: constants_1.MAX_SESSION_INVENTORY_COUNT,
                                    occurredAt: timestamp
                                }
                            },
                            {
                                type: 'PHYSICAL_COUNT',
                                physicalCount: {
                                    catalogObjectId: newChildTicketId,
                                    state: 'IN_STOCK',
                                    locationId: exports.locationId,
                                    quantity: constants_1.MAX_SESSION_INVENTORY_COUNT,
                                    occurredAt: timestamp
                                }
                            },
                            {
                                type: 'PHYSICAL_COUNT',
                                physicalCount: {
                                    catalogObjectId: newMasterTicketId,
                                    state: 'IN_STOCK',
                                    locationId: exports.locationId,
                                    quantity: constants_1.MAX_SESSION_INVENTORY_COUNT,
                                    occurredAt: timestamp
                                }
                            }
                        ]
                    })
                        .then(data => {
                        console.log('batchChangeInventory.data.statusCode', data.statusCode);
                        resolve(ResponseService_1.ResponseBuilder(data.result, null, false));
                    })
                        .catch(error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                return ResponseService_1.ResponseBuilder(null, 'Created session', false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, 'Could not create session', true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getBirthdayPackageDeposit() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield new Promise(resolve => {
                    const body = {};
                    exports.catalogAPI.searchCatalogObjects(body).then(data => {
                        let deposit = 0;
                        data.result.objects.map(object => {
                            if (object.itemData && object.itemData.name === 'Party deposit') {
                                deposit = Number(object.itemData.variations[0].itemVariationData.priceMoney.amount) / 100;
                            }
                        });
                        resolve(ResponseService_1.ResponseBuilder(deposit, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static deleteItemById(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield new Promise(resolve => {
                    exports.catalogAPI.deleteCatalogObject(itemId).then(() => {
                        resolve(null);
                    });
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getItemByTicketSessionId(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield new Promise(resolve => {
                    const body = {};
                    exports.catalogAPI.searchCatalogObjects(body).then(data => {
                        let item = null;
                        data.result.objects.map(object => {
                            if (object.itemData) {
                                object.itemData.variations.map(variation => {
                                    if (variation.id === itemId) {
                                        item = object;
                                    }
                                });
                            }
                        });
                        resolve(ResponseService_1.ResponseBuilder(item, null, false));
                    }, error => {
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getItemById(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!itemId || !itemId.length || itemId === 'null') {
                    return ResponseService_1.ResponseBuilder(null, 'Ticket item id needed', true);
                }
                return yield new Promise(resolve => {
                    const body = {};
                    exports.catalogAPI.searchCatalogObjects(body).then(data => {
                        let item = null;
                        data.result.objects.map(object => {
                            if (object.id === itemId) {
                                item = object;
                            }
                        });
                        try {
                            if (!item) {
                                throw new Error('Ticket item not found');
                            }
                        }
                        catch (err) {
                            resolve(ResponseService_1.ResponseBuilder(null, err.message, true));
                        }
                        resolve(ResponseService_1.ResponseBuilder(item, null, false));
                    }, error => {
                        resolve(ResponseService_1.ResponseBuilder(null, error.response.text, true));
                    });
                });
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, 'Error fetching ticket', true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getApplicationId() {
        try {
            return ResponseService_1.ResponseBuilder({ applicationId, locationId: exports.locationId }, null, false);
        }
        catch (e) {
            return ResponseService_1.ResponseBuilder(null, null, true, {
                error: e,
                log: true
            });
        }
    }
    static getTransactionById(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield new Promise(resolve => {
                    exports.transactionsAPI
                        .listTransactions(exports.locationId)
                        .then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data.result, null, false));
                    }, error => {
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getTransactionStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[record]] = yield global.db.query('SELECT * FROM appCache');
                return ResponseService_1.ResponseBuilder(record, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getTransactions(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('UPDATE appCache SET squareReportTotalResults = 0, squareReportCurrentIndex = 0');
                const findDbRecord = (transactionId) => __awaiter(this, void 0, void 0, function* () {
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
                console.log('SquareService:getTransactions.startDate', startDate);
                console.log('SquareService:getTransactions.endDate', endDate);
                return yield new Promise(resolve => {
                    ordersApi
                        .searchOrders({
                        locationIds: [exports.locationId],
                        returnEntries: false,
                        limit: 10000,
                        query: {
                            filter: {
                                stateFilter: {
                                    states: ['COMPLETED']
                                },
                                dateTimeFilter: {
                                    closedAt: {
                                        startAt: `${startDate}T00:00:00+00:00`,
                                        endAt: `${endDate}T23:59:59+00:00`
                                    }
                                }
                            },
                            sort: {
                                sortField: 'CLOSED_AT',
                                sortOrder: 'DESC'
                            }
                        }
                    })
                        .then((data) => __awaiter(this, void 0, void 0, function* () {
                        console.log('SquareService:getTransactions.data.result.orders.length', data.result.orders.length);
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
                        yield global.db.query('UPDATE appCache SET squareReportTotalResults = :squareReportTotalResults', {
                            squareReportTotalResults: data.result.orders.length
                        });
                        for (let i = 0; i < data.result.orders.length; i++) {
                            yield global.db.query('UPDATE appCache SET squareReportCurrentIndex = :squareReportCurrentIndex', {
                                squareReportCurrentIndex: i
                            });
                            const order = data.result.orders[i];
                            let dbRecord = yield findDbRecord(order.id);
                            if (!dbRecord && order.tenders && order.tenders.length && order.tenders[0].paymentId) {
                                const dbRecord2 = yield findDbRecord(order.tenders[0].paymentId);
                                dbRecord = dbRecord2;
                            }
                            let sessionName = null;
                            if (dbRecord && dbRecord.itemId) {
                                if (SquareService.sessionCache.get(dbRecord.itemId)) {
                                    sessionName = SquareService.sessionCache.get(dbRecord.itemId);
                                }
                                else {
                                    const { data: session } = yield SquareService.getItemById(dbRecord.itemId);
                                    sessionName = session.itemData.name;
                                    SquareService.sessionCache.set(dbRecord.itemId, session.itemData.name);
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
                                transactionType: dbRecord ? dbRecord.transactionType : ''
                            });
                        }
                        const buffer = yield workbook.xlsx.writeBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        resolve(ResponseService_1.ResponseBuilder({ base64 }, null, false));
                    }), error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response ? error.response.text : 'An error ocurred', null, true));
                    });
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static batchRetrieveCatalogObjects(objectIds) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!objectIds.length) {
                return [];
            }
            const response = yield exports.catalogAPI.batchRetrieveCatalogObjects({ objectIds });
            return response.result.objects || [];
        });
    }
    static retrieveOrder(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield exports.ordersAPI.retrieveOrder(orderId);
            return response.result.order;
        });
    }
    static searchCatalogItems(keywords) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = keywords.map((keyword) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                let cursor;
                const catalogObjects = [];
                while (true) {
                    const response = yield exports.catalogAPI.searchCatalogObjects({ objectTypes: ['ITEM'], query: { textQuery: { keywords: [keyword] } } });
                    if ((_a = response.result.objects) === null || _a === void 0 ? void 0 : _a.length) {
                        catalogObjects.push(...response.result.objects);
                    }
                    if (!cursor) {
                        break;
                    }
                }
                return catalogObjects;
            }));
            const results = yield Promise.all(promises);
            return results.reduce((a, b) => a.concat(b), []);
        });
    }
    static searchOrders(createdAt) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const payload = {
                query: { filter: { dateTimeFilter: { createdAt } } },
                locationIds: [exports.locationId]
            };
            let cursor;
            const orders = [];
            while (true) {
                const response = yield exports.ordersAPI.searchOrders(cursor ? Object.assign(Object.assign({}, payload), { cursor }) : payload);
                cursor = response.result.cursor;
                if ((_a = response.result.orders) === null || _a === void 0 ? void 0 : _a.length) {
                    orders.push(...response.result.orders);
                }
                if (!cursor) {
                    break;
                }
            }
            return orders;
        });
    }
    static batchChangeInventory(changes) {
        return __awaiter(this, void 0, void 0, function* () {
            const chunks = chunk(changes, 100);
            const promises = chunks.map(chunk => {
                return exports.inventoryAPI.batchChangeInventory({
                    idempotencyKey: generateIdempotencyKey(),
                    changes: chunk
                });
            });
            yield Promise.all(promises);
        });
    }
}
exports.SquareService = SquareService;
SquareService.sessionCache = new Map();
function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        const chunk = array.slice(i, i + size);
        chunks.push(chunk);
    }
    return chunks;
}
