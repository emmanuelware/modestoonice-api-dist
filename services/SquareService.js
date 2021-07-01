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
const crypto_1 = require("crypto");
const moment = require("moment");
const square_1 = require("square");
const logging_1 = require("../utils/logging");
const Excel = require("exceljs");
const path = require('path');
const executableEnv = require('dotenv').config({ path: path.join(__dirname, '../.env') });
const applicationId = process.env.SQUARE_APP_ID;
const accessToken = process.env.SQUARE_TOKEN;
const locationId = process.env.SQUARE_LOCATION_ID;
const squareConnect = new square_1.Client({
    environment: process.env.ENV_MODE === 'prod' ? square_1.Environment.Production : square_1.Environment.Sandbox,
    accessToken
});
const { catalogApi, inventoryApi, transactionsApi, ordersApi } = squareConnect;
const catalogAPI = catalogApi;
const inventoryAPI = inventoryApi;
const transactionsAPI = transactionsApi;
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
            const data = yield catalogAPI.searchCatalogObjects(body);
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
            yield inventoryAPI.batchChangeInventory({
                idempotencyKey: generateIdempotencyKey(),
                changes: [
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId: catalogId,
                            locationId: locationId,
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
            yield inventoryAPI
                .batchChangeInventory({
                idempotencyKey: generateIdempotencyKey(),
                changes: [
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId: inventoryAdjustments[0].catalog_object_id,
                            locationId: locationId,
                            fromState: fromState[adjustmentType],
                            toState: toState[adjustmentType],
                            quantity: inventoryAdjustments[0].quantity.toString(),
                            occurredAt: timestamp
                        }
                    },
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId: inventoryAdjustments[1].catalog_object_id,
                            locationId: locationId,
                            fromState: fromState[adjustmentType],
                            toState: toState[adjustmentType],
                            quantity: inventoryAdjustments[1].quantity.toString(),
                            occurredAt: timestamp
                        }
                    },
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId: inventoryAdjustments[2].catalog_object_id,
                            locationId: locationId,
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
            yield inventoryAPI
                .batchChangeInventory({
                idempotencyKey: generateIdempotencyKey(),
                changes: [
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalogObjectId,
                            locationId: locationId,
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
    static processPayment(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const idempotencyKey = crypto_1.randomBytes(64).toString('hex');
            const request = {
                cardNonce: payload.nonce,
                amountMoney: {
                    amount: BigInt(payload.amount),
                    currency: 'USD'
                },
                idempotencyKey: idempotencyKey
            };
            return yield new Promise(resolve => {
                transactionsAPI
                    .charge(locationId, request)
                    .then(function (data) {
                    resolve(ResponseService_1.ResponseBuilder(data, 'Payment successful', false));
                }, function (error) {
                    console.error(error);
                    resolve(ResponseService_1.ResponseBuilder(error.response.text, 'Payment failure', true));
                })
                    .catch(err => console.error(err));
            });
        });
    }
    static getCalendarDateSessionInventoryCountByCatalogObject(itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield new Promise(resolve => {
                    inventoryAPI.retrieveInventoryCount(itemId).then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data, null, false));
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
                    catalogAPI.searchCatalogObjects(body).then((data) => __awaiter(this, void 0, void 0, function* () {
                        const sessions = data.result.objects.filter(object => {
                            if (object.itemData && object.itemData.name && object.itemData.name.includes(date)) {
                                return object;
                            }
                        });
                        yield Promise.all(sessions.map((session) => __awaiter(this, void 0, void 0, function* () {
                            yield Promise.all(session.itemData.variations.map((sessionVariation) => __awaiter(this, void 0, void 0, function* () {
                                const { data: inventoryCount } = yield this.getCalendarDateSessionInventoryCountByCatalogObject(sessionVariation.id);
                                sessionVariation.inventory = inventoryCount;
                            })));
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
                    catalogAPI
                        .searchCatalogObjects(body)
                        .then((data) => __awaiter(this, void 0, void 0, function* () {
                        const months = ['Nov ', 'Dec ', 'Jan '];
                        let sessions = [];
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
                const currentCatalogObject = (yield catalogAPI.retrieveCatalogObject(payload.id)).result;
                return yield new Promise(resolve => {
                    catalogAPI
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
                        resolve(ResponseService_1.ResponseBuilder(data, null, false));
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
                    catalogAPI
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
                        resolve(ResponseService_1.ResponseBuilder(data, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                const newCatalogObjectId = newCatalogObject.catalog_object.id;
                console.log('newCatalogObject.id', newCatalogObjectId);
                const { data: adultTicketData } = yield new Promise(resolve => {
                    catalogAPI
                        .upsertCatalogObject({
                        idempotencyKey: generateIdempotencyKey(),
                        object: {
                            id: generateItemId(),
                            type: 'ITEM_VARIATION',
                            itemVariationData: {
                                itemId: newCatalogObjectId,
                                name: constants_1.ADULT_TICKET_VARIATION_NAME,
                                priceMoney: {
                                    amount: 1500,
                                    currency: 'USD'
                                },
                                pricingType: 'FIXED_PRICING',
                                trackInventory: true
                            }
                        }
                    })
                        .then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                const newAdultTicketId = adultTicketData.catalog_object.id;
                console.log('newAdultTicketId', newAdultTicketId);
                const { data: childTicketData } = yield new Promise(resolve => {
                    catalogAPI
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
                        resolve(ResponseService_1.ResponseBuilder(data, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                const newChildTicketId = childTicketData.catalog_object.id;
                console.log('newChildTicketId', newChildTicketId);
                const { data: masterTicketData } = yield new Promise(resolve => {
                    catalogAPI
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
                        resolve(ResponseService_1.ResponseBuilder(data, null, false));
                    }, error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                const newMasterTicketId = masterTicketData.catalog_object.id;
                console.log('newMasterTicketId', newMasterTicketId);
                const timestamp = moment()
                    .format('YYYY-MM-DDTHH:mm:ss.000Z')
                    .toString();
                console.log('timestamp', timestamp);
                yield new Promise(resolve => {
                    inventoryAPI
                        .batchChangeInventory({
                        idempotencyKey: generateIdempotencyKey(),
                        ignoreUnchangedCounts: false,
                        changes: [
                            {
                                type: 'physicalCount',
                                physicalCount: {
                                    catalogObjectId: newAdultTicketId,
                                    state: 'IN_STOCK',
                                    locationId: locationId,
                                    quantity: constants_1.MAX_SESSION_INVENTORY_COUNT,
                                    occurredAt: timestamp
                                }
                            },
                            {
                                type: 'physicalCount',
                                physicalCount: {
                                    catalogObjectId: newChildTicketId,
                                    state: 'IN_STOCK',
                                    locationId: locationId,
                                    quantity: constants_1.MAX_SESSION_INVENTORY_COUNT,
                                    occurredAt: timestamp
                                }
                            },
                            {
                                type: 'physicalCount',
                                physicalCount: {
                                    catalogObjectId: newMasterTicketId,
                                    state: 'IN_STOCK',
                                    locationId: locationId,
                                    quantity: constants_1.MAX_SESSION_INVENTORY_COUNT,
                                    occurredAt: timestamp
                                }
                            }
                        ]
                    })
                        .then(data => {
                        console.log('batchChangeInventory.data', data);
                        resolve(ResponseService_1.ResponseBuilder(data, null, false));
                    })
                        .catch(error => {
                        console.error(error);
                        resolve(ResponseService_1.ResponseBuilder(error.response.text, null, true));
                    });
                });
                return ResponseService_1.ResponseBuilder(null, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
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
                    catalogAPI.searchCatalogObjects(body).then(data => {
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
                    catalogAPI.deleteCatalogObject(itemId).then(() => {
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
                    catalogAPI.searchCatalogObjects(body).then(data => {
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
                    catalogAPI.searchCatalogObjects(body).then(data => {
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
            return ResponseService_1.ResponseBuilder(applicationId, null, false);
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
                    transactionsAPI
                        .listTransactions(locationId)
                        .then(data => {
                        resolve(ResponseService_1.ResponseBuilder(data, null, false));
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
    static getTransactions(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(startDate, endDate);
                return yield new Promise(resolve => {
                    ordersApi
                        .searchOrders({
                        locationIds: [locationId],
                        query: {
                            filter: {
                                stateFilter: {
                                    states: ['COMPLETED']
                                },
                                dateTimeFilter: {
                                    closedAt: {
                                        startAt: '2018-03-03T20:00:00+00:00',
                                        endAt: '2021-03-04T21:54:45+00:00'
                                    }
                                }
                            },
                            sort: {
                                sortField: 'CLOSED_AT',
                                sortOrder: 'DESC'
                            }
                        },
                        returnEntries: true
                    })
                        .then((data) => __awaiter(this, void 0, void 0, function* () {
                        let workbook = new Excel.Workbook();
                        let worksheet = workbook.addWorksheet('Transactions');
                        worksheet.columns = [
                            { header: 'Date', key: 'date' },
                            { header: 'Time', key: 'time' },
                            { header: 'Time Zone', key: 'timeZone' },
                            { header: 'Category', key: 'category' },
                            { header: 'Item', key: 'item' },
                            { header: 'Qty', key: 'quantity' },
                            { header: 'Price Point', key: 'pricePoint' },
                            { header: 'SKU', key: 'SKU' },
                            { header: 'Modifiers Applied', key: 'modifiersApplied' },
                            { header: 'Gross Sales', key: 'grossSales' },
                            { header: 'Discounts', key: 'discounts' },
                            { header: 'Net Sales', key: 'netSales' },
                            { header: 'Tax', key: 'tax' },
                            { header: 'Transaction ID', key: 'transactionId' },
                            { header: 'Payment ID', key: 'paymentId' },
                            { header: 'Device Name', key: 'deviceName' },
                            { header: 'Notes', key: 'notes' },
                            { header: 'Details', key: 'details' },
                            { header: 'Event Type', key: 'eventType' },
                            { header: 'Location', key: 'location' },
                            { header: 'Dining Options', key: 'diningOptions' },
                            { header: 'Customer ID', key: 'customerId' },
                            { header: 'Customer Name', key: 'customerName' },
                            { header: 'Customer Reference ID', key: 'customerReferenceId' },
                            { header: 'Unit', key: 'unit' },
                            { header: 'Count', key: 'count' }
                        ];
                        worksheet.columns.forEach(column => {
                            column.width = column.header.length < 12 ? 12 : column.header.length;
                        });
                        console.log(data.result);
                        worksheet.addRow(null);
                        const buffer = yield workbook.xlsx.writeBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        resolve(ResponseService_1.ResponseBuilder({ base64 }, null, false));
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
}
exports.SquareService = SquareService;
