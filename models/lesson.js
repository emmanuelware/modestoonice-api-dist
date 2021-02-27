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
const LessonService_1 = require("../services/LessonService");
const ResponseService_1 = require("../services/ResponseService");
class Lesson {
    static getLessons(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield LessonService_1.LessonService.getLessons();
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
    static bookLesson(ctx) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield LessonService_1.LessonService.bookLesson(ctx.request.body);
            ctx.body = ResponseService_1.ResponseHandler(ctx, res);
        });
    }
}
exports.Lesson = Lesson;
