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
const FaqService_1 = require("../services/FaqService");
const ResponseService_1 = require("../services/ResponseService");
class Faq {
    static getFaqs(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield FaqService_1.FaqService.getFaqs();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static upsertFaq(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield FaqService_1.FaqService.upsertFaq(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static deleteFaq(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield FaqService_1.FaqService.deleteFaq(ctx.params.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static reorderFaqs(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield FaqService_1.FaqService.reorderFaqs(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.Faq = Faq;
//# sourceMappingURL=faq.js.map