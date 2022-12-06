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
const EmailService_1 = require("./EmailService");
const ResponseService_1 = require("./ResponseService");
const UtilService_1 = require("./UtilService");
const logging_1 = require("../utils/logging");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const scrypt = require("scrypt");
class AuthService {
    static getAuth(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            let user = null;
            // Try to parse and assign the body
            const body = ctx.request.body;
            yield global.db.query('INSERT INTO authLoginLog (email, timestamp, userAgent) VALUES (:email, NOW(), :userAgent)', {
                email: body.email,
                userAgent: ctx.header['user-agent']
            });
            // Attempt to log the user with their email / password combo
            [[user]] = yield global.db.query(`
      SELECT  
        id,
        accountType,
        email,
        password,
        signupDate,
        lastLoginDate,
        role,
        status 
      FROM user 
      WHERE email = :email`, {
                email: body.email
            });
            // Return if no user was found
            if (!user) {
                return ResponseService_1.ResponseBuilder(null, 'Email / password not found', true);
            }
            // Check the password
            try {
                const match = yield scrypt.verifyKdf(Buffer.from(user.password, 'base64'), body.password);
                if (!match) {
                    return ResponseService_1.ResponseBuilder(null, 'Email / password not found', true);
                }
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, 'Email / password not found', true, {
                    error: e,
                    log: true
                });
            }
            // Set the state
            ctx.state.user = user;
            // Attempt to create a JWT
            try {
                // Set payload
                const payload = {
                    id: user.id,
                    role: user.role
                };
                // Create token
                const token = jwt.sign(payload, process.env.JWT_KEY, {
                    expiresIn: process.env.TOKEN_TIME
                });
                // Create expiry time
                const decoded = jwt.verify(token, process.env.JWT_KEY);
                // Update last login field
                yield global.db.query('UPDATE user SET lastLoginDate = NOW() WHERE id = :id', {
                    id: user.id
                });
                return ResponseService_1.ResponseBuilder({
                    jwt: token
                }, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, 'Email / password not found', true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static signup(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const req = ctx.request.body;
                const [[user]] = yield global.db.query('SELECT email FROM user WHERE email = :email', {
                    email: req.email
                });
                if (user) {
                    return ResponseService_1.ResponseBuilder(null, 'Email already in use', true);
                }
                let hashedPassword = '';
                while (hashedPassword.length < 10) {
                    hashedPassword = scrypt.kdfSync(req.password, { N: 15, r: 9, p: 2 });
                }
                yield global.db.query('INSERT INTO user (email, password, lastLoginDate, signupDate, role, status) VALUES (:email, :password, NOW(), NOW(), :role, :status)', {
                    email: req.email,
                    password: hashedPassword,
                    role: 1,
                    status: 1
                });
                return ResponseService_1.ResponseBuilder(null, 'Successfully registered', false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, 'An error occurred', true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static resetPasswordWithMagicLink(email, password, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[obj]] = yield global.db.query('SELECT id, requestDate, token, usedFlag, email FROM resetPasswordToken WHERE email = :email ORDER BY requestDate DESC LIMIT 1', {
                    email: email
                });
                const matchedTokenKey = yield scrypt.verifyKdf(new Buffer(obj.token, 'base64'), token);
                if (!matchedTokenKey) {
                    return ResponseService_1.ResponseBuilder(null, 'An error ocurred.', true);
                }
                const nowDate = moment();
                const expireDate = moment(obj.expireDate);
                if (obj.usedFlag || nowDate > expireDate) {
                    return ResponseService_1.ResponseBuilder(null, 'This link has expired.', true);
                }
                let hashedPassword = '';
                while (hashedPassword.length < 10) {
                    hashedPassword = scrypt.kdfSync(password, {
                        N: 16,
                        r: 8,
                        p: 2
                    });
                }
                yield global.db.query('UPDATE user SET password = :password WHERE email = :email', {
                    password: hashedPassword,
                    email: email
                });
                yield global.db.query('UPDATE resetPasswordToken SET usedFlag = 1, usedDate = NOW() WHERE id = :id', {
                    id: obj.id
                });
                return ResponseService_1.ResponseBuilder(null, 'Successfully reset password.', false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, 'An error ocurred', true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static sendResetPasswordMagicLink(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [insert] = yield global.db.query(`INSERT INTO resetPasswordToken (email, requestDate, expireDate) VALUES (:email, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY))`, {
                    email: email
                });
                const token = UtilService_1.UtilService.generateRandomString(255);
                const link = `${process.env.DOMAIN}/reset-password-confirmation/?email=${email}&token=${token}`;
                let hashedToken = '';
                while (hashedToken.length < 10) {
                    hashedToken = scrypt.kdfSync(token, {
                        N: 15,
                        r: 9,
                        p: 2
                    });
                }
                yield global.db.query('UPDATE resetPasswordToken SET token = :token WHERE id = :id', {
                    id: insert.insertId,
                    token: hashedToken
                });
                yield EmailService_1.EmailService.sendResetPasswordEmail({
                    email: email,
                    link: link
                });
                return ResponseService_1.ResponseBuilder(null, 'Sent password reset link', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, 'Could not send password reset link', true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static resetPasswordWithMagicLinkToken(email, token, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[obj]] = yield global.db.query('SELECT id, requestDate, token, usedFlag, email FROM resetPasswordToken WHERE email = :email ORDER BY requestDate DESC LIMIT 1', {
                    email: email
                });
                const matchedTokenKey = yield scrypt.verifyKdf(new Buffer(obj.token, 'base64'), token);
                if (!matchedTokenKey) {
                    return ResponseService_1.ResponseBuilder(null, 'An error ocurred.', true);
                }
                const nowDate = moment();
                const expireDate = moment(obj.expireDate);
                if (obj.usedFlag || nowDate > expireDate) {
                    return ResponseService_1.ResponseBuilder(null, 'This link has expired.', true);
                }
                let hashedPassword = '';
                while (hashedPassword.length < 10) {
                    hashedPassword = scrypt.kdfSync(password, {
                        N: 16,
                        r: 8,
                        p: 2
                    });
                }
                yield global.db.query('UPDATE user SET password = :password WHERE email = :email', {
                    password: hashedPassword,
                    email: email
                });
                yield global.db.query('UPDATE resetPasswordToken SET usedFlag = 1, usedDate = NOW() WHERE id = :id', {
                    id: obj.id
                });
                return ResponseService_1.ResponseBuilder(null, 'Successfully reset password.', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getUserAccountInfo(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[user]] = yield global.db.query('SELECT * FROM user WHERE id = :userId', {
                    userId
                });
                return ResponseService_1.ResponseBuilder(user, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static updateUserAccountInfo(userId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logging_1.generateLogs('NodeApi', 'AuthService', 'updateUserAccountInfo', 'Updating account information.');
                yield global.db.query('UPDATE user SET name = :name, phone = :phone WHERE id = :userId', {
                    name: payload.name,
                    phone: payload.phone,
                    userId: userId
                });
                return ResponseService_1.ResponseBuilder(null, 'Successfully updated.', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=AuthService.js.map