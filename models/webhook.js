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
const WebhookService_1 = require("../services/WebhookService");
const ResponseService_1 = require("../services/ResponseService");
class Webhook {
    static syncStock(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = null;
            switch (ctx.params.eventName) {
                case "order-created":
                    res = yield WebhookService_1.WebhookService.orderCreated(ctx.request.body);
                    break;
                default:
                    res = ResponseService_1.ResponseBuilder(null, null, false);
                    break;
            }
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static recountStock(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield WebhookService_1.WebhookService.recountStock();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.Webhook = Webhook;
