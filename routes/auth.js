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
const Router = require("koa-router");
const jwt = require('jsonwebtoken');
const router = new Router();
const user_1 = require("../models/user");
router.post('/auth/login', user_1.User.getAuth);
router.post('/auth/signup', user_1.User.signup);
router.get('/jwt', function getJWT(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!ctx.header.authorization)
            ctx.throw(401, 'Authorization required');
        const [scheme, token] = ctx.header.authorization.split(' ');
        if (scheme !== 'Bearer')
            ctx.throw(401, 'Invalid authorization');
        try {
            const payload = jwt.verify(token, process.env.JWT_KEY);
            // If it's a valid token, accept it
            ctx.state.user = payload;
            const curDate = Number(new Date()) / 1000;
            ctx.state.user.curDate = curDate;
            const seconds = Math.round(ctx.state.user.exp - curDate);
            ctx.state.user.remainingSeconds = Math.round(seconds);
            ctx.state.user.remainingMinutes = Math.round(seconds / 60);
            ctx.state.user.remainingHours = Math.round(seconds / 60 / 60);
            ctx.body = ctx.state.user;
            ctx.root = 'TOKEN';
        }
        catch (e) {
            if (e.message === 'invalid token')
                ctx.throw(401, 'Invalid JWT');
            ctx.throw(e.status || 500, e.message);
        }
    });
});
exports.default = router.routes();
//# sourceMappingURL=auth.js.map