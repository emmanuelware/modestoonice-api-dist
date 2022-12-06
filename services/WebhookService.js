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
const InventoryAdjustment_1 = require("./Inventory/InventoryAdjustment");
const InventoryPhysicalCount_1 = require("./Inventory/InventoryPhysicalCount");
const moment = require("moment");
class WebhookService {
    static orderCreated(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const inventoryAdjustment = new InventoryAdjustment_1.InventoryAdjustment(payload.data.id);
            yield inventoryAdjustment.update();
            return ResponseService_1.ResponseBuilder(null, null, false);
        });
    }
    static recountStock() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = moment();
            const seasonYear = now.month() < 6 ? now.clone().subtract(1, 'years').year() : now.year();
            const inventoryPhysicalCount = new InventoryPhysicalCount_1.InventoryPhysicalCount(seasonYear);
            yield inventoryPhysicalCount.update();
            return ResponseService_1.ResponseBuilder(null, null, false);
        });
    }
}
exports.WebhookService = WebhookService;
