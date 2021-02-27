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
                    { catalog_object_id: ticketTypeIDs[0], quantity: adultTickets },
                    { catalog_object_id: ticketTypeIDs[1], quantity: kidTickets },
                    { catalog_object_id: ticketTypeIDs[2], quantity: adultTickets + kidTickets }
                ];
                for (let i = 0; i < ticketTypes.length; i++) {
                    const ticketType = ticketTypes[i];
                    const { data: inventoryCountResponse } = yield SquareService_1.SquareService.getCalendarDateSessionInventoryCountByCatalogObject(ticketType.catalog_object_id);
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
                if (!skaterWaiverRecord) {
                    this.storeSkaterWaiver(Object.assign({}, payload.skaterWaiver, { userId: userId || null })).catch(err => {
                        return ResponseService_1.ResponseBuilder(null, 'Could not store waiver', true);
                    });
                }
                let paymentResponse = null;
                if (payload.total) {
                    logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Updating ticket count.`);
                    yield SquareService_1.SquareService.updateTicketCounts(ticketTypes, 'remove').catch(err => {
                        return ResponseService_1.ResponseBuilder(null, 'Could not update inventory', true);
                    });
                    logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Total found: ${payload.total}.`);
                    paymentResponse = yield SquareService_1.SquareService.processPayment({
                        amount: payload.amount,
                        nonce: payload.nonce
                    });
                    if (!paymentResponse ||
                        !paymentResponse.data ||
                        !paymentResponse.data.transaction ||
                        !paymentResponse.data.transaction.id) {
                        try {
                            yield SquareService_1.SquareService.updateTicketCounts(ticketTypes, 'add');
                            if (paymentResponse.data && typeof paymentResponse.data === 'string') {
                                const error = JSON.parse(paymentResponse.data);
                                return ResponseService_1.ResponseBuilder(null, error.errors[0].detail, true);
                            }
                            else {
                                return ResponseService_1.ResponseBuilder(null, 'Payment could not be processed', true);
                            }
                        }
                        catch (err) {
                            return ResponseService_1.ResponseBuilder(null, 'Payment could not be processed', true);
                        }
                    }
                }
                yield global.db.query(`
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
                    passId: payload.selectedUserPass ? payload.selectedUserPass.id : null,
                    transactionId: paymentResponse ? paymentResponse.data.transaction.id : null,
                    itemId: payload.sessionId,
                    firstName: payload.firstName || null,
                    lastName: payload.lastName || null,
                    email: payload.email || null,
                    phone: payload.phone || null,
                    confirmationNumber: confirmationNumber,
                    adultTickets: payload.adultTicketCount,
                    childTickets: payload.childTicketCount
                });
                if (payload.selectedUserPass) {
                    logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Inserting user pass usage.`);
                    yield global.db.query(`
          INSERT INTO userPassUsage (
            userPassId,
            transactionId,
            dateUsed
          ) VALUES (
            :userPassId,
            :transactionId,
            NOW()
          )
        `, {
                        userPassId: payload.selectedUserPass ? payload.selectedUserPass.id : null,
                        transactionId: paymentResponse ? paymentResponse.data.transaction.id : null
                    });
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
                yield EmailService_1.EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Your Booking Information', `
        <h3>Thanks for booking a session with Modesto On Ice!</h3>

        <p>Below is your booking information.</p>

        <p>Confirmation code: <b>${confirmationNumber}</b></p>

        <p>Session date: <b>${payload.sessionDate}</b></p>
    
        <p>Adult Tickets: ${payload.adultTicketCount}</p>
        <p>Child Tickets: ${payload.childTicketCount}</p>
  
        <p>Total: <b>$${payload.total.toFixed(2)}</b></p>

        <hr>

        <p><a href="${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=session">Sign your skater waiver</a> before you get to the rink!</p>

        <p>Having trouble viewing the link? Copy and paste this in your browser: ${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=session</p>

        <hr>

        <p>Use the barcode below at the ticket booth!</p>

        <img alt="Your barcode" src="http://www.barcodes4.me/barcode/c128a/${confirmationNumber}.png?height=400&resolution=4">
        
        <hr>

        <p class="attrition">Barcodes generated by <a href="https://the-refinery.io">Cleveland Web Design company, The Refinery</a>.</p>
      `).catch(err => {
                    logging_1.generateLogs('NodeApi', 'UserService', 'bookSession', `Could not email customer.`);
                });
                return Object.assign({}, paymentResponse, { data: {
                        confirmationNumber: confirmationNumber
                    } });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
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
                if (!skaterWaiverRecord) {
                    yield this.storeSkaterWaiver(Object.assign({}, payload.skaterWaiver, { userId: userId }));
                }
                const paymentResponse = yield SquareService_1.SquareService.processPayment({
                    amount: payload.amount,
                    nonce: payload.nonce
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
                    transactionId: paymentResponse.data.transaction.id
                });
                yield EmailService_1.EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, `Modesto On Ice | Your ${payload.passInfo.name} Information`, `
        <h3>Thanks for purchasing a pass with Modesto On Ice!</h3>

        <p>Below is your pass information.</p>

        <p>Confirmation code: <b>${confirmationNumber}<b/></p>
    
        <p>Total: <b>$${payload.total}</b></p>

        <hr>

        <p><a href="${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=seasonPass">Sign your skater waiver</a> before you get to the rink!</p>

        <p>Having trouble viewing the link? Copy and paste this in your browser: ${process.env.DOMAIN}/skater-waiver?cn=${confirmationNumber}&type=seasonPass</p>

        <hr>

        <p>Use the barcode below at the ticket booth!</p>

        <img alt="Your barcode" src="http://www.barcodes4.me/barcode/c128a/${confirmationNumber}.png?height=400&resolution=4">
        
        <hr>

        <p class="attrition">Barcodes generated by <a href="https://the-refinery.io">Cleveland Web Design company, The Refinery</a>.</p>
      `);
                return Object.assign({}, paymentResponse, { data: Object.assign({}, paymentResponse.data, { confirmationNumber: confirmationNumber }) });
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
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
                const [insert] = yield global.db.query(`INSERT INTO userSkaterWaiver (
        userId,
        confirmationNumber,
        nameOfParticipant,
        dateOfBirth,
        phoneNumber,
        mailingAddressLine1,
        mailingAddressLine2,
        mailingAddressCity,
        mailingAddressState,
        mailingAddressZip,
        emailAddress,
        referral,
        signatureName,
        signatureDate,
        emergencyPhoneNumber,
        parentGuardianSignature,
        dateEntered
      ) VALUES (
        :userId,
        :confirmationNumber,
        :nameOfParticipant,
        :dateOfBirth,
        :phoneNumber,
        :mailingAddressLine1,
        :mailingAddressLine2,
        :mailingAddressCity,
        :mailingAddressState,
        :mailingAddressZip,
        :emailAddress,
        :referral,
        :signatureName,
        :signatureDate,
        :emergencyPhoneNumber,
        :parentGuardianSignature,
        NOW()
      )`, {
                    userId: payload.userId || null,
                    confirmationNumber: payload.confirmationNumber || null,
                    nameOfParticipant: payload.nameOfParticipant || null,
                    dateOfBirth: moment(payload.dateOfBirth).isValid()
                        ? moment(payload.dateOfBirth).format(constants_1.MOMENT_STORING_DATE)
                        : null,
                    phoneNumber: payload.phoneNumber || null,
                    mailingAddressLine1: payload.mailingAddressLine1 || null,
                    mailingAddressLine2: payload.mailingAddressLine2 || null,
                    mailingAddressCity: payload.mailingAddressCity || null,
                    mailingAddressState: payload.mailingAddressState || null,
                    mailingAddressZip: payload.mailingAddressZip || null,
                    emailAddress: payload.emailAddress || null,
                    referral: payload.referral || null,
                    signatureName: payload.signatureName || null,
                    signatureDate: moment(payload.signatureDate).isValid()
                        ? moment(payload.signatureDate).format(constants_1.MOMENT_STORING_DATE)
                        : null,
                    emergencyPhoneNumber: payload.emergencyPhoneNumber || null,
                    parentGuardianSignature: payload.parentGuardianSignature || null
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
                    if (passes.length) {
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
                const { nameOfParticipant, dateOfBirth, phoneNumber, mailingAddressLine1, mailingAddressLine2, mailingAddressCity, mailingAddressState, mailingAddressZip, emailAddress, referral, signatureName, signatureDate, emergencyPhoneNumber, minorSignatures } = waiver;
                yield global.db.query(`
        UPDATE userSkaterWaiver
        SET
        nameOfParticipant = :nameOfParticipant,
        dateOfBirth = :dateOfBirth,
        phoneNumber = :phoneNumber,
        mailingAddressLine1 = :mailingAddressLine1,
        mailingAddressLine2 = :mailingAddressLine2,
        mailingAddressCity = :mailingAddressCity,
        mailingAddressState = :mailingAddressState,
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
                    mailingAddressLine1,
                    mailingAddressLine2,
                    mailingAddressCity,
                    mailingAddressState,
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
                    record.session = squareItem && squareItem.item_data ? squareItem.item_data.name : 'Not found (valid)';
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
                    const sessionAdultTicketId = sessions[i].item_data.variations[0].id;
                    const sessionChildTicketId = sessions[i].item_data.variations[1].id;
                    const sessionMasterTicketId = sessions[i].item_data.variations[2].id;
                    logging_1.generateLogs('NodeApi', 'UserService', 'addDomoBooking', `Updating inventory for ${sessionAdultTicketId} and ${sessionMasterTicketId}`);
                    yield SquareService_1.SquareService.updateTicketCounts([
                        {
                            catalog_object_id: sessionAdultTicketId,
                            quantity: 1
                        },
                        {
                            catalog_object_id: sessionChildTicketId,
                            quantity: 0
                        },
                        {
                            catalog_object_id: sessionMasterTicketId,
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
}
exports.UserService = UserService;
