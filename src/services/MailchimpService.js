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
const axios_1 = require("axios");
const mailchimpApiUrl = 'https://us14.api.mailchimp.com/3.0';
const specialOffersListId = 'fea5a50579';
class MailchimpService {
    static post(url, body) {
        try {
            return axios_1.default.post(mailchimpApiUrl + url, body, {
                auth: {
                    username: process.env.MAILCHIMP_LABEL,
                    password: process.env.MAILCHIMP_API_KEY
                }
            });
        }
        catch (err) {
            throw new Error(err);
        }
    }
    static addEmailToSpecialOffersList(email, name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [firstName, ..._lastName] = name.split(' ');
                const lastName = _lastName.join(' ');
                yield this.post(`/lists/${specialOffersListId}/members`, {
                    email_address: email,
                    status: 'subscribed',
                    merge_fields: {
                        FNAME: firstName,
                        LNAME: lastName
                    }
                });
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
exports.MailchimpService = MailchimpService;
