"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const reservation_1 = require("../models/reservation");
const router = new Router();
router.get('/reservation/admin', reservation_1.Reservation.getBookedReservations);
router.post('/reservation', reservation_1.Reservation.bookReservation);
exports.default = router.routes();
//# sourceMappingURL=reservation.js.map