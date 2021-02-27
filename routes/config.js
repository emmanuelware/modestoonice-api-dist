"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router = require('koa-router')();
const config_1 = require("../models/config");
router.get('/config/notification-emails', config_1.Config.getNotificationEmails);
router.post('/config/notification-emails', config_1.Config.addNotificationEmail);
router.delete('/config/notification-emails/daily-sales/:recordId', config_1.Config.deleteDailySalesNotificationEmail);
router.delete('/config/notification-emails/contact-us/:recordId', config_1.Config.deleteContactUsNotificationEmail);
module.exports = router.middleware();
