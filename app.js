#!/usr/bin/env node
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
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const account_1 = require("./routes/account");
const auth_public_1 = require("./routes/auth-public");
const auth_1 = require("./routes/auth");
const birthday_public_1 = require("./routes/birthday-public");
const birthday_1 = require("./routes/birthday");
const book_public_1 = require("./routes/book-public");
const calendar_1 = require("./routes/calendar");
const config_1 = require("./routes/config");
const coupon_1 = require("./routes/coupon");
const email_public_1 = require("./routes/email-public");
const email_1 = require("./routes/email");
const faq_public_1 = require("./routes/faq-public");
const faq_1 = require("./routes/faq");
const lesson_public_1 = require("./routes/lesson-public");
const reservation_1 = require("./routes/reservation");
const root_1 = require("./routes/root");
const square_public_1 = require("./routes/square-public");
const square_1 = require("./routes/square");
const system_1 = require("./routes/system");
const user_1 = require("./routes/user");
const body = require('koa-body');
const cors = require("koa2-cors");
const jwt = require("jsonwebtoken");
const koa = require("koa");
const mysql = require("mysql2/promise");
const Sentry = require("@sentry/node");
if (process.env.ENV_MODE && process.env.ENV_MODE === 'prod') {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        enabled: process.env.ENV_MODE === 'prod' ? true : false,
        beforeSend(event, hint) {
            const error = hint.originalException;
            if (error && error.message) {
                event.fingerprint = [error.message];
            }
            return event;
        }
    });
}
const app = (global.app = new koa());
app.on('error', (err, ctx) => {
    if (process.env.ENV_MODE === 'prod') {
        if (ctx.sentry !== false) {
            Sentry.withScope(scope => {
                scope.addEventProcessor(event => Sentry.Handlers.parseRequest(event, ctx.request));
                Sentry.captureException(err);
            });
        }
    }
    else {
        console.error(err);
    }
});
const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};
global.connectionPool = mysql.createPool(config);
app.use(function timing(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const start = Date.now();
        yield next();
        const ms = Date.now() - start;
        ctx.set('X-Response-Time', Math.ceil(ms) + 'ms');
    });
});
app.use(body({ jsonLimit: '10mb' }));
app.keys = ['modestoonice-node'];
app.use(function contentNegotiation(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        yield next();
        if (!ctx.body)
            return;
        const type = ctx.accepts('json', 'text');
        switch (type) {
            case 'json':
            default:
                break;
            case false:
                ctx.throw(406);
                break;
        }
    });
});
app.use(function handleErrors(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield next();
        }
        catch (e) {
            ctx.status = e.status || 500;
            console.log('Error ocurred in environment', process.env.ENV_MODE, e);
            if (process.env.ENV_MODE && process.env.ENV_MODE === 'prod') {
                Sentry.captureException(e);
            }
        }
    });
});
app.use(cors({
    origin: ctx => {
        const origin = ctx.request.header.origin;
        return origin;
    }
}));
app.use(function mysqlConnection(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            ctx.state.db = global.db = yield global.connectionPool.getConnection();
            ctx.state.db.connection.config.namedPlaceholders = true;
            yield ctx.state.db.query('SET SESSION sql_mode = "TRADITIONAL"');
            yield ctx.state.db.query(`SET time_zone = '-8:00'`);
            yield next();
            ctx.state.db.release();
        }
        catch (e) {
            if (ctx.state.db)
                ctx.state.db.release();
            console.error(e);
        }
    });
});
app.use(root_1.default);
app.use(auth_1.default);
app.use(auth_public_1.default);
app.use(birthday_public_1.default);
app.use(coupon_1.default);
app.use(email_public_1.default);
app.use(faq_public_1.default);
app.use(square_public_1.default);
app.use(book_public_1.default);
app.use(lesson_public_1.default);
app.use(square_1.default);
app.use(function verifyJwt(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!ctx.header.authorization)
            ctx.throw(401, 'Authorization required');
        const [scheme, token] = ctx.header.authorization.split(' ');
        if (scheme !== 'Bearer')
            ctx.throw(401, 'Invalid authorization');
        try {
            const payload = jwt.verify(token, process.env.JWT_KEY);
            ctx.state.user = payload;
        }
        catch (e) {
            console.log(e);
        }
        yield next();
    });
});
app.use(user_1.default);
app.use(account_1.default);
app.use(birthday_1.default);
app.use(calendar_1.default);
app.use(config_1.default);
app.use(email_1.default);
app.use(faq_1.default);
app.use(reservation_1.default);
app.use(system_1.default);
app.listen(process.env.PORT || 3000);
console.info(`${process.version} listening on port ${process.env.PORT || 3000} (${app.env}/${config.database})`);
module.exports = app;
