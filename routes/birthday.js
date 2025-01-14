"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Router = require("koa-router");
const birthday_1 = require("../models/birthday");
const router = new Router();
router.get('/birthday/image/cover/:id', birthday_1.Birthday.getBirthdayCoverImageById);
router.get('/birthday/package', birthday_1.Birthday.getBirthdayPackages);
router.get('/birthday/admin/package/:id', birthday_1.Birthday.getBirthdayPackageById);
router.get('/birthday/extra', birthday_1.Birthday.getBirthdayExtras);
router.get('/birthday/admin/extra/:id', birthday_1.Birthday.getBirthdayExtraById);
router.get('/birthday/admin/all', birthday_1.Birthday.getAllBookedBirthdaySessions);
router.get('/birthday/admin/today', birthday_1.Birthday.getTodayBirthdayBookings);
router.get('/birthday/admin/:birthdayId', birthday_1.Birthday.getBookedBirthdayById);
router.post('/birthday/extra/image', birthday_1.Birthday.upsertBirthdayExtraImage);
router.post('/birthday/package/image', birthday_1.Birthday.upsertBirthdayImage);
router.post('/birthday/admin/package', birthday_1.Birthday.addBirthdayPackage);
router.post('/birthday/admin/extra/batch', birthday_1.Birthday.addBirthdayExtraBatch);
router.put('/birthday/admin/package', birthday_1.Birthday.updateBirthdayPackage);
router.put('/birthday/admin/extra', birthday_1.Birthday.updateExtraById);
router.delete('/birthday/admin/extra/:extraId', birthday_1.Birthday.deleteExtraById);
exports.default = router.routes();
//# sourceMappingURL=birthday.js.map