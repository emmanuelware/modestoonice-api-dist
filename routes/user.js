"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const user_1 = require("../models/user");
const router = new Router();
router.get('/user/info', user_1.User.getUserAccountInfo);
router.get('/user/pass', user_1.User.getUserPass);
router.get('/user/pass/:confirmationNumber', user_1.User.getUserPassByConfirmationNumber);
router.get('/user/session', user_1.User.getUserSessions);
router.get('/user/session/:confirmationNumber', user_1.User.getUserSessionByConfirmationNumber);
router.get('/user/skater-waiver', user_1.User.getSkaterWaiverSignature);
router.post('/user/pass', user_1.User.addUserPass);
router.post('/user/session/book', user_1.User.bookSession);
router.put('/user/info', user_1.User.updateUserAccountInfo);
router.put('/user/skater-waiver/:id', user_1.User.editSkaterWaiver);
exports.default = router.routes();
//# sourceMappingURL=user.js.map