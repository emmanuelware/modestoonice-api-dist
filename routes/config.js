"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const config_1 = require("../models/config");
const router = new Router();
router.get('/config/notification-emails', config_1.Config.getNotificationEmails);
router.post('/config/notification-emails', config_1.Config.addNotificationEmail);
router.delete('/config/notification-emails/daily-sales/:recordId', config_1.Config.deleteDailySalesNotificationEmail);
router.delete('/config/notification-emails/contact-us/:recordId', config_1.Config.deleteContactUsNotificationEmail);
exports.default = router.routes();
//# sourceMappingURL=config.js.map