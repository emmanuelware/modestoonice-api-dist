"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const reservation_1 = require("../models/reservation");
router.get('/reservation/admin', reservation_1.Reservation.getBookedReservations);
router.post('/reservation', reservation_1.Reservation.bookReservation);
module.exports = router.middleware();
