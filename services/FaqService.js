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
class FaqService {
    static getFaqs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [faqs] = yield global.db.query('SELECT * FROM faqQuestion');
                return ResponseService_1.ResponseBuilder(faqs, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static upsertFaq(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[faqRecord]] = yield global.db.query('SELECT id FROM faqQuestion WHERE id = :recordId', {
                    recordId: payload.id
                });
                if (faqRecord) {
                    yield global.db.query(`
          UPDATE faqQuestion
          SET question = :question,
          answer = :answer
          WHERE id = :id
        `, {
                        question: payload.question,
                        answer: payload.answer,
                        id: faqRecord.id
                    });
                }
                else {
                    yield global.db.query(`
          INSERT INTO faqQuestion (
            question,
            answer,
            dateAdded
          ) VALUES (
            :question,
            :answer,
            NOW()
          )
        `, {
                        question: payload.question,
                        answer: payload.answer
                    });
                }
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static deleteFaq(faqId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('DELETE FROM faqQuestion WHERE id = :faqId', {
                    faqId: faqId
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
    static reorderFaqs(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('DELETE FROM faqQuestion WHERE id > 0');
                yield Promise.all(payload.map((faq) => __awaiter(this, void 0, void 0, function* () {
                    yield global.db.query(`
            INSERT INTO faqQuestion (
              question,
              answer,
              dateAdded
            ) VALUES (
              :question,
              :answer,
              NOW()
            )
          `, {
                        question: faq.question,
                        answer: faq.answer
                    });
                })));
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
exports.FaqService = FaqService;
//# sourceMappingURL=FaqService.js.map