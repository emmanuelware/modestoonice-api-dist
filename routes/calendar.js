"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const calendar_1 = require("../models/calendar");
const router = new Router();
router.get('/calendar/:date', calendar_1.Calendar.getSessionsByCalendarDate);
router.post('/calendar/session', calendar_1.Calendar.addSession);
router.put('/calendar/session/inventory', calendar_1.Calendar.updateSessionInventory);
router.put('/calendar/session', calendar_1.Calendar.updateSession);
router.delete('/calendar/session/:squareSessionItemId', calendar_1.Calendar.deleteSessionBySquareItemId);
exports.default = router.routes();
//# sourceMappingURL=calendar.js.map