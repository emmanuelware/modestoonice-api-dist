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
const EmailService_1 = require("../services/EmailService");
const ResponseService_1 = require("../services/ResponseService");
const constants_1 = require("../common/constants");
class Email {
    static handleContactUsSubmission(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield EmailService_1.EmailService.sendContactUsEmail(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static sendBirthdayEmailUsingPayload(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield EmailService_1.EmailService.sendBirthdayEmailUsingPayload(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static sendPassEmailUsingPayload(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.ADMIN_ROLE) {
                return;
            }
            const res = yield EmailService_1.EmailService.sendPassEmailUsingPayload(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.Email = Email;
