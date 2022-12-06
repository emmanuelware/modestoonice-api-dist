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
const moment = require("moment");
const SquareService_1 = require("../SquareService");
exports.LineItemFilter = /^(adult|child) tickets$/i;
class InventoryAdjustment {
    constructor(orderId) {
        this._orderId = orderId;
    }
    update() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const now = moment();
            const timestamp = now.format('YYYY-MM-DDTHH:mm:ss.000Z');
            const order = yield SquareService_1.SquareService.retrieveOrder(this._orderId);
            const salesByVariationId = {};
            (_b = (_a = order) === null || _a === void 0 ? void 0 : _a.lineItems) === null || _b === void 0 ? void 0 : _b.forEach((lineItem) => {
                const variationId = lineItem.catalogObjectId;
                if (variationId == null) {
                    return;
                }
                if (!exports.LineItemFilter.test(lineItem.variationName)) {
                    return;
                }
                const quantity = +lineItem.quantity;
                if (salesByVariationId[variationId]) {
                    salesByVariationId[variationId] += quantity;
                }
                else {
                    salesByVariationId[variationId] = quantity;
                }
            });
            const variationIds = Object.keys(salesByVariationId);
            const variations = yield SquareService_1.SquareService.batchRetrieveCatalogObjects(variationIds);
            const itemByVariationId = {};
            const uniqueItemIds = [];
            variations.forEach(variation => {
                var _a;
                const itemId = (_a = variation.itemVariationData) === null || _a === void 0 ? void 0 : _a.itemId;
                if (!itemId) {
                    return;
                }
                if (!itemByVariationId[variation.id]) {
                    itemByVariationId[variation.id] = itemId;
                }
                if (!uniqueItemIds.includes(itemId)) {
                    uniqueItemIds.push(itemId);
                }
            });
            const items = yield SquareService_1.SquareService.batchRetrieveCatalogObjects(uniqueItemIds);
            const adjustments = [];
            items.forEach(item => {
                var _a, _b;
                const variations = (_a = item.itemData) === null || _a === void 0 ? void 0 : _a.variations;
                if (!((_b = variations) === null || _b === void 0 ? void 0 : _b.length)) {
                    return;
                }
                const adultTicketsVariation = findByRegExp(variations, /^adult tickets$/i);
                const childTicketsVariation = findByRegExp(variations, /^child tickets$/i);
                const masterTicketCountVariation = findByRegExp(variations, /^master ticket count$/i);
                if (!masterTicketCountVariation) {
                    return;
                }
                let masterTicketCount = 0;
                if (adultTicketsVariation && salesByVariationId[adultTicketsVariation.id]) {
                    masterTicketCount += salesByVariationId[adultTicketsVariation.id];
                }
                if (childTicketsVariation && salesByVariationId[childTicketsVariation.id]) {
                    masterTicketCount += salesByVariationId[childTicketsVariation.id];
                }
                adjustments.push({
                    type: 'ADJUSTMENT',
                    adjustment: {
                        locationId: SquareService_1.locationId,
                        catalogObjectId: masterTicketCountVariation.id,
                        fromState: 'IN_STOCK',
                        toState: 'SOLD',
                        quantity: masterTicketCount.toString(),
                        occurredAt: timestamp,
                    }
                });
            });
            if (adjustments.length) {
                yield SquareService_1.SquareService.batchChangeInventory(adjustments);
            }
        });
    }
}
exports.InventoryAdjustment = InventoryAdjustment;
function findByRegExp(variations, filter) {
    return variations.find(x => { var _a, _b; return ((_a = x.itemVariationData) === null || _a === void 0 ? void 0 : _a.name) && filter.test((_b = x.itemVariationData) === null || _b === void 0 ? void 0 : _b.name); });
}
exports.findByRegExp = findByRegExp;
