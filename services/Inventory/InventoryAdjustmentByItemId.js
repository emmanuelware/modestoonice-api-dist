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
class InventoryAdjustmentByItemId {
    constructor(itemId, adultQuantity, childQuantity) {
        this._itemId = itemId;
        this._adultQuantity = adultQuantity;
        this._childQuantity = childQuantity;
    }
    update() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const now = moment();
            const timestamp = now.format('YYYY-MM-DDTHH:mm:ss.000Z');
            const item = yield SquareService_1.SquareService.retrieveCatalogObject(this._itemId);
            if (item == null) {
                return;
            }
            const adjustments = [];
            const variations = (_a = item.itemData) === null || _a === void 0 ? void 0 : _a.variations;
            if (!((_b = variations) === null || _b === void 0 ? void 0 : _b.length)) {
                return;
            }
            const adultTicketsVariation = findByRegExp(variations, /^adult tickets$/i);
            if (adultTicketsVariation) {
                adjustments.push({
                    type: 'ADJUSTMENT',
                    adjustment: {
                        locationId: SquareService_1.locationId,
                        catalogObjectId: adultTicketsVariation.id,
                        fromState: this._adultQuantity > 0 ? 'NONE' : 'IN_STOCK',
                        toState: this._adultQuantity > 0 ? 'IN_STOCK' : 'SOLD',
                        quantity: (Math.abs(this._adultQuantity)).toString(),
                        occurredAt: timestamp,
                    }
                });
            }
            const childTicketsVariation = findByRegExp(variations, /^child tickets$/i);
            if (childTicketsVariation) {
                adjustments.push({
                    type: 'ADJUSTMENT',
                    adjustment: {
                        locationId: SquareService_1.locationId,
                        catalogObjectId: childTicketsVariation.id,
                        fromState: this._childQuantity > 0 ? 'NONE' : 'IN_STOCK',
                        toState: this._childQuantity > 0 ? 'IN_STOCK' : 'SOLD',
                        quantity: (Math.abs(this._childQuantity)).toString(),
                        occurredAt: timestamp,
                    }
                });
            }
            const masterTicketCountVariation = findByRegExp(variations, /^master ticket count$/i);
            if (masterTicketCountVariation) {
                let masterTicketCount = this._adultQuantity + this._childQuantity;
                adjustments.push({
                    type: 'ADJUSTMENT',
                    adjustment: {
                        locationId: SquareService_1.locationId,
                        catalogObjectId: masterTicketCountVariation.id,
                        fromState: masterTicketCount > 0 ? 'NONE' : 'IN_STOCK',
                        toState: masterTicketCount > 0 ? 'IN_STOCK' : 'SOLD',
                        quantity: (Math.abs(masterTicketCount)).toString(),
                        occurredAt: timestamp,
                    }
                });
            }
            if (adjustments.length) {
                yield SquareService_1.SquareService.batchChangeInventory(adjustments);
            }
        });
    }
}
exports.InventoryAdjustmentByItemId = InventoryAdjustmentByItemId;
function findByRegExp(variations, filter) {
    return variations.find(x => { var _a, _b; return ((_a = x.itemVariationData) === null || _a === void 0 ? void 0 : _a.name) && filter.test((_b = x.itemVariationData) === null || _b === void 0 ? void 0 : _b.name); });
}
exports.findByRegExp = findByRegExp;
