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
const EmailService_1 = require("./EmailService");
const MailchimpService_1 = require("./MailchimpService");
const ResponseService_1 = require("./ResponseService");
const S3Service_1 = require("./S3Service");
const SquareService_1 = require("./SquareService");
const UtilService_1 = require("./UtilService");
const constants_1 = require("../common/constants");
const email_constants_1 = require("../common/email.constants");
const moment = require("moment");
const logging_1 = require("../utils/logging");
class BirthdayService {
    static getAvailableBirthdaySessionsByDate(date) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const formattedDate = moment(date).format('YYYY-MM-DD');
                const startDate = `${formattedDate} 00:00:00`;
                const endDate = `${formattedDate} 23:59:59`;
                let [sessions] = yield global.db.query('SELECT * FROM birthdaySession WHERE (datetime BETWEEN :startDate AND :endDate) ORDER BY datetime', {
                    startDate,
                    endDate
                });
                sessions.map(session => {
                    session.time = moment(session.datetime).format('h:mm a');
                });
                for (let i = 0; i < sessions.length; i++) {
                    const [[{ count }]] = yield global.db.query('SELECT COUNT(*) AS count FROM birthdayBooking WHERE birthdaySessionId = :birthdaySessionId', {
                        birthdaySessionId: sessions[i].id
                    });
                    sessions[i].totalBooked = +count;
                }
                return ResponseService_1.ResponseBuilder(sessions, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getBirthdayPackages() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [birthdayPackages] = yield global.db.query('SELECT * FROM birthdayPackage');
                yield Promise.all(birthdayPackages.map((birthdayPackage) => __awaiter(this, void 0, void 0, function* () {
                    const [details] = yield global.db.query('SELECT * FROM birthdayPackageDetail WHERE birthdayPackageId = :id', {
                        id: birthdayPackage.id
                    });
                    birthdayPackage.details = details;
                    const { data: coverUrl } = yield this.getBirthdayCoverImageById(birthdayPackage.id);
                    birthdayPackage.coverUrl = coverUrl;
                    yield Promise.all(details.map((detail) => __awaiter(this, void 0, void 0, function* () {
                        const { data: imageUrl } = yield this.getBirthdayExtraImageById(detail.id);
                        detail.imageUrl = imageUrl;
                    })));
                })));
                return ResponseService_1.ResponseBuilder(birthdayPackages, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getBirthdayPackageById(packageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[birthdayPackage]] = yield global.db.query('SELECT * FROM birthdayPackage WHERE id = :id', {
                    id: packageId
                });
                const [details] = yield global.db.query('SELECT * FROM birthdayPackageDetail WHERE birthdayPackageId = :id', {
                    id: packageId
                });
                birthdayPackage.details = details;
                return ResponseService_1.ResponseBuilder(birthdayPackage, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static addBirthdayPackage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [insert] = yield global.db.query('INSERT INTO birthdayPackage (name, price, dateAdded) VALUES (:name, :price, NOW())', {
                    name: payload.name,
                    price: payload.price
                });
                yield Promise.all(payload.details.map((detail) => __awaiter(this, void 0, void 0, function* () {
                    yield global.db.query('INSERT INTO birthdayPackageDetail (birthdayPackageId, label, dateAdded) VALUES (:packageId, :label, NOW())', {
                        packageId: insert.insertId,
                        label: detail.label
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
    static updateBirthdayPackage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('DELETE FROM birthdayPackageDetail WHERE birthdayPackageId = :id', {
                    id: payload.id
                });
                yield Promise.all(payload.details.map((detail) => __awaiter(this, void 0, void 0, function* () {
                    yield global.db.query('INSERT INTO birthdayPackageDetail (birthdayPackageId, label, dateAdded) VALUES (:packageId, :label, NOW())', {
                        packageId: payload.id,
                        label: detail.label
                    });
                })));
                yield global.db.query('UPDATE birthdayPackage SET name = :name, price = :price WHERE id = :id', {
                    id: payload.id,
                    name: payload.name,
                    price: payload.price
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
    static deletePackageById(packageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('DELETE FROM birthdayPackage WHERE id = :packageId', {
                    packageId: packageId
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
    static getBirthdayExtras() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [birthdayExtras] = yield global.db.query('SELECT * FROM birthdayExtra');
                yield Promise.all(birthdayExtras.map((extra) => __awaiter(this, void 0, void 0, function* () {
                    const { data: imageUrl } = yield this.getBirthdayExtraImageById(extra.id);
                    extra.imageUrl = imageUrl;
                })));
                return ResponseService_1.ResponseBuilder(birthdayExtras, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getBirthdayExtraById(extraId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[birthdayExtra]] = yield global.db.query('SELECT * FROM birthdayExtra WHERE id = :id', {
                    id: extraId
                });
                return ResponseService_1.ResponseBuilder(birthdayExtra, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static addBirthdayExtraBatch(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield Promise.all(payload.map((detail) => __awaiter(this, void 0, void 0, function* () {
                    if (detail.name && detail.price) {
                        yield global.db.query('INSERT INTO birthdayExtra (name, price, dateAdded) VALUES (:name, :price, NOW())', {
                            name: detail.name,
                            price: detail.price
                        });
                    }
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
    static updateExtraById(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('UPDATE birthdayExtra SET name = :name, price = :price, dateModified = NOW() WHERE id = :id', {
                    name: payload.name,
                    price: payload.price,
                    id: payload.id
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
    static deleteExtraById(extraId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query('DELETE FROM birthdayExtra WHERE id = :id', {
                    id: extraId
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
    static bookBirthday(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Invoked method.`);
                const [[session]] = yield global.db.query('SELECT * FROM birthdaySession WHERE id = :birthdaySessionId', {
                    birthdaySessionId: payload.birthdaySessionId
                });
                const [[{ counts }]] = yield global.db.query('SELECT COUNT(*) AS counts FROM birthdayBooking where birthdaySessionId = :birthdaySessionId', {
                    birthdaySessionId: payload.birthdaySessionId
                });
                if (session.totalAvailable <= counts) {
                    throw new Error('Birthday sessions are not available for this date');
                }
                const confirmationNumber = UtilService_1.UtilService.generateRandomString(12).toUpperCase();
                const dollarAmount = +(payload.amount / 100).toFixed(2);
                const bookingDate = moment(session.datetime);
                const todaysDateAndTime = moment();
                const cutoffDateAndTime = moment(bookingDate)
                    .subtract(1, 'days')
                    .set({
                    hour: 20,
                    minutes: 0,
                    seconds: 0,
                    milliseconds: 0
                });
                if (!bookingDate.isAfter(todaysDateAndTime) || !todaysDateAndTime.isSameOrBefore(cutoffDateAndTime)) {
                    throw new Error('All birthday sessions must be booked by 9:00pm PST the day before.');
                }
                const [[birthdayPackage]] = yield global.db.query('SELECT skatersIncluded FROM birthdayPackage WHERE id = :packageId', {
                    packageId: payload.selectedPackageId
                });
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Subscribing user to Mailchimp.`);
                const name = `${payload.firstName} ${payload.lastName}`;
                yield MailchimpService_1.MailchimpService.addEmailToSpecialOffersList(payload.email, name);
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Fetched birthday package information.`);
                const { data: sessions } = yield SquareService_1.SquareService.findCalendarDateSessionByDate(session.datetime);
                const [catalogItem] = sessions.filter(_session => {
                    if (moment(session.datetime).format(constants_1.DEFAULT_MOMENT_FORMAT) === _session.itemData.name) {
                        return _session;
                    }
                });
                const { data: inventory } = yield SquareService_1.SquareService.getCalendarDateSessionInventoryCountByCatalogObject(catalogItem.itemData.variations[1].id);
                const adjustedMasterInventory = +inventory.counts[0].quantity - birthdayPackage.skatersIncluded;
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Adjusted inventory: ${adjustedMasterInventory} - CatalogID: ${catalogItem.itemData.variations[1].id}`);
                if (process.env.ENV_MODE === 'prod') {
                    yield SquareService_1.SquareService.updateMasterTicketCount(catalogItem.itemData.variations[1].id, birthdayPackage.skatersIncluded).catch(err => {
                        logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Cannot adjust inventory: ${err}`);
                        return ResponseService_1.ResponseBuilder(null, 'An error ocurred. Error code AdjInv.352', true);
                    });
                }
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Attempting to process payment.`);
                let { data: paymentResponse } = yield SquareService_1.SquareService.processPayment({
                    amount: payload.amount,
                    nonce: payload.nonce
                });
                if (typeof paymentResponse === 'string') {
                    paymentResponse = JSON.parse(paymentResponse);
                }
                if (paymentResponse.errors) {
                    logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Could not process payment.`);
                    return ResponseService_1.ResponseBuilder(null, `Cannot process payment: ${paymentResponse.errors[0].detail}`, true);
                }
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Inserting birthday party information into the database.`);
                const [insert] = yield global.db.query(`
        INSERT INTO birthdayBooking (
          userId,
          birthdayPackageId,
          birthdaySessionId,
          transactionId,
          userFirstName,
          userLastName,
          userEmail,
          userPhone,
          confirmationNumber,
          totalPrice,
          guestOfHonor,
          notes,
          dateEntered
        ) VALUES (
          :userId,
          :birthdayPackageId,
          :birthdaySessionId,
          :transactionId,
          :userFirstName,
          :userLastName,
          :userEmail,
          :userPhone,
          :confirmationNumber,
          :totalPrice,
          :guestOfHonor,
          :notes,
          NOW()
        )
      `, {
                    userId: userId || null,
                    birthdayPackageId: payload.selectedPackageId,
                    birthdaySessionId: payload.birthdaySessionId,
                    transactionId: paymentResponse ? paymentResponse.transaction.id : null,
                    userFirstName: payload.firstName,
                    userLastName: payload.lastName,
                    userEmail: payload.email,
                    userPhone: payload.phone,
                    confirmationNumber: confirmationNumber,
                    totalPrice: dollarAmount,
                    guestOfHonor: payload.guestOfHonor,
                    notes: payload.notes
                });
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Inserting birthday party extras into the database.`);
                yield Promise.all(payload.extras.map((extra) => __awaiter(this, void 0, void 0, function* () {
                    yield global.db.query(`
            INSERT INTO birthdayBookingExtra (
              birthdayBookingId,
              birthdayExtraId,
              itemPrice,
              quantity,
              dateEntered
            ) VALUES (
              :birthdayBookingId,
              :birthdayExtraId,
              :itemPrice,
              :quantity,
              NOW()
            )
          `, {
                        birthdayBookingId: insert.insertId,
                        birthdayExtraId: extra.id,
                        itemPrice: extra.price,
                        quantity: extra.quantity
                    });
                })));
                if (payload.selectedPizzas) {
                    logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Inserting birthday party pizzas into the database.`);
                    yield Promise.all(payload.selectedPizzas.map((pizza) => __awaiter(this, void 0, void 0, function* () {
                        yield global.db.query(`
              INSERT INTO birthdayBookingPizza (
                birthdayBookingId,
                pizzaType,
                dateEntered
              ) VALUES (
                :birthdayBookingId,
                :pizzaType,
                NOW()
              )
            `, {
                            birthdayBookingId: insert.insertId,
                            pizzaType: pizza
                        });
                    })));
                }
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', 'Getting selected package name.');
                const [[packageRecord]] = yield global.db.query('SELECT name FROM birthdayPackage WHERE id = :id', {
                    id: payload.selectedPackageId
                });
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Sending confirmation email.`);
                const pizzaText = payload.selectedPizzas ? payload.selectedPizzas.join(', ') : 'None';
                let extrasHtml = '';
                if (payload.extras && payload.extras.length) {
                    extrasHtml += '<p>Selected extras: <b>';
                    yield Promise.all(payload.extras.map((_extra, index) => __awaiter(this, void 0, void 0, function* () {
                        const { data: extra } = yield this.getBirthdayExtraById(_extra.id);
                        if (index === payload.extras.length - 1) {
                            extrasHtml += `${_extra.quantity}x ${extra.name}`;
                        }
                        else {
                            extrasHtml += `${_extra.quantity}x ${extra.name}, `;
                        }
                    })));
                    extrasHtml += '</b></p>';
                }
                yield EmailService_1.EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Your Birthday Information', `
        <h3>Thanks for booking your birthday with Modesto On Ice!</h3>

        <p>Below is your birthday booking information</p>

        <p>Confirmation code: <b>${confirmationNumber}</b></p>

        <p>Package name: <b>${packageRecord.name}</b></p>

        <p>Selected pizzas: <b>${pizzaText}</b></p>

        ${extrasHtml}

        <p>Booking date: <b>${moment(session.datetime).format('MMM D, YYYY') +
                    ' at ' +
                    moment(session.datetime).format('h:mm a')}</b></p>

        <p>Total: <b>$${dollarAmount.toFixed(2)}</b></p>

        <hr>

        <p>First name: <b>${payload.firstName || '-'}</b></p>

        <p>Last name: <b>${payload.lastName || '-'}</b></p>

        <p>Email: <b>${payload.email || '-'}</b></p>

        <p>Phone: <b>${payload.phone || '-'}</b></p>

        <p>Notes: <b>${payload.notes || '-'}</b></p>

        <hr>

        <p>Downloadable, customizable invitations can be found at <a href="https://www.modestoonice.com/invitations">https://www.modestoonice.com/invitations</a>!</p>

        <hr>

        <p>**** Skater Waiver ****</p>
        <p>All skaters are required to have a Waiver.  If additional waivers are needed under your Confirmation Number, please share the following link and your Confirmation number to everyone in your group for a smoother check-in when you arrive at the ice rink.  </p>

        <p>
          <a href="${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=birthdayBooking">Click here</a> or copy and paste this in your browser:
        </p>

        <p>${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=birthdayBooking</p>

        <hr>

        <p>Use the barcode below at the ticket booth!</p>

        <img alt="Your barcode" src="http://www.barcodes4.me/barcode/c128a/${confirmationNumber}.png?height=400&resolution=4">
        
        <hr>

        <p class="attrition">Barcodes generated by <a href="https://the-refinery.io">Cleveland Web Design company, The Refinery</a>.</p>
      `, email_constants_1.DEFAULT_EMAIL_CC);
                console.log('Email URL', `${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=birthdayBooking`);
                return ResponseService_1.ResponseBuilder({
                    confirmationNumber: confirmationNumber
                }, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(e.message, 'Birthday Booking Error', true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static upsertBirthdayImage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const s3Instance = S3Service_1.S3Service.createS3Instance();
                const media = new Buffer(payload.media.replace(/^data:image\/\w+;base64,/, ''), 'base64');
                const extension = payload.extension.split('/')[1] ? payload.extension.split('/')[1] : payload.extension;
                yield S3Service_1.S3Service.addMediaBucketObject(process.env.AWS_BUCKET, `${process.env.AWS_ENV}/birthday-${payload.birthdayId}/cover`, extension, media, s3Instance);
                return ResponseService_1.ResponseBuilder(null, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static upsertBirthdayExtraImage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const s3Instance = S3Service_1.S3Service.createS3Instance();
                const media = new Buffer(payload.media.replace(/^data:image\/\w+;base64,/, ''), 'base64');
                const extension = payload.extension.split('/')[1] ? payload.extension.split('/')[1] : payload.extension;
                yield S3Service_1.S3Service.addMediaBucketObject(process.env.AWS_BUCKET, `${process.env.AWS_ENV}/birthday-extra-${payload.extraId}/cover`, extension, media, s3Instance);
                return ResponseService_1.ResponseBuilder(null, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getBirthdayCoverImageById(birthdayId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const s3Instance = S3Service_1.S3Service.createS3Instance();
                const [object] = yield S3Service_1.S3Service.fetchBucketObjectsByPrefix(process.env.AWS_BUCKET, `${process.env.AWS_ENV}/birthday-${birthdayId}`, s3Instance);
                if (object && object.Key) {
                    const url = yield S3Service_1.S3Service.getSignedUrl(process.env.AWS_BUCKET, object.Key, s3Instance);
                    return ResponseService_1.ResponseBuilder(url, null, false);
                }
                else {
                    return ResponseService_1.ResponseBuilder(null, null, false);
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
    static getBirthdayExtraImageById(extraId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const s3Instance = S3Service_1.S3Service.createS3Instance();
                const [object] = yield S3Service_1.S3Service.fetchBucketObjectsByPrefix(process.env.AWS_BUCKET, `${process.env.AWS_ENV}/birthday-extra-${extraId}`, s3Instance);
                if (object && object.Key) {
                    const url = yield S3Service_1.S3Service.getSignedUrl(process.env.AWS_BUCKET, object.Key, s3Instance);
                    return ResponseService_1.ResponseBuilder(url, null, false);
                }
                else {
                    return ResponseService_1.ResponseBuilder(null, null, false);
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
    static getBookedBirthdayById(birthdayId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[birthday]] = yield global.db.query(`
        SELECT 
          bb.*, 
          bp.name AS packageName,
          bs.datetime,
          s.label AS status 
        FROM birthdayBooking bb
        LEFT JOIN birthdaySession bs
        ON bb.birthdaySessionId = bs.id
        LEFT JOIN birthdayPackage bp
        ON bp.id = bb.birthdayPackageId
        LEFT JOIN birthdayBookingStatus s
        ON bb.birthdayStatusId = s.id
        WHERE bb.id = :id
      `, {
                    id: birthdayId
                });
                const [pizzas] = yield global.db.query(`SELECT * FROM birthdayBookingPizza WHERE birthdayBookingId = :id`, {
                    id: birthdayId
                });
                const [extras] = yield global.db.query(`
        SELECT 
          bba.itemPrice, 
          bba.quantity, 
          ba.name, 
          ba.price 
        FROM birthdayBookingExtra bba 
        LEFT JOIN birthdayExtra ba 
        ON bba.birthdayExtraId = ba.id 
        WHERE birthdayBookingId = :birthdayBookingId`, {
                    birthdayBookingId: birthday.id
                });
                birthday.extras = extras;
                birthday.pizzas = !pizzas
                    ? '-'
                    : pizzas
                        .map(pizza => {
                        return pizza.pizzaType;
                    })
                        .join(', ');
                return ResponseService_1.ResponseBuilder(birthday, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getTodayBirthdayBookings() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [birthdays] = yield global.db.query(`
        SELECT bb.*, bs.datetime 
        FROM birthdayBooking bb
        LEFT JOIN birthdaySession bs
        ON bb.birthdaySessionId = bs.id
        WHERE DATE(bs.datetime) = CURDATE()
        ORDER BY bs.datetime
      `);
                yield Promise.all(birthdays.map((birthday) => __awaiter(this, void 0, void 0, function* () {
                    const [extras] = yield global.db.query('SELECT * FROM birthdayBookingExtra WHERE birthdayBookingId = :birthdayBookingId', {
                        birthdayBookingId: birthday.id
                    });
                    birthday.extras = extras;
                })));
                return ResponseService_1.ResponseBuilder(birthdays, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getAllBookedBirthdaySessions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [birthdays] = yield global.db.query(`
        SELECT bb.*, bs.datetime 
        FROM birthdayBooking bb
        LEFT JOIN birthdaySession bs
        ON bb.birthdaySessionId = bs.id
        ORDER BY bs.datetime
      `);
                yield Promise.all(birthdays.map((birthday) => __awaiter(this, void 0, void 0, function* () {
                    const [extras] = yield global.db.query('SELECT * FROM birthdayBookingExtra WHERE birthdayBookingId = :birthdayBookingId', {
                        birthdayBookingId: birthday.id
                    });
                    birthday.extras = extras;
                })));
                return ResponseService_1.ResponseBuilder(birthdays, null, false);
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
exports.BirthdayService = BirthdayService;
