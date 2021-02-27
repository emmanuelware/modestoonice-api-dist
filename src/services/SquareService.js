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
const squareConnect = require("square-connect");
const logging_1 = require("../utils/logging");
const path = require('path');
const executableEnv = require('dotenv').config({ path: path.join(__dirname, '../.env') });
const applicationId = process.env.SQUARE_APP_ID;
const accessToken = process.env.SQUARE_TOKEN;
const locationId = process.env.SQUARE_LOCATION_ID;
const squareClient = squareConnect.ApiClient.instance;
const oauth2 = squareClient.authentications['oauth2'];
oauth2.accessToken = accessToken;
const catalogAPI = new squareConnect.CatalogApi();
const inventoryAPI = new squareConnect.InventoryApi();
const transactionsAPI = new squareConnect.TransactionsApi();
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
            const body = new squareConnect.SearchCatalogObjectsRequest();
            const data = yield catalogAPI.searchCatalogObjects(body);
            const [session] = data.objects.filter(object => {
                if (object && object.item_data && object.item_data.name && object.item_data.name === date) {
                    return object;
                }
            });
            const variationIDs = session.item_data.variations.map(ticketType => {
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
                idempotency_key: generateIdempotencyKey(),
                changes: [
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalog_object_id: catalogId,
                            location_id: locationId,
                            from_state: 'IN_STOCK',
                            to_state: 'SOLD',
                            quantity: quantity.toString(),
                            occurred_at: timestamp
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
                idempotency_key: generateIdempotencyKey(),
                changes: [
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalog_object_id: inventoryAdjustments[0].catalog_object_id,
                            location_id: locationId,
                            from_state: fromState[adjustmentType],
                            to_state: toState[adjustmentType],
                            quantity: inventoryAdjustments[0].quantity.toString(),
                            occurred_at: timestamp
                        }
                    },
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalog_object_id: inventoryAdjustments[1].catalog_object_id,
                            location_id: locationId,
                            from_state: fromState[adjustmentType],
                            to_state: toState[adjustmentType],
                            quantity: inventoryAdjustments[1].quantity.toString(),
                            occurred_at: timestamp
                        }
                    },
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalog_object_id: inventoryAdjustments[2].catalog_object_id,
                            location_id: locationId,
                            from_state: fromState[adjustmentType],
                            to_state: toState[adjustmentType],
                            quantity: inventoryAdjustments[2].quantity.toString(),
                            occurred_at: timestamp
                        }
                    }
                ]
            })
                .catch(err => {
                console.error(err);
            });
        });
    }
    static updateMasterCount(currentMasterTicketSum, masterTicketSum, catalog_object_id) {
        return __awaiter(this, void 0, void 0, function* () {
            const quantity = masterTicketSum - currentMasterTicketSum;
            const timestamp = moment()
                .format('YYYY-MM-DDTHH:mm:ss.000Z')
                .toString();
            yield inventoryAPI
                .batchChangeInventory({
                idempotency_key: generateIdempotencyKey(),
                changes: [
                    {
                        type: 'ADJUSTMENT',
                        adjustment: {
                            catalog_object_id,
                            location_id: locationId,
                            from_state: 'IN_STOCK',
                            to_state: 'SOLD',
                            quantity: quantity.toString(),
                            occurred_at: timestamp
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
                card_nonce: payload.nonce,
                amount_money: {
                    amount: payload.amount,
                    currency: 'USD'
                },
                idempotency_key: idempotencyKey
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
                    const body = new squareConnect.SearchCatalogObjectsRequest();
                    const date = moment(_date).format(constants_1.MOMENT_FORMAT_DATE);
                    catalogAPI.searchCatalogObjects(body).then((data) => __awaiter(this, void 0, void 0, function* () {
                        const sessions = data.objects.filter(object => {
                            if (object.item_data && object.item_data.name && object.item_data.name.includes(date)) {
                                return object;
                            }
                        });
                        yield Promise.all(sessions.map((session) => __awaiter(this, void 0, void 0, function* () {
                            yield Promise.all(session.item_data.variations.map((sessionVariation) => __awaiter(this, void 0, void 0, function* () {
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
                    const body = new squareConnect.SearchCatalogObjectsRequest();
                    body.object_types = ['ITEM'];
                    catalogAPI
                        .searchCatalogObjects(body)
                        .then((data) => __awaiter(this, void 0, void 0, function* () {
                        const months = ['Nov ', 'Dec ', 'Jan '];
                        let sessions = [];
                        for (let i = 0; i < 3; i++) {
                            const currentMonthSessions = data.objects.filter(object => {
                                if (object.item_data && object.item_data.name && object.item_data.name.includes(months[i])) {
                                    return object;
                                }
                            });
                            logging_1.generateLogs('Crontab', 'SquareService', 'findCalendarDateSessions', `Month has ${currentMonthSessions.length} sessions.`);
                            for (let i = 0; i < currentMonthSessions.length; i++) {
                                const session = currentMonthSessions[i];
                                logging_1.generateLogs('Crontab', 'SquareService', 'findCalendarDateSessions', `Processing session ${session.id} (${session.item_data.name}).`);
                                yield Promise.all(session.item_data.variations.map((sessionVariation) => __awaiter(this, void 0, void 0, function* () {
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
                const currentCatalogObject = yield catalogAPI.retrieveCatalogObject(payload.id);
                return yield new Promise(resolve => {
                    catalogAPI
                        .upsertCatalogObject(Object.assign(Object.assign({}, currentCatalogObject), { idempotency_key: generateIdempotencyKey(), object: {
                            id: payload.id,
                            type: 'ITEM',
                            item_data: {
                                name: moment(payload.date).format(constants_1.DEFAULT_MOMENT_FORMAT),
                                variations: currentCatalogObject.object.item_data.variations
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
                        idempotency_key: generateIdempotencyKey(),
                        object: {
                            id: generateItemId(),
                            type: 'ITEM',
                            item_data: {
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
                        idempotency_key: generateIdempotencyKey(),
                        object: {
                            id: generateItemId(),
                            type: 'ITEM_VARIATION',
                            item_variation_data: {
                                item_id: newCatalogObjectId,
                                name: constants_1.ADULT_TICKET_VARIATION_NAME,
                                price_money: {
                                    amount: 1500,
                                    currency: 'USD'
                                },
                                pricing_type: 'FIXED_PRICING',
                                track_inventory: true
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
                        idempotency_key: generateIdempotencyKey(),
                        object: {
                            id: generateItemId(),
                            type: 'ITEM_VARIATION',
                            item_variation_data: {
                                item_id: newCatalogObjectId,
                                name: constants_1.CHILD_TICKET_VARIATION_NAME,
                                price_money: {
                                    amount: 1200,
                                    currency: 'USD'
                                },
                                pricing_type: 'FIXED_PRICING',
                                track_inventory: true
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
                        idempotency_key: generateIdempotencyKey(),
                        object: {
                            id: generateItemId(),
                            type: 'ITEM_VARIATION',
                            item_variation_data: {
                                item_id: newCatalogObjectId,
                                name: constants_1.MASTER_VARIATION_NAME,
                                price_money: {
                                    amount: 0,
                                    currency: 'USD'
                                },
                                pricing_type: 'FIXED_PRICING',
                                track_inventory: true
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
                        idempotency_key: generateIdempotencyKey(),
                        ignore_unchanged_counts: false,
                        changes: [
                            {
                                type: 'PHYSICAL_COUNT',
                                physical_count: {
                                    catalog_object_id: newAdultTicketId,
                                    state: 'IN_STOCK',
                                    location_id: locationId,
                                    quantity: constants_1.MAX_SESSION_INVENTORY_COUNT,
                                    occurred_at: timestamp
                                }
                            },
                            {
                                type: 'PHYSICAL_COUNT',
                                physical_count: {
                                    catalog_object_id: newChildTicketId,
                                    state: 'IN_STOCK',
                                    location_id: locationId,
                                    quantity: constants_1.MAX_SESSION_INVENTORY_COUNT,
                                    occurred_at: timestamp
                                }
                            },
                            {
                                type: 'PHYSICAL_COUNT',
                                physical_count: {
                                    catalog_object_id: newMasterTicketId,
                                    state: 'IN_STOCK',
                                    location_id: locationId,
                                    quantity: constants_1.MAX_SESSION_INVENTORY_COUNT,
                                    occurred_at: timestamp
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
                    const body = new squareConnect.SearchCatalogObjectsRequest();
                    catalogAPI.searchCatalogObjects(body).then(data => {
                        let deposit = 0;
                        data.objects.map(object => {
                            if (object.item_data && object.item_data.name === 'Party deposit') {
                                deposit = object.item_data.variations[0].item_variation_data.price_money.amount / 100;
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
                        resolve();
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
                    const body = new squareConnect.SearchCatalogObjectsRequest();
                    catalogAPI.searchCatalogObjects(body).then(data => {
                        let item = null;
                        data.objects.map(object => {
                            if (object.item_data) {
                                object.item_data.variations.map(variation => {
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
                    const body = new squareConnect.SearchCatalogObjectsRequest();
                    catalogAPI.searchCatalogObjects(body).then(data => {
                        let item = null;
                        data.objects.map(object => {
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
                        .listTransactions(locationId, {})
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
}
exports.SquareService = SquareService;
