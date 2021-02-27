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
const SquareService_1 = require("../services/SquareService");
const ResponseService_1 = require("../services/ResponseService");
class Square {
    static getApplicationId(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield SquareService_1.SquareService.getApplicationId();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getBirthdayPackageDeposit(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield SquareService_1.SquareService.getBirthdayPackageDeposit();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static processPayment(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield SquareService_1.SquareService.processPayment(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getItemByTicketItemId(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield SquareService_1.SquareService.getItemById(ctx.request.body.ticketItemId);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.Square = Square;
