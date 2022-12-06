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
class ConfigService {
    static getNotificationEmails() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [dailySalesEmails] = yield global.db.query('SELECT * FROM dailySalesEmailList');
                const [contactUsEmails] = yield global.db.query('SELECT * FROM contactUsEmailList');
                return ResponseService_1.ResponseBuilder({
                    dailySalesEmails: dailySalesEmails,
                    contactUsEmails: contactUsEmails
                }, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static addNotificationEmail(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const table = payload.type === 'dailySales' ? 'dailySalesEmailList' : 'contactUsEmailList';
                yield global.db.query(`INSERT INTO ${table} (email, dateAdded) VALUES (:email, NOW())`, {
                    table: table,
                    email: payload.value
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static deleteDailySalesNotificationEmail(recordId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('DELETE FROM dailySalesEmailList WHERE id = :recordId', {
                    recordId: recordId
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static deleteContactUsNotificationEmail(recordId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('DELETE FROM contactUsEmailList WHERE id = :recordId', {
                    recordId: recordId
                });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=ConfigService.js.map