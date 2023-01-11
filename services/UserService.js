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
const CalendarService_1 = require("./CalendarService");
const EmailService_1 = require("./EmailService");
const MailchimpService_1 = require("./MailchimpService");
const ResponseService_1 = require("./ResponseService");
const SquareService_1 = require("./SquareService");
const UtilService_1 = require("./UtilService");
const email_constants_1 = require("../common/email.constants");
const constants_1 = require("../common/constants");
const logging_1 = require("../utils/logging");
const moment = require("moment");
const scrypt = require("scrypt");
class UserService {
    static bookSession(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Starting to book session.`);
                const couponValidation = yield UserService.checkCouponCodeValidity(payload.couponCodes);
                if (couponValidation.err) {
                    return couponValidation;
                }
                if (!payload.sessionId) {
                    return ResponseService_1.ResponseBuilder(null, 'Session not selected or not found', true);
                }
                const { err, msg } = yield SquareService_1.SquareService.getItemById(payload.sessionId);
                if (err) {
                    return ResponseService_1.ResponseBuilder(null, msg, true);
                }
                const confirmationNumber = UtilService_1.UtilService.generateRandomString(12, {
                    numbers: true
                }).toUpperCase();
                const adultTickets = payload.adultTicketCount || 0;
                const kidTickets = payload.childTicketCount || 0;
                const ticketTypeIDs = yield SquareService_1.SquareService.getTicketVariationIDsByDate(payload.sessionDate);
                const ticketTypes = [
                    { catalogObjectId: ticketTypeIDs[0], quantity: adultTickets },
                    { catalogObjectId: ticketTypeIDs[1], quantity: kidTickets },
                    { catalogObjectId: ticketTypeIDs[2], quantity: adultTickets + kidTickets }
                ];
                for (let i = 0; i < ticketTypes.length; i++) {
                    const ticketType = ticketTypes[i];
                    const { data: inventoryCountResponse } = yield SquareService_1.SquareService.getCalendarDateSessionInventoryCountByCatalogObject(ticketType.catalogObjectId);
                    const quantity = +inventoryCountResponse.counts[0].quantity;
                    if (quantity < ticketType.quantity) {
                        return ResponseService_1.ResponseBuilder(null, 'Ticket amount not available', true);
                    }
                }
                let skaterWaiverRecord = null;
                if (userId) {
                    logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Passed userId ${userId}.`);
                    const [[_skaterWaiverRecord]] = yield global.db.query('SELECT * FROM userSkaterWaiver WHERE userId = :userId', {
                        userId: userId
                    });
                    skaterWaiverRecord = _skaterWaiverRecord;
                }
                if (!skaterWaiverRecord && payload.skaterWaiver) {
                    this.storeSkaterWaiver(Object.assign(Object.assign({}, payload.skaterWaiver), { userId: userId || null })).catch(err => {
                        return ResponseService_1.ResponseBuilder(null, 'Could not store waiver', true);
                    });
                }
                logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Updating ticket count.`);
                try {
                    yield SquareService_1.SquareService.updateTicketCounts(ticketTypes, 'remove');
                }
                catch (err) {
                    return ResponseService_1.ResponseBuilder(null, 'Could not update inventory', true);
                }
                let paymentResponse = null;
                if (payload.total) {
                    logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Total found: ${payload.total}.`);
                    try {
                        paymentResponse = yield SquareService_1.SquareService.processPayment({
                            amount: payload.amount,
                            locationId: payload.locationId,
                            sourceId: payload.sourceId
                        });
                    }
                    catch (e) {
                        yield SquareService_1.SquareService.updateTicketCounts(ticketTypes, 'add');
                        return ResponseService_1.ResponseBuilder(e.message, 'Payment could not be processed', true);
                    }
                }
                const passes = [];
                if (payload.selectedUserPass) {
                    passes.push(payload.selectedUserPass);
                }
                if (payload.selectedUserPasses) {
                    passes.push(...payload.selectedUserPasses);
                }
                const [newTicketRecord] = yield global.db.query(`
        INSERT INTO userTicket (
          userId,
          passId,
          transactionId,
          itemId,
          firstName,
          lastName,
          email,
          phone,
          confirmationNumber,
          adultTickets,
          childTickets,
          dateEntered
        ) VALUES (
          :userId,
          :passId,
          :transactionId,
          :itemId,
          :firstName,
          :lastName,
          :email,
          :phone,
          :confirmationNumber,
          :adultTickets,
          :childTickets,
          NOW()
        )
      `, {
                    userId: userId || null,
                    passId: passes.length ? passes[0].id : null,
                    transactionId: paymentResponse ? paymentResponse.data.payment.orderId || paymentResponse.data.payment.id : null,
                    itemId: payload.sessionId,
                    firstName: payload.firstName || null,
                    lastName: payload.lastName || null,
                    email: payload.email || null,
                    phone: payload.phone || null,
                    confirmationNumber: confirmationNumber,
                    adultTickets: payload.adultTicketCount,
                    childTickets: payload.childTicketCount
                });
                if (passes.length) {
                    logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Inserting user pass usage.`);
                    for (let i = 0; i < passes.length; i++) {
                        const pass = passes[i];
                        yield global.db.query(`
            INSERT INTO userPassUsage (
              userPassId,
              transactionId,
              dateUsed,
              userTicketId
            ) VALUES (
              :userPassId,
              :transactionId,
              NOW(),
              :userTicketId
            )
          `, {
                            userPassId: pass.id,
                            transactionId: paymentResponse ? paymentResponse.data.payment.orderId || paymentResponse.data.payment.id : null,
                            userTicketId: newTicketRecord ? newTicketRecord.insertId : null
                        });
                    }
                }
                if (ticketTypes[2].quantity >= 15) {
                    const emailPayload = {
                        firstName: payload.firstName || '',
                        lastName: payload.lastName || '',
                        confirmationNumber,
                        sessionDate: payload.sessionDate,
                        adultTicketCount: payload.adultTicketCount,
                        childTicketCount: payload.childTicketCount,
                        total: payload.total.toFixed(2),
                        phone: payload.phone,
                        email: payload.email
                    };
                    yield EmailService_1.EmailService.sendFifteenOrMoreTicketsBoughtEmail(emailPayload).catch(err => {
                        logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Could not send email to admin.`);
                    });
                }
                const beforeWaiverDisclaimer = ticketTypes[2].quantity >= 15 ?
                    `<hr>\n\n<p>Because we don't know the names of your guests, please arrive early and check-in at the Ticket Booth to help us get your guests checked-in.  Please also have your guests complete their waiver in advance to help things move more quickly at check-in.</p>\n\n<hr>` :
                    `<hr>`;
                yield EmailService_1.EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Your Booking Information', `
        <h3>Thanks for booking a session with Modesto On Ice!</h3>

        <p>Below is your booking information.</p>

        <p>Confirmation code: <b>${confirmationNumber}</b></p>

        <p>Session date: <b>${payload.sessionDate}</b></p>
    
        <p>Adult Tickets: ${payload.adultTicketCount}</p>
        <p>Child Tickets: ${payload.childTicketCount}</p>
  
        <p>Total: <b>$${payload.total.toFixed(2)}</b></p>

        ${beforeWaiverDisclaimer}

        <p>**** Skater Waiver ****</p>
        <p>All skaters are required to have a Waiver.  If additional waivers are needed under your Confirmation Number, please share the following link and your Confirmation number to everyone in your group for a smoother check-in when you arrive at the ice rink.  </p>

        <p>
          <a href="${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=session">Click here</a> or copy and paste this in your browser:
        </p>

        <p>${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=session</p>

        <hr>

        <p>Use the barcode below to check-in at the ticket booth!</p>

        <img alt="Your barcode" src="https://www.webarcode.com/barcode/image.php?code=${confirmationNumber}&type=C128A&xres=1&height=100&width=200&font=3&output=png&style=197">
        
        <hr>

        <p class="attrition">Barcodes generated by <a href="https://www.webarcode.com">www.webarcode.com</a>.</p>
      `).catch(err => {
                    logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Could not email customer.`);
                });
                if (payload.couponCodes && payload.couponCodes.length) {
                    for (let i = 0; i < payload.couponCodes.length; i++) {
                        if (payload.couponCodes[i].toUpperCase() === 'GROUP') {
                            continue;
                        }
                        yield global.db.query(`UPDATE coupon SET usedFlag = 1 WHERE code = :code`, {
                            code: payload.couponCodes[i]
                        });
                        logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `newTicketRecord.insertId: ${newTicketRecord.insertId}`);
                        yield global.db.query(`
            INSERT INTO userTicketCoupon (
              userTicketId,
              couponCode,
              dateEntered
            ) VALUES (
              :userTicketId,
              :couponCode,
              NOW()
            )
          `, {
                            userTicketId: newTicketRecord.insertId,
                            couponCode: payload.couponCodes[i]
                        });
                    }
                }
                return Object.assign(Object.assign({}, paymentResponse), { data: {
                        confirmationNumber: confirmationNumber
                    } });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(e.message, 'An error ocurred with your transaction. Please contact us before making another transaction.', true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static addUserPass(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logging_1.generateLogs('NodeApi', 'UserService', 'addUserPass', `Subscribing user to Mailchimp.`);
                const name = `${payload.firstName} ${payload.lastName}`;
                yield MailchimpService_1.MailchimpService.addEmailToSpecialOffersList(payload.email, name).catch(err => {
                    logging_1.generateLogs('NodeApi', 'UserService', 'addUserPass', `Could not add user to Mailchimp.`);
                });
                const confirmationNumber = UtilService_1.UtilService.generateRandomString(12).toUpperCase();
                const [[userRecord]] = yield global.db.query('SELECT id FROM user WHERE email = :email', {
                    email: payload.email
                });
                let userId = null;
                if (!payload.userId) {
                    logging_1.generateLogs('NodeApi', 'UserService', 'addUserPass', '`userId` not passed; creating account.');
                    if (userRecord && userRecord.id) {
                        return ResponseService_1.ResponseBuilder(null, 'Email already in use.', true);
                    }
                    let hashedPassword = '';
                    while (hashedPassword.length < 10) {
                        hashedPassword = scrypt.kdfSync(payload.password, { N: 15, r: 9, p: 2 });
                    }
                    const [insert] = yield global.db.query(`INSERT INTO user (
          accountType,
          email,
          password,
          name,
          phone,
          signupDate,
          lastLoginDate,
          role,
          status
        ) VALUES (
          1,
          :email,
          :password,
          :name,
          :phone,
          NOW(),
          NOW(),
          1,
          1
        )`, {
                        name: payload.firstName + ' ' + payload.lastName || null,
                        phone: payload.phone,
                        email: payload.email,
                        password: hashedPassword
                    });
                    userId = insert.insertId;
                }
                else {
                    logging_1.generateLogs('NodeApi', 'UserService', 'addUserPass', '`userId` is defined; not creating account.');
                    userId = payload.userId;
                }
                const [[skaterWaiverRecord]] = yield global.db.query('SELECT * FROM userSkaterWaiver WHERE userId = :userId', {
                    userId: userId
                });
                if (!skaterWaiverRecord && payload.skaterWaiver) {
                    yield this.storeSkaterWaiver(Object.assign(Object.assign({}, payload.skaterWaiver), { userId: userId }));
                }
                const paymentResponse = yield SquareService_1.SquareService.processPayment({
                    amount: payload.amount,
                    locationId: payload.locationId,
                    sourceId: payload.sourceId
                });
                yield global.db.query(`
        INSERT INTO userPass (
          userId,
          passType,
          confirmationCode,
          transactionId,
          dateEntered
        ) VALUES (
          :userId,
          :passType,
          :confirmationCode,
          :transactionId,
          NOW()
        )
      `, {
                    userId: userId,
                    passType: payload.passInfo.type,
                    confirmationCode: confirmationNumber,
                    transactionId: paymentResponse.data.payment.orderId || paymentResponse.data.payment.id
                });
                yield EmailService_1.EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, `Modesto On Ice | Your ${payload.passInfo.name} Information`, `
        <h3>Thanks for purchasing a pass with Modesto On Ice!</h3>

        <p>Below is your pass information.</p>

        <p>Confirmation code: <b>${confirmationNumber}<b/></p>
    
        <p>Total: <b>$${payload.total}</b></p>

        <hr>

        <p>**** Skater Waiver ****</p>
        <p>All skaters are required to have a Waiver.  If additional waivers are needed under your Confirmation Number, please share the following link and your Confirmation number to everyone in your group for a smoother check-in when you arrive at the ice rink.  </p>

        <p>
          <a href="${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=birthdayBooking">Click here</a> or copy and paste this in your browser:
        </p>

        <p>${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=birthdayBooking</p>

        <hr>

        <p>Use the barcode below to check-in at the ticket booth!</p>

        <img alt="Your barcode" src="https://www.webarcode.com/barcode/image.php?code=${confirmationNumber}&type=C128A&xres=1&height=100&width=200&font=3&output=png&style=197">
        
        <hr>

        <p class="attrition">Barcodes generated by <a href="https://www.webarcode.com">www.webarcode.com</a>.</p>
      `);
                return Object.assign(Object.assign({}, paymentResponse), { data: Object.assign(Object.assign({}, paymentResponse.data), { confirmationNumber: confirmationNumber }) });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(e.message, "An error has occurred", true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getUserSessions(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [sessions] = yield global.db.query('SELECT * FROM userTicket WHERE userId = :userId', {
                    userId: userId
                });
                yield Promise.all(sessions.map((session) => __awaiter(this, void 0, void 0, function* () {
                    const { data: squareData } = yield SquareService_1.SquareService.getItemById(session.itemId);
                    session.squareData = squareData;
                })));
                return ResponseService_1.ResponseBuilder(sessions, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getSkaterWaiverSignature(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (userId) {
                    const [[skaterWaiver]] = yield global.db.query('SELECT * FROM userSkaterWaiver WHERE userId = :userId', {
                        userId: userId
                    });
                    if (skaterWaiver) {
                        const [skaterWaiverMinorSignatures] = yield global.db.query('SELECT * FROM userSkaterWaiverMinor WHERE userSkaterWaiverId = :userSkaterWaiverId', {
                            userSkaterWaiverId: skaterWaiver.id
                        });
                        return ResponseService_1.ResponseBuilder({
                            skaterWaiver: skaterWaiver,
                            skaterWaiverMinorSignatures: skaterWaiverMinorSignatures
                        }, null, false);
                    }
                    else {
                        return ResponseService_1.ResponseBuilder(null, null, false);
                    }
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
    static storeSkaterWaiver(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logging_1.generateLogs('NodeApi', 'BirthdayService', 'bookBirthday', `Subscribing user to Mailchimp.`);
                const name = `${payload.nameOfParticipant}`;
                yield MailchimpService_1.MailchimpService.addEmailToSpecialOffersList(payload.emailAddress, name).catch(err => {
                    console.warn(err);
                });
                const waiverReferenceNumber = UtilService_1.UtilService.generateRandomString(12, {
                    numbers: true
                }).toUpperCase();
                const [insert] = yield global.db.query(`INSERT INTO userSkaterWaiver (
        userId,
        confirmationNumber,
        nameOfParticipant,
        dateOfBirth,
        phoneNumber,
        mailingAddressCity,
        mailingAddressZip,
        emailAddress,
        referral,
        signatureName,
        signatureDate,
        emergencyPhoneNumber,
        parentGuardianSignature,
        dateEntered,
        waiverReferenceNumber
      ) VALUES (
        :userId,
        :confirmationNumber,
        :nameOfParticipant,
        :dateOfBirth,
        :phoneNumber,
        :mailingAddressCity,
        :mailingAddressZip,
        :emailAddress,
        :referral,
        :signatureName,
        :signatureDate,
        :emergencyPhoneNumber,
        :parentGuardianSignature,
        NOW(),
        :waiverReferenceNumber
      )`, {
                    userId: payload.userId || null,
                    confirmationNumber: payload.confirmationNumber || null,
                    nameOfParticipant: payload.nameOfParticipant || null,
                    dateOfBirth: moment(payload.dateOfBirth).isValid()
                        ? moment(payload.dateOfBirth).format(constants_1.MOMENT_STORING_DATE)
                        : null,
                    phoneNumber: payload.phoneNumber || null,
                    mailingAddressCity: payload.mailingAddressCity || null,
                    mailingAddressZip: payload.mailingAddressZip || null,
                    emailAddress: payload.emailAddress || null,
                    referral: payload.referral || null,
                    signatureName: payload.signatureName || null,
                    signatureDate: moment(payload.signatureDate).isValid()
                        ? moment(payload.signatureDate).format(constants_1.MOMENT_STORING_DATE)
                        : null,
                    emergencyPhoneNumber: payload.emergencyPhoneNumber || null,
                    parentGuardianSignature: payload.parentGuardianSignature || null,
                    waiverReferenceNumber: waiverReferenceNumber
                });
                if (payload.minorSignatures) {
                    yield Promise.all(payload.minorSignatures.map((signature) => __awaiter(this, void 0, void 0, function* () {
                        yield global.db.query(`INSERT INTO userSkaterWaiverMinor (
              userSkaterWaiverId,
              firstName,
              lastName,
              dateOfBirth,
              dateEntered
            ) VALUES (
              :userSkaterWaiverId,
              :firstName,
              :lastName,
              :dateOfBirth,
              NOW()
            )`, {
                            userSkaterWaiverId: insert.insertId,
                            firstName: signature.firstName,
                            lastName: signature.lastName,
                            dateOfBirth: moment(signature.dateOfBirth).isValid()
                                ? moment(signature.dateOfBirth).format(constants_1.MOMENT_STORING_DATE)
                                : null
                        });
                    })));
                }
                yield EmailService_1.EmailService.sendEmail(payload.emailAddress, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice Waiver', `
          <p>Thank you for completing your waiver in advance.  This waiver is valid for the entire 2022-2023 season.</p>
          
          <p>When you check in at the Modesto On Ice Ticket Booth, please present this email with your barcode so we can quickly verify your waiver is on file.</p>
          
          <p>We look forward to having you join us at Modesto On Ice and hope you have a fabulous time making lots of wonderful memories.  Happy Skating!</p>

          <img alt="Your barcode" src="https://www.webarcode.com/barcode/image.php?code=${waiverReferenceNumber}&type=C128A&xres=1&height=100&width=200&font=3&output=png&style=197">

          <p class="attrition">Barcodes generated by <a href="https://www.webarcode.com">www.webarcode.com</a>.</p>
        `);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getUserPassUsage(passId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [records] = yield global.db.query('SELECT * FROM userPassUsage WHERE userPassId = :passId', {
                passId
            });
            return records.length;
        });
    }
    static checkPassForDayUse(passId, sessionId, _sessionDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionDate = moment(_sessionDate).format('YYYY-MM-DD');
            const { data: sessions } = yield CalendarService_1.CalendarService.getSessionsByCalendarDate(sessionDate);
            if (sessions) {
                const dateSessionIds = sessions.map(session => session.id);
                let passesUsedForDay = false;
                yield Promise.all(dateSessionIds.map((sessionItemId) => __awaiter(this, void 0, void 0, function* () {
                    const [passes] = yield global.db.query('SELECT * FROM userTicket WHERE passId = :passId AND itemId = :itemId', {
                        passId: passId,
                        itemId: sessionItemId
                    });
                    const [passUsages] = yield global.db.query(`
            SELECT * FROM userPassUsage p
            INNER JOIN userTicket t
              ON t.id = p.userTicketId 
            WHERE p.userPassId = :passId AND t.itemId = :itemId`, {
                        passId: passId,
                        itemId: sessionItemId
                    });
                    if (passes.length || passUsages.length) {
                        passesUsedForDay = true;
                    }
                })));
                return passesUsedForDay;
            }
            else {
                return false;
            }
        });
    }
    static getUserPass(userId, _opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const opts = {
                    sessionId: _opts.sessionId || null,
                    sessionDate: _opts.sessionDate || null
                };
                const [passes] = yield global.db.query('SELECT * FROM userPass WHERE userId = :userId', {
                    userId: userId
                });
                const filteredPasses = [];
                yield Promise.all(passes.map((pass) => __awaiter(this, void 0, void 0, function* () {
                    pass.name = this.getUserPassName(pass.passType);
                    if (pass.passType === 'childSeasonPass' || pass.passType === 'adultSeasonPass') {
                        if (opts.sessionId && opts.sessionDate) {
                            pass.usedForSessionDay = yield this.checkPassForDayUse(pass.id, opts.sessionId, opts.sessionDate);
                        }
                    }
                    if (pass.passType === 'childTenPack' || pass.passType === 'adultTenPack') {
                        pass.remaining = 10 - (yield this.getUserPassUsage(pass.id));
                        if (pass.remaining > 0) {
                            filteredPasses.push(pass);
                        }
                    }
                    else {
                        filteredPasses.push(pass);
                    }
                })));
                return ResponseService_1.ResponseBuilder(filteredPasses, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getUserPassName(passType) {
        switch (passType) {
            case 'adultSeasonPass':
                return 'Adult Season Pass';
            case 'childSeasonPass':
                return 'Child Season Pass';
            case 'adultTenPack':
                return 'Adult 10-Pack';
            case 'childTenPack':
                return 'Child 10-Pack';
        }
    }
    static editSkaterWaiver(id, waiver) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { nameOfParticipant, dateOfBirth, phoneNumber, mailingAddressCity, mailingAddressZip, emailAddress, referral, signatureName, signatureDate, emergencyPhoneNumber, minorSignatures } = waiver;
                yield global.db.query(`
        UPDATE userSkaterWaiver
        SET
        nameOfParticipant = :nameOfParticipant,
        dateOfBirth = :dateOfBirth,
        phoneNumber = :phoneNumber,
        mailingAddressCity = :mailingAddressCity,
        mailingAddressZip = :mailingAddressZip,
        emailAddress = :emailAddress,
        referral = :referral,
        signatureName = :signatureName,
        signatureDate = :signatureDate,
        emergencyPhoneNumber = :emergencyPhoneNumber,
        lastUpdatedDate = NOW()
        WHERE id = :id
      `, {
                    nameOfParticipant,
                    dateOfBirth,
                    phoneNumber,
                    mailingAddressCity,
                    mailingAddressZip,
                    emailAddress,
                    referral,
                    signatureName,
                    signatureDate,
                    emergencyPhoneNumber,
                    id
                });
                yield global.db.query('DELETE FROM userSkaterWaiverMinor WHERE userSkaterWaiverId = :id', { id });
                if (minorSignatures.length) {
                    minorSignatures.forEach((minor) => __awaiter(this, void 0, void 0, function* () {
                        yield global.db.query(`
            INSERT INTO
            userSkaterWaiverMinor (
              userSkaterWaiverId,
              firstName,
              lastName,
              dateOfBirth,
              dateEntered
            ) VALUES (
              :userSkaterWaiverId,
              :firstName,
              :lastName,
              :dateOfBirth,
              NOW()
            )
          `, {
                            userSkaterWaiverId: minor.userSkaterWaiverId,
                            firstName: minor.firstName,
                            lastName: minor.lastName,
                            dateOfBirth: minor.dateOfBirth
                        });
                    }));
                }
                return ResponseService_1.ResponseBuilder(null, 'Skater waiver edited', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(err, 'Could not edit skater waiver', true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getUserPassByConfirmationNumber(confirmationNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[record]] = yield global.db.query(`
        SELECT 
          u.id AS userId,
          usw.id AS skaterWaiverId,
          up.id,
          up.transactionId,
          up.confirmationCode AS confirmationNumber,
          up.passType,
          u.email,
          u.name,
          u.phone
          /* CASE WHEN usw.id IS NULL 
            THEN "No Skater Waiver signed." 
            ELSE "Skater Waiver signed"
          END AS userSkaterWaiverText, */
        FROM userPass up
        LEFT JOIN user u
        ON up.userId = u.id
        LEFT JOIN userSkaterWaiver usw
        ON up.userId = usw.userId
        WHERE up.confirmationCode = :confirmationNumber
      `, {
                    confirmationNumber
                });
                if (record) {
                    record.passType = this.getUserPassName(record.passType);
                    const [[skaterWaiver]] = yield global.db.query(`
          SELECT * 
          FROM userSkaterWaiver
          WHERE confirmationNumber = :confirmationNumber
          OR userId = :userId
        `, {
                        userId: record.userId,
                        confirmationNumber
                    });
                    if (!skaterWaiver) {
                        record.skaterWaiverSigned = false;
                        record.userSkaterWaiverText = `Requires Skater Waiver)`;
                    }
                    else {
                        record.skaterWaiverSigned = true;
                        record.userSkaterWaiverText = 'Skater Waiver signed';
                    }
                    record.remaining = 10 - (yield this.getUserPassUsage(record.id));
                    return ResponseService_1.ResponseBuilder(record, null, false);
                }
                else {
                    return ResponseService_1.ResponseBuilder(null, 'Not found', true);
                }
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getUserSessionByConfirmationNumber(confirmationNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[record]] = yield global.db.query(`
        SELECT 
          u.id AS userId,
          ut.id AS userTicketId, 
          usw.id AS skaterWaiverId,
          ut.transactionId,
          ut.itemId,
          ut.confirmationNumber,
          ut.adultTickets,
          ut.childTickets,
          ut.passType,
          CASE WHEN u.email IS NULL
          THEN ut.email
          ELSE u.email
          END AS email,
          
          CASE WHEN u.name IS NULL
          THEN CONCAT(ut.firstName, ' ', ut.lastName)
          ELSE u.name
          END AS name,
          
          CASE WHEN u.phone IS NULL
          THEN ut.phone
          ELSE u.phone
          END AS phone,
          /* CASE WHEN usw.id IS NULL 
            THEN "No Skater Waiver signed." 
            ELSE "Skater Waiver signed"
          END AS userSkaterWaiverText, */
          ut.dateEntered
        FROM userTicket ut
        LEFT JOIN user u
        ON ut.userId = u.id
        LEFT JOIN userSkaterWaiver usw
        ON ut.userId = usw.userId
        WHERE ut.confirmationNumber = :confirmationNumber
      `, {
                    confirmationNumber
                });
                if (record) {
                    let [[{ count: skaterWaiverCount }]] = yield global.db.query('SELECT COUNT(*) AS count FROM userSkaterWaiver WHERE confirmationNumber = :confirmationNumber', {
                        confirmationNumber
                    });
                    if (record.userId) {
                        skaterWaiverCount += 1;
                    }
                    if (record.adultTickets !== skaterWaiverCount) {
                        record.skaterWaiverSigned = false;
                        record.userSkaterWaiverText = `Requires ${record.adultTickets - skaterWaiverCount} Skater Waiver(s)`;
                    }
                    else {
                        record.skaterWaiverSigned = true;
                        record.userSkaterWaiverText = 'Skater Waiver(s) signed';
                    }
                    const { data: squareItem } = yield SquareService_1.SquareService.getItemById(record.itemId);
                    record.session = squareItem && squareItem.itemData ? squareItem.itemData.name : 'Not found (valid)';
                    return ResponseService_1.ResponseBuilder(record, null, false);
                }
                else {
                    return ResponseService_1.ResponseBuilder(null, 'Not found', true);
                }
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    insertMinorSignature(signature) {
        return __awaiter(this, void 0, void 0, function* () {
            yield global.db.query(`
      INSERT INTO
      userSkaterWaiverMinor (
        userSkaterWaiverId,
        firstName,
        lastName,
        dateOfBirth,
        dateEntered
      ) VALUES (
        :userSkaterWaiverId,
        :firstName,
        :lastName,
        :dateOfBirth,
        NOW()
      )
    `, {
                userSkaterWaiverId: signature.userSkaterWaiverId,
                firstName: signature.firstName,
                lastName: signature.lastName,
                dateOfBirth: signature.dateOfBirth
            });
        });
    }
    static addSkaterWaiverForBirthdays(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.storeSkaterWaiver(payload);
                return ResponseService_1.ResponseBuilder(null, 'Your skater waiver has been submitted', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static addDomoBooking(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data: sessions } = yield SquareService_1.SquareService.findCalendarDateSessionByDate(payload.selectedDate);
                for (let i = 0; i < sessions.length; i++) {
                    const sessionAdultTicketId = sessions[i].itemData.variations[0].id;
                    const sessionChildTicketId = sessions[i].itemData.variations[1].id;
                    const sessionMasterTicketId = sessions[i].itemData.variations[2].id;
                    logging_1.generateLogs('NodeApi', 'UserService', 'addDomoBooking', `Updating inventory for ${sessionAdultTicketId} and ${sessionMasterTicketId}`);
                    yield SquareService_1.SquareService.updateTicketCounts([
                        {
                            catalogObjectId: sessionAdultTicketId,
                            quantity: 1
                        },
                        {
                            catalogObjectId: sessionChildTicketId,
                            quantity: 0
                        },
                        {
                            catalogObjectId: sessionMasterTicketId,
                            quantity: 1
                        }
                    ], 'remove');
                }
                return ResponseService_1.ResponseBuilder(null, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static checkCouponCodeValidity(couponCodes, sessionDate = moment()) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < couponCodes.length; i++) {
                const couponCode = couponCodes[i];
                const [[couponRecord]] = yield global.db.query('SELECT * FROM coupon WHERE code = :code AND deletedFlag = 0', {
                    code: couponCode
                });
                if (!couponRecord || !couponRecord.id) {
                    return ResponseService_1.ResponseBuilder(null, 'Coupon not found', true);
                }
                if (couponRecord.usedFlag) {
                    return ResponseService_1.ResponseBuilder(null, 'Coupon already redeemed', true);
                }
                if (couponRecord.startDate && moment(couponRecord.startDate).isAfter(sessionDate)) {
                    return ResponseService_1.ResponseBuilder(null, 'Coupon is not yet valid (start date)', true);
                }
                if (couponRecord.startTime && moment(couponRecord.startTime, 'hh:mm:ss').isAfter(sessionDate)) {
                    return ResponseService_1.ResponseBuilder(null, 'Coupon is not yet valid (start time)', true);
                }
                if (couponRecord.endDate && moment(couponRecord.endDate).isBefore(sessionDate, 'day')) {
                    return ResponseService_1.ResponseBuilder(null, 'Coupon is expired (end date)', true);
                }
                if (couponRecord.endTime && moment(couponRecord.endTime, 'hh:mm:ss').isBefore(sessionDate)) {
                    return ResponseService_1.ResponseBuilder(null, 'Coupon is expired (end time)', true);
                }
                switch (sessionDate.day()) {
                    case 0:
                        if (!couponRecord.redeemableSunday) {
                            return ResponseService_1.ResponseBuilder(null, 'Coupon not redeemable on Sunday', true);
                        }
                        break;
                    case 1:
                        if (!couponRecord.redeemableMonday) {
                            return ResponseService_1.ResponseBuilder(null, 'Coupon not redeemable on Monday', true);
                        }
                        break;
                    case 2:
                        if (!couponRecord.redeemableTuesday) {
                            return ResponseService_1.ResponseBuilder(null, 'Coupon not redeemable on Tuesday', true);
                        }
                        break;
                    case 3:
                        if (!couponRecord.redeemableWednesday) {
                            return ResponseService_1.ResponseBuilder(null, 'Coupon not redeemable on Wednesday', true);
                        }
                        break;
                    case 4:
                        if (!couponRecord.redeemableThursday) {
                            return ResponseService_1.ResponseBuilder(null, 'Coupon not redeemable on Thursday', true);
                        }
                        break;
                    case 5:
                        if (!couponRecord.redeemableFriday) {
                            return ResponseService_1.ResponseBuilder(null, 'Coupon not redeemable on Friday', true);
                        }
                        break;
                    case 6:
                        if (!couponRecord.redeemableSaturday) {
                            return ResponseService_1.ResponseBuilder(null, 'Coupon not redeemable on Saturday', true);
                        }
                        break;
                }
            }
            return ResponseService_1.ResponseBuilder(null, null, false);
        });
    }
}
exports.UserService = UserService;
