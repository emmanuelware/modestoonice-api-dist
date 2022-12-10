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
const constants_1 = require("../../common/constants");
const SquareService_1 = require("../SquareService");
const InventoryAdjustment_1 = require("./InventoryAdjustment");
class InventoryPhysicalCount {
    constructor(seasonYear) {
        this._seasonYear = seasonYear;
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = moment();
            const timestamp = now.format('YYYY-MM-DDTHH:mm:ss.000Z');
            const physicalCounts = [];
            const seasonYearEnd = this._seasonYear + 1;
            const timeRange = { startAt: `${this._seasonYear}-06-01T00:00:00`, endAt: `${seasonYearEnd}-06-01T00:00:00` };
            const itemsPromise = SquareService_1.SquareService.searchCatalogItems([this._seasonYear.toString(), seasonYearEnd.toString()]);
            const ordersPromise = SquareService_1.SquareService.searchOrders(timeRange);
            const ticketOrdersPromise = global.db.query(`
      SELECT itemId AS itemId, CAST(SUM(adultTickets) AS UNSIGNED) AS adultQuantity, CAST(SUM(childTickets) AS UNSIGNED) AS childQuantity
      FROM userTicket 
      WHERE dateEntered >= :startAt AND dateEntered <= :endAt 
      GROUP BY itemId
    `, timeRange);
            const birthdayOrdersPromise = global.db.query(`
      SELECT CAST(bs.datetime AS CHAR) AS itemName, CAST(SUM(bp.skatersIncluded) AS UNSIGNED) AS quantity
      FROM birthdayBooking bb 
      INNER JOIN birthdayPackage bp ON bp.id = bb.birthdayPackageId 
      INNER JOIN birthdaySession bs ON bs.id = bb.birthdaySessionId 
      WHERE dateEntered >= :startAt AND dateEntered <= :endAt 
      GROUP BY bs.datetime
    `, timeRange);
            const birthdayExtrasPromise = global.db.query(`
      SELECT CAST(bs.datetime AS CHAR) AS itemName, CAST(SUM(bbe.quantity) AS UNSIGNED) AS quantity
      FROM birthdayBookingExtra bbe
      INNER JOIN birthdayBooking bb
        ON bbe.birthdayBookingId = bb.id
      INNER JOIN birthdaySession bs 
        ON bs.id = bb.birthdaySessionId
      WHERE bb.dateEntered >= :startAt AND bb.dateEntered <= :endAt && bbe.birthdayExtraId = 1
      GROUP BY bs.datetime
    `, timeRange);
            const salesByVariationId = {};
            const orders = yield ordersPromise;
            orders.forEach(order => {
                var _a;
                (_a = order.lineItems) === null || _a === void 0 ? void 0 : _a.forEach((lineItem) => {
                    const variationId = lineItem.catalogObjectId;
                    if (variationId == null) {
                        return;
                    }
                    if (!InventoryAdjustment_1.LineItemFilter.test(lineItem.variationName)) {
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
            });
            const ticketOrderByItemId = {};
            const [ticketOrders] = yield ticketOrdersPromise;
            ticketOrders.forEach(ticketOrder => {
                let current = ticketOrderByItemId[ticketOrder.itemId];
                if (current) {
                    current.adultQuantity += ticketOrder.adultQuantity;
                    current.childQuantity += ticketOrder.childQuantity;
                }
                else {
                    ticketOrderByItemId[ticketOrder.itemId] = ticketOrder;
                }
            });
            const birthdayOrderByItemName = {};
            const [birthdayOrders] = yield birthdayOrdersPromise;
            birthdayOrders.forEach(birthdayOrder => {
                const current = birthdayOrderByItemName[birthdayOrder.itemName];
                if (current) {
                    current.quantity += birthdayOrder.quantity;
                }
                else {
                    birthdayOrderByItemName[birthdayOrder.itemName] = birthdayOrder;
                }
            });
            const [birthdayExtras] = yield birthdayExtrasPromise;
            birthdayExtras.forEach(birthdayExtra => {
                const current = birthdayOrderByItemName[birthdayExtra.itemName];
                if (current) {
                    current.quantity += birthdayExtra.quantity;
                }
                else {
                    birthdayOrderByItemName[birthdayExtra.itemName] = birthdayExtra;
                }
            });
            const items = yield itemsPromise;
            items.forEach(item => {
                var _a, _b, _c;
                const itemName = (_a = item.itemData) === null || _a === void 0 ? void 0 : _a.name;
                if (!itemName) {
                    return;
                }
                if (!/^(Oct|Nov|Dec|Jan|Feb) \d{2} \d{4} \d{2}:\d{2}/i.test(itemName)) {
                    return;
                }
                const variations = (_b = item.itemData) === null || _b === void 0 ? void 0 : _b.variations;
                if (!((_c = variations) === null || _c === void 0 ? void 0 : _c.length)) {
                    return;
                }
                let maxStock = 160;
                if (item.customAttributeValues) {
                    for (var key of Object.keys(item.customAttributeValues)) {
                        const attribute = item.customAttributeValues[key];
                        if (attribute.name != null && /^maxStock$/i.test(attribute.name) && attribute.type != null && /^number$/i.test(attribute.type) && attribute.numberValue != null) {
                            maxStock = Math.round(+attribute.numberValue);
                        }
                    }
                }
                const adultTicketsVariation = InventoryAdjustment_1.findByRegExp(variations, /^adult tickets$/i);
                const childTicketsVariation = InventoryAdjustment_1.findByRegExp(variations, /^child tickets$/i);
                const masterTicketCountVariation = InventoryAdjustment_1.findByRegExp(variations, /^master ticket count$/i);
                let adultTicketsCount = 0;
                let childTicketsCount = 0;
                const ticketOrder = ticketOrderByItemId[item.id];
                if (ticketOrder) {
                    adultTicketsCount += ticketOrder.adultQuantity;
                    childTicketsCount += ticketOrder.childQuantity;
                }
                const birthdayOrderItemName = moment(itemName, "MMM DD YYYY HH:mm").format(constants_1.SQL_DATETIME_FORMAT);
                const birthdayOrder = birthdayOrderByItemName[birthdayOrderItemName];
                if (birthdayOrder) {
                    adultTicketsCount += birthdayOrder.quantity;
                }
                if (adultTicketsVariation) {
                    if (salesByVariationId[adultTicketsVariation.id]) {
                        adultTicketsCount += salesByVariationId[adultTicketsVariation.id];
                    }
                    physicalCounts.push({
                        type: 'PHYSICAL_COUNT',
                        physicalCount: {
                            locationId: SquareService_1.locationId,
                            catalogObjectId: adultTicketsVariation.id,
                            state: 'IN_STOCK',
                            quantity: (maxStock - adultTicketsCount).toString(),
                            occurredAt: timestamp,
                        }
                    });
                }
                if (childTicketsVariation) {
                    if (salesByVariationId[childTicketsVariation.id]) {
                        childTicketsCount += salesByVariationId[childTicketsVariation.id];
                    }
                    physicalCounts.push({
                        type: 'PHYSICAL_COUNT',
                        physicalCount: {
                            locationId: SquareService_1.locationId,
                            catalogObjectId: childTicketsVariation.id,
                            state: 'IN_STOCK',
                            quantity: (maxStock - childTicketsCount).toString(),
                            occurredAt: timestamp,
                        }
                    });
                }
                if (masterTicketCountVariation) {
                    const masterTicketCount = adultTicketsCount + childTicketsCount;
                    physicalCounts.push({
                        type: 'PHYSICAL_COUNT',
                        physicalCount: {
                            locationId: SquareService_1.locationId,
                            catalogObjectId: masterTicketCountVariation.id,
                            state: 'IN_STOCK',
                            quantity: (maxStock - masterTicketCount).toString(),
                            occurredAt: timestamp,
                        }
                    });
                }
            });
            if (physicalCounts.length) {
                yield SquareService_1.SquareService.batchChangeInventory(physicalCounts);
            }
        });
    }
}
exports.InventoryPhysicalCount = InventoryPhysicalCount;
