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
function getCatalog(seasonYearStart, seasonYearEnd) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const promises = [
            SquareService_1.catalogAPI.searchCatalogObjects({ objectTypes: ['ITEM'], query: { textQuery: { keywords: [seasonYearStart.toString()] } } }),
            SquareService_1.catalogAPI.searchCatalogObjects({ objectTypes: ['ITEM'], query: { textQuery: { keywords: [seasonYearEnd.toString()] } } })
        ];
        const catalogLookup = {
            itemsLookupById: {},
            itemsLookupByName: {},
            variations: [],
            variationsLookupById: {},
        };
        const itemResponses = yield Promise.all(promises);
        for (let i = 0; i < itemResponses.length; i++) {
            const itemResponse = itemResponses[i];
            (_a = itemResponse.result.objects) === null || _a === void 0 ? void 0 : _a.forEach(item => {
                var _a, _b;
                if (!catalogLookup.itemsLookupById[item.id]) {
                    const itemsLookupItem = {
                        type: "ITEM",
                        id: item.id,
                        name: item.itemData.name,
                        variations: {}
                    };
                    if ((_b = (_a = item.itemData) === null || _a === void 0 ? void 0 : _a.variations) === null || _b === void 0 ? void 0 : _b.length) {
                        const maxStock = getMaxStock(item);
                        for (let j = 0; j < item.itemData.variations.length; j++) {
                            const variation = item.itemData.variations[j];
                            const variationsLookupItem = {
                                type: 'ITEM_VARIATION',
                                id: variation.id,
                                name: variation.itemVariationData.name,
                                item: itemsLookupItem,
                                soldQuantity: 0,
                                maxStock
                            };
                            if (/adult tickets/i.test(variation.itemVariationData.name)) {
                                itemsLookupItem.variations.adultTickets = variationsLookupItem;
                            }
                            else if (/child tickets/i.test(variation.itemVariationData.name)) {
                                itemsLookupItem.variations.childTickets = variationsLookupItem;
                            }
                            else if (/master ticket count/i.test(variation.itemVariationData.name)) {
                                itemsLookupItem.variations.masterTicketCount = variationsLookupItem;
                            }
                            catalogLookup.variations.push(variationsLookupItem);
                            catalogLookup.variationsLookupById[variationsLookupItem.id] = variationsLookupItem;
                        }
                    }
                    catalogLookup.itemsLookupById[itemsLookupItem.id] = itemsLookupItem;
                    catalogLookup.itemsLookupByName[itemsLookupItem.name] = itemsLookupItem;
                }
            });
        }
        return catalogLookup;
    });
}
exports.default = getCatalog;
function getMaxStock(item) {
    let maxStock = 160;
    if (item.customAttributeValues) {
        for (var key of Object.keys(item.customAttributeValues)) {
            var attributeValue = item.customAttributeValues[key];
            if (/^maxStock$/i.test(attributeValue.name) && /^number$/i.test(attributeValue.type) && attributeValue.numberValue) {
                maxStock = Math.round(+attributeValue.numberValue);
            }
        }
    }
    return maxStock;
}
