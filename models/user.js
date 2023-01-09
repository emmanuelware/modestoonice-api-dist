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
const AuthService_1 = require("../services/AuthService");
const UserService_1 = require("../services/UserService");
const constants_1 = require("../common/constants");
const ResponseService_1 = require("../services/ResponseService");
class User {
    static getAuth(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield AuthService_1.AuthService.getAuth(ctx);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static signup(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield AuthService_1.AuthService.signup(ctx);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getUserAccountInfo(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield AuthService_1.AuthService.getUserAccountInfo(ctx.state.user.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static updateUserAccountInfo(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield AuthService_1.AuthService.updateUserAccountInfo(ctx.state.user.id, ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static sendResetPasswordMagicLink(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield AuthService_1.AuthService.sendResetPasswordMagicLink(ctx.request.body.email);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static resetPasswordThroughMagicLink(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = ctx.request.body;
            const res = yield AuthService_1.AuthService.resetPasswordWithMagicLinkToken(body.email, body.token, body.password);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static bookSession(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield UserService_1.UserService.bookSession(ctx.request.body, ctx.state.user ? ctx.state.user.id : null);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static bookGuestSession(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield UserService_1.UserService.bookSession(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static addSkaterWaiverForBirthdays(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield UserService_1.UserService.addSkaterWaiverForBirthdays(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getUserSessions(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield UserService_1.UserService.getUserSessions(ctx.state.user.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getSkaterWaiverSignature(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield UserService_1.UserService.getSkaterWaiverSignature(ctx.state.user.id);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static addUserPass(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield UserService_1.UserService.addUserPass(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getUserPass(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield UserService_1.UserService.getUserPass(ctx.state.user.id, ctx.request.query);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static editSkaterWaiver(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield UserService_1.UserService.editSkaterWaiver(ctx.params.id, ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getUserSessionByConfirmationNumber(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield UserService_1.UserService.getUserSessionByConfirmationNumber(ctx.params.confirmationNumber);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static getUserPassByConfirmationNumber(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ctx.state.user.role < constants_1.EMPLOYEE_ROLE) {
                return;
            }
            const res = yield UserService_1.UserService.getUserPassByConfirmationNumber(ctx.params.confirmationNumber);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static addDomoBooking(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield UserService_1.UserService.addDomoBooking(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.User = User;
