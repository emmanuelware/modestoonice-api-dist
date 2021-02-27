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
const BirthdayService_1 = require("./BirthdayService");
const EmailService_1 = require("./EmailService");
const MailchimpService_1 = require("./MailchimpService");
const ResponseService_1 = require("./ResponseService");
const SquareService_1 = require("./SquareService");
const UserService_1 = require("./UserService");
const UtilService_1 = require("./UtilService");
const constants_1 = require("../common/constants");
const email_constants_1 = require("../common/email.constants");
const moment = require("moment");
const scrypt = require("scrypt");
class SystemService {
    static updateMasterTicketInventory(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (payload.ticketCount <= 0) {
                    return ResponseService_1.ResponseBuilder(null, 'Ticket count value must be positive', true);
                }
                if (!payload.ticketCount) {
                    return ResponseService_1.ResponseBuilder(null, 'Ticket amount must be given', true);
                }
                if (!payload.adjustmentType.includes('add') && !payload.adjustmentType.includes('remove')) {
                    return ResponseService_1.ResponseBuilder(null, 'Adjustment type must be given', true);
                }
                const masterTicketAmountToChange = payload.ticketCount;
                const ticketTypeIDs = yield SquareService_1.SquareService.getTicketVariationIDsByDate(payload.sessionDate);
                const ticketTypes = [
                    { catalog_object_id: ticketTypeIDs[0], quantity: 0 },
                    { catalog_object_id: ticketTypeIDs[1], quantity: 0 },
                    { catalog_object_id: ticketTypeIDs[2], quantity: masterTicketAmountToChange }
                ];
                const masterTicketAdjustment = ticketTypes[2];
                const { data: inventoryCountResponse } = yield SquareService_1.SquareService.getCalendarDateSessionInventoryCountByCatalogObject(masterTicketAdjustment.catalog_object_id);
                const currentQuantity = +inventoryCountResponse.counts[0].quantity;
                if (payload.adjustmentType === 'remove' && currentQuantity - masterTicketAdjustment.quantity < 0) {
                    return ResponseService_1.ResponseBuilder(null, 'Given amount to remove will result in a negative ticket amount', true);
                }
                yield SquareService_1.SquareService.updateTicketCounts(ticketTypes, payload.adjustmentType).catch(() => {
                    return ResponseService_1.ResponseBuilder(null, 'Could not update inventory', true);
                });
                return ResponseService_1.ResponseBuilder(null, 'Updated ticket counts', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, 'Error occurred updating ticket counts', true, {
                    log: true,
                    error: err
                });
            }
        });
    }
    static getSystemUserList() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [users] = yield global.db.query(`
        SELECT  
          accountType,
          name,
          phone,
          email,
          id,
          lastLoginDate,
          role,
          signupDate,
          status
        FROM user`);
                return ResponseService_1.ResponseBuilder(users, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static searchSystemUsers(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [users] = yield global.db.query(`
        SELECT 
          accountType,
          email,
          name,
          phone,
          id,
          lastLoginDate,
          role,
          signupDate,
          status
        FROM user
        WHERE 
          email LIKE :query
      `, {
                    query: `%${payload.searchTerm}%`
                });
                return ResponseService_1.ResponseBuilder(users, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static getSystemUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[user]] = yield global.db.query(`
        SELECT 
          accountType,
          email,
          name,
          phone,
          id,
          lastLoginDate,
          role,
          signupDate,
          status
        FROM user
        WHERE id = :userId
      `, {
                    userId: userId
                });
                const { data: skaterWaiver } = yield UserService_1.UserService.getSkaterWaiverSignature(userId);
                user.skaterWaiverData = skaterWaiver;
                return ResponseService_1.ResponseBuilder(user, null, false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static editSystemUserSkaterWaiverById(id, waiver) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield UserService_1.UserService.editSkaterWaiver(id, waiver);
        });
    }
    static getSystemSkaterWaivers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [waivers] = yield global.db.query('SELECT * FROM userSkaterWaiver LIMIT 200');
                return ResponseService_1.ResponseBuilder(waivers, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getSystemPasses() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [passes] = yield global.db.query(`
        SELECT 
          p.id AS passId,
          u.email,
          u.name,
          u.phone,
          p.passType,
          u.id AS userId,

          CASE p.passType
            WHEN 'childTenPack' THEN 'Child Ten Pack'
            WHEN 'adultTenPack' THEN 'Adult Ten Pack'
            WHEN 'childSeasonPass' THEN 'Child Season Pass'
            WHEN 'adultSeasonPass' THEN 'Adult Season Pass'
          END AS passTypeText,

          p.confirmationCode,
          p.transactionId,
          p.dateEntered
        FROM userPass p
        LEFT JOIN user u
        ON p.userId = u.id
      `);
                return ResponseService_1.ResponseBuilder(passes, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getSystemSkaterWaiverById(waiverId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[skaterWaiver]] = yield global.db.query('SELECT * FROM userSkaterWaiver WHERE id = :waiverId', {
                    waiverId
                });
                const [skaterWaiverMinorSignatures] = yield global.db.query('SELECT * FROM userSkaterWaiverMinor WHERE userSkaterWaiverId = :waiverId', { waiverId });
                return ResponseService_1.ResponseBuilder({
                    skaterWaiver,
                    skaterWaiverMinorSignatures
                }, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getSystemPassById(passId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[pass]] = yield global.db.query(`
        SELECT 
          p.id AS passId,
          u.email,
          u.name,
          u.phone,
          p.passType,
          u.id AS userId,

          CASE p.passType
            WHEN 'childTenPack' THEN 'Child Ten Pack'
            WHEN 'adultTenPack' THEN 'Adult Ten Pack'
            WHEN 'childSeasonPass' THEN 'Child Season Pass'
            WHEN 'adultSeasonPass' THEN 'Adult Season Pass'
          END AS passTypeText,

          p.confirmationCode,
          p.transactionId,
          p.dateEntered
        FROM userPass p
        LEFT JOIN user u
        ON p.userId = u.id
        WHERE p.id = :passId
      `, {
                    passId
                });
                return ResponseService_1.ResponseBuilder(pass, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static searchSystemSkaterWaivers(query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [waivers] = yield global.db.query(`
        SELECT 
          sw.*,
          swm.firstName AS minorFirstName, 
          swm.lastName AS minorLastName,
          swm.dateOfBirth AS minorDateOfBirth,

        CASE 
          WHEN sw.nameOfParticipant IS NOT NULL THEN 'Parent'
          WHEN sw.nameOfParticipant IS NULL THEN 'Minor'
          ELSE 'Unknown'
        END AS skaterWaiverType,

        CASE 
          WHEN swm.userSkaterWaiverId IS NOT NULL THEN swm.userSkaterWaiverId
          ELSE sw.id
        END AS id

        FROM userSkaterWaiver sw
        
        LEFT JOIN userSkaterWaiverMinor swm
        ON sw.id = swm.userSkaterWaiverId

        WHERE sw.nameOfParticipant LIKE :query
        OR sw.dateOfBirth LIKE :query
        OR sw.phoneNumber LIKE :query
        OR sw.mailingAddressLine1 LIKE :query
        OR sw.mailingAddressLine2 LIKE :query
        OR sw.mailingAddressCity LIKE :query
        OR sw.mailingAddressState LIKE :query
        OR sw.mailingAddressZip LIKE :query
        OR sw.emailAddress LIKE :query
        OR sw.referral LIKE :query
        OR sw.signatureName LIKE :query
        OR sw.signatureDate LIKE :query
        OR sw.parentGuardianSignature LIKE :query
        OR sw.emergencyPhoneNumber LIKE :query
        OR swm.dateOfBirth LIKE :query
        OR swm.firstName LIKE :query
        OR swm.lastName LIKE :query
          `, {
                    query: `%${query}%`
                });
                return ResponseService_1.ResponseBuilder(waivers, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static searchSystemUserPasses(query) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [passes] = yield global.db.query(`
        SELECT 
          p.id AS passId,
          u.email,
          u.name,
          u.phone,
          p.passType,
          u.id AS userId,

          CASE p.passType
            WHEN 'childTenPack' THEN 'Child Ten Pack'
            WHEN 'adultTenPack' THEN 'Adult Ten Pack'
            WHEN 'childSeasonPass' THEN 'Child Season Pass'
            WHEN 'adultSeasonPass' THEN 'Adult Season Pass'
          END AS passTypeText,

          p.confirmationCode,
          p.transactionId,
          p.dateEntered
        FROM userPass p
        LEFT JOIN user u
        ON p.userId = u.id
        WHERE u.email LIKE :query
        OR u.name LIKE :query
        OR u.phone LIKE :query
        OR p.passType LIKE :query
        OR p.confirmationCode LIKE :query
        OR p.transactionId LIKE :query
          `, {
                    query: `%${query}%`
                });
                return ResponseService_1.ResponseBuilder(passes, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getBirthdayBookingStatuses() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [statuses] = yield global.db.query('SELECT * FROM birthdayBookingStatus');
                return ResponseService_1.ResponseBuilder(statuses, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static updateBirthdayStatus(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const CANCELLED = 3;
                yield global.db.query('UPDATE birthdayBooking SET birthdayStatusId = :birthdayStatusId WHERE id = :birthdayBookingId', {
                    birthdayStatusId: payload.birthdayStatusId,
                    birthdayBookingId: payload.birthdayBookingId
                });
                if (payload.birthdayStatusId === CANCELLED) {
                    const [[{ birthdaySessionId }]] = yield global.db.query('SELECT birthdaySessionId FROM birthdayBooking WHERE id = :birthdayBookingId', {
                        birthdayBookingId: payload.birthdayBookingId
                    });
                    yield global.db.query('UPDATE birthdayBooking SET birthdaySessionId = NULL WHERE id = :birthdayBookingId', {
                        birthdayBookingId: payload.birthdayBookingId
                    });
                    yield global.db.query(`
          INSERT INTO auditLog (
            eventname,
            description,
            oldValue,
            newValue,
            dateEntered
          ) VALUES (
            :eventName,
            'Birthday cancelled',
            :oldValue,
            :newValue,
            NOW()
          )`, {
                        eventName: 'NodeApi:SystemService.updateBirthdayStatus',
                        oldValue: birthdaySessionId,
                        newValue: null
                    });
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
    static createSystemUser(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[user]] = yield global.db.query('SELECT email FROM user WHERE email = :email', {
                    email: payload.email
                });
                if (user) {
                    return ResponseService_1.ResponseBuilder(null, 'Email already in use', true);
                }
                let hashedPassword = '';
                while (hashedPassword.length < 10) {
                    hashedPassword = scrypt.kdfSync(payload.password, { N: 15, r: 9, p: 2 });
                }
                const [insert] = yield global.db.query('INSERT INTO user (email, password, lastLoginDate, signupDate, role, status) VALUES (:email, :password, NOW(), NOW(), :role, :status)', {
                    email: payload.email,
                    password: hashedPassword,
                    role: 1,
                    status: 1
                });
                return ResponseService_1.ResponseBuilder({
                    newUserId: insert.insertId
                }, 'User successfully created', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static updateSystemUser(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query(`
        UPDATE user 
        SET name = :name, phone = :phone, role = :role
        WHERE id = :userId
      `, {
                    name: payload.name,
                    phone: payload.phone,
                    role: payload.role,
                    userId: payload.userId
                });
                return ResponseService_1.ResponseBuilder(null, 'Successfully updated user', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getBirthdayBookingById(bookingId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[booking]] = yield global.db.query('SELECT * FROM birthdayBooking WHERE id = :bookingId', {
                    bookingId
                });
                const [pizzas] = yield global.db.query(`SELECT * FROM birthdayBookingPizza WHERE birthdayBookingId = :id`, {
                    id: bookingId
                });
                const [extras] = yield global.db.query(`
        SELECT 
          bba.itemPrice, 
          bba.quantity, 
          ba.id,
          ba.name, 
          ba.price 
        FROM birthdayBookingExtra bba 
        LEFT JOIN birthdayExtra ba 
        ON bba.birthdayExtraId = ba.id 
        WHERE birthdayBookingId = :birthdayBookingId`, {
                    birthdayBookingId: bookingId
                });
                booking.extras = extras;
                booking.pizzas = !pizzas
                    ? '-'
                    : pizzas
                        .map(pizza => {
                        return pizza.pizzaType;
                    })
                        .join(', ');
                return ResponseService_1.ResponseBuilder(booking, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static updateBirthdayBooking(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[{ confirmationNumber }]] = yield global.db.query(`
        SELECT confirmationNumber, birthdaySessionId
        FROM birthdayBooking
        WHERE id = :id
        `, {
                    id: payload.id
                });
                const [[{ datetime }]] = yield global.db.query('SELECT datetime FROM birthdaySession WHERE id = :birthdaySessionId', { birthdaySessionId: payload.birthdaySessionId });
                const [[packageRecord]] = yield global.db.query('SELECT * FROM birthdayPackage WHERE id = :id', {
                    id: payload.birthdayPackageId
                });
                const pizzaText = payload.pizzas.length ? payload.pizzas.join(', ') : 'None';
                let extrasHtml = '';
                if (payload.extras && payload.extras.length) {
                    extrasHtml += '<p>Selected extras: <b>';
                    yield Promise.all(payload.extras.map((_extra, index) => __awaiter(this, void 0, void 0, function* () {
                        const { data: extra } = yield BirthdayService_1.BirthdayService.getBirthdayExtraById(_extra.id);
                        if (index === payload.extras.length - 1) {
                            extrasHtml += `${_extra.quantity}x ${extra.name}`;
                        }
                        else {
                            extrasHtml += `${_extra.quantity}x ${extra.name}, `;
                        }
                    })));
                    extrasHtml += '</b></p>';
                }
                yield global.db.query(`
        UPDATE birthdayBooking
        SET 
          birthdayPackageId = :birthdayPackageId,
          birthdaySessionId = :birthdaySessionId,
          userFirstName = :firstName,
          userLastName = :lastName,
          userPhone = :phone,
          userEmail = :email,
          notes = :notes
        WHERE id = :id
      `, {
                    id: payload.id,
                    birthdayPackageId: payload.birthdayPackageId,
                    birthdaySessionId: payload.birthdaySessionId,
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    phone: payload.phone,
                    email: payload.email,
                    notes: payload.notes
                });
                if (payload.extras) {
                    yield global.db.query('DELETE FROM birthdayBookingExtra WHERE birthdayBookingId = :bookingId', {
                        bookingId: payload.id
                    });
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
              )`, {
                            birthdayBookingId: payload.id,
                            birthdayExtraId: extra.id,
                            itemPrice: extra.price,
                            quantity: extra.quantity
                        });
                    })));
                }
                if (payload.pizzas) {
                    yield global.db.query('DELETE FROM birthdayBookingPizza WHERE birthdayBookingId = :bookingId', {
                        bookingId: payload.id
                    });
                    yield Promise.all(payload.pizzas.map((pizza) => __awaiter(this, void 0, void 0, function* () {
                        yield global.db.query(`
              INSERT INTO birthdayBookingPizza (
                birthdayBookingId,
                pizzaType,
                dateEntered
              ) VALUES (
                :birthdayBookingId,
                :pizzaType,
                NOW()
              )`, {
                            birthdayBookingId: payload.id,
                            pizzaType: pizza
                        });
                    })));
                }
                if (payload.sendConfirmationEmail) {
                    const emailPayload = {
                        confirmationNumber,
                        packageRecord,
                        pizzaText,
                        extrasHtml,
                        datetime,
                        email: payload.email,
                        firstName: payload.firstName,
                        lastName: payload.lastName,
                        phone: payload.phone,
                        notes: payload.notes
                    };
                    const { err } = yield EmailService_1.EmailService.sendBirthdayUpdateEmail(emailPayload);
                    if (err) {
                        throw new Error('Could not send email');
                    }
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
    static getNumberOfPackagePizzas(packageId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[birthdayPackage]] = yield global.db.query('SELECT * FROM birthdayPackage WHERE id = :packageId', {
                    packageId
                });
                return ResponseService_1.ResponseBuilder(birthdayPackage.numberOfPizzas, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static addBirthdayBooking(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const confirmationNumber = UtilService_1.UtilService.generateRandomString(12).toUpperCase();
                const [[sessionDate]] = yield global.db.query('SELECT datetime FROM birthdaySession WHERE id = :birthdaySessionId', {
                    birthdaySessionId: payload.birthdaySessionId
                });
                const [[birthdayPackage]] = yield global.db.query('SELECT skatersIncluded FROM birthdayPackage WHERE id = :packageId', {
                    packageId: payload.selectedPackageId
                });
                const name = `${payload.firstName} ${payload.lastName}`;
                yield MailchimpService_1.MailchimpService.addEmailToSpecialOffersList(payload.email, name).catch(err => {
                    console.warn(err);
                });
                if (process.env.ENV_MODE === 'prod') {
                    const { data: sessions } = yield SquareService_1.SquareService.findCalendarDateSessionByDate(sessionDate.datetime);
                    const [catalogItem] = sessions.filter(session => {
                        if (moment(sessionDate.datetime).format(constants_1.DEFAULT_MOMENT_FORMAT) === session.item_data.name) {
                            return session;
                        }
                    });
                    yield SquareService_1.SquareService.updateMasterTicketCount(catalogItem.item_data.variations[1].id, birthdayPackage.skatersIncluded).catch(err => {
                        return ResponseService_1.ResponseBuilder(null, 'An error ocurred. Error code AdjInv.587', true);
                    });
                }
                const [insert] = yield global.db.query(`
        INSERT INTO birthdayBooking (
          userId,
          birthdayPackageId,
          birthdaySessionId,
          userFirstName,
          userLastName,
          userEmail,
          userPhone,
          confirmationNumber,
          totalPrice,
          notes,
          dateEntered
        ) VALUES (
          :userId,
          :birthdayPackageId,
          :birthdaySessionId,
          :userFirstName,
          :userLastName,
          :userEmail,
          :userPhone,
          :confirmationNumber,
          :totalPrice,
          :notes,
          NOW()
        )
      `, {
                    userId: null,
                    birthdayPackageId: payload.selectedPackageId,
                    birthdaySessionId: payload.birthdaySessionId,
                    userFirstName: payload.firstName,
                    userLastName: payload.lastName,
                    userEmail: payload.email,
                    userPhone: payload.phone,
                    confirmationNumber: confirmationNumber,
                    totalPrice: 0,
                    notes: payload.notes
                });
                if (payload.extras) {
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
                }
                if (payload.pizzas) {
                    yield Promise.all(payload.pizzas.map((pizza) => __awaiter(this, void 0, void 0, function* () {
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
                return ResponseService_1.ResponseBuilder({
                    newBookingId: insert.insertId
                }, 'Created birthday booking', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getTickets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [tickets] = yield global.db.query(`SELECT ut.*, usw.id AS skaterWaiverId
        FROM userTicket ut
        LEFT JOIN userSkaterWaiver usw
          ON ut.userId = usw.userId
        LIMIT 200`);
                yield Promise.all(tickets.map((ticket) => __awaiter(this, void 0, void 0, function* () {
                    const [minors] = yield global.db.query(`SELECT firstName, lastName 
          FROM userSkaterWaiverMinor
          WHERE userSkaterWaiverId = :skaterWaiverId`, {
                        skaterWaiverId: ticket.skaterWaiverId
                    });
                    ticket.minors = minors;
                })));
                return ResponseService_1.ResponseBuilder(tickets, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getDomoTickets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [tickets] = yield global.db.query(`
        SELECT d.*, s.date AS sessionDate
        FROM domoPassBooking d
        LEFT JOIN domoPassSession s
        ON d.sessionId = s.id
      `);
                return ResponseService_1.ResponseBuilder(tickets, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static searchTickets(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [tickets] = yield global.db.query(`
        SELECT *
        FROM userTicket
        WHERE transactionId LIKE :query
        OR itemId LIKE :query
        OR firstName LIKE :query
        OR lastName LIKE :query
        OR email LIKE :query
        OR phone LIKE :query
        OR 
          REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '.', ''), '+', ''), ' ', ''), ')', ''), '(', ''), '-', '') 
          LIKE CAST(CONCAT('%', REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(:query, '.', ''), '+', ''), ' ', ''), ')', ''), '(', ''), '-', ''), '%') AS CHAR)
        OR confirmationNumber LIKE :query
      `, {
                    query: `%${payload.searchTerm}%`
                });
                return ResponseService_1.ResponseBuilder(tickets, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static searchDomoTickets(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [tickets] = yield global.db.query(`
        SELECT *
        FROM domoPassBooking
        WHERE name LIKE :query
        OR email LIKE :query
        OR phone LIKE :query
        OR confirmationNumber LIKE :query
      `, {
                    query: `%${payload.searchTerm}%`
                });
                return ResponseService_1.ResponseBuilder(tickets, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getTicketById(ticketId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[ticket]] = yield global.db.query(`
        SELECT *
        FROM userTicket
        WHERE id = :ticketId
      `, {
                    ticketId
                });
                const { data: session } = yield SquareService_1.SquareService.getItemById(ticket.itemId);
                ticket.session = session
                    ? session
                    : {
                        item_data: {
                            name: 'Not found (valid)'
                        }
                    };
                return ResponseService_1.ResponseBuilder(ticket, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getDomoTicketById(ticketId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[tickets]] = yield global.db.query(`
        SELECT d.*, s.date AS sessionDate
        FROM domoPassBooking d
        LEFT JOIN domoPassSession s
        ON d.sessionId = s.id
        WHERE d.id = :ticketId
      `, {
                    ticketId
                });
                return ResponseService_1.ResponseBuilder(tickets, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getLessons() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [lessons] = yield global.db.query('SELECT * FROM lessonBooking');
                return ResponseService_1.ResponseBuilder(lessons, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getLessonById(lessonBookingId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[lesson]] = yield global.db.query('SELECT * FROM lessonBooking WHERE id = :lessonBookingId', {
                    lessonBookingId
                });
                return ResponseService_1.ResponseBuilder(lesson, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static searchLessons(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [lessons] = yield global.db.query(`
        SELECT *
        FROM lessonBooking
        WHERE lessonPackageId LIKE :query
        OR firstName LIKE :query
        OR lastName LIKE :query
        OR email LIKE :query
        OR phone LIKE :query
        OR confirmationNumber LIKE :query
      `, {
                    query: `%${payload.searchTerm}%`
                });
                return ResponseService_1.ResponseBuilder(lessons, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, null, true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static logPassUsageWithConfirmationNumber(confirmationNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield global.db.query(`
        INSERT INTO userPassUsage (
          userPassId,
          transactionId,
          dateUsed
        ) VALUES (
          (SELECT id FROM userPass WHERE confirmationCode = :confirmationNumber),
          :transactionId,
          NOW()
        )
      `, {
                    confirmationNumber: confirmationNumber,
                    transactionId: 'employee_ticket_booth'
                });
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
    static getDomoPassByConfirmationNumber(confirmationNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[record]] = yield global.db.query('SELECT * FROM domoPassBooking WHERE confirmationNumber = :confirmationNumber', {
                    confirmationNumber
                });
                if (record) {
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
                        record.userSkaterWaiverText = `Requires Skater Waiver`;
                    }
                    else {
                        record.skaterWaiverSigned = true;
                        record.userSkaterWaiverText = 'Skater Waiver signed';
                    }
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
    static getBirthdayBookingByConfirmationNumber(confirmationNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [[record]] = yield global.db.query(`
        SELECT bb.*, bp.skatersIncluded 
        FROM birthdayBooking bb
        LEFT JOIN birthdayPackage bp
        ON bb.birthdayPackageId = bp.id
        WHERE bb.confirmationNumber = :confirmationNumber`, {
                    confirmationNumber
                });
                if (record) {
                    const [[adultSkaterWaivers]] = yield global.db.query(`
          SELECT COUNT(*) AS count
          FROM userSkaterWaiver
          WHERE confirmationNumber = :confirmationNumber
        `, {
                        confirmationNumber
                    });
                    const [[minorSkaterWaivers]] = yield global.db.query(`
          SELECT COUNT(*) AS count
          FROM userSkaterWaiverMinor
          WHERE userSkaterWaiverId IN (SELECT id FROM userSkaterWaiver WHERE confirmationNumber = :confirmationNumber)
        `, {
                        confirmationNumber
                    });
                    const [[addedSkaters]] = yield global.db.query(`
          SELECT COUNT(*) AS count
          FROM birthdayBookingExtra
          WHERE birthdayExtraId = 7 
          AND birthdayBookingId = (SELECT id FROM birthdayBooking WHERE confirmationNumber = :confirmationNumber);
        `, {
                        confirmationNumber
                    });
                    record.totalSkaters = record.skatersIncluded + addedSkaters.count;
                    record.waiversSigned = adultSkaterWaivers.count + minorSkaterWaivers.count;
                    if (record.totalSkaters > record.waiversSigned) {
                        record.skaterWaiverSigned = false;
                        record.userSkaterWaiverText = `Requires Skater Waiver`;
                    }
                    else {
                        record.skaterWaiverSigned = true;
                        record.userSkaterWaiverText = 'Skater Waiver signed';
                    }
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
    static searchBirthdayBookings(searchTerm) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [birthdays] = yield global.db.query(`
        SELECT bb.*, bs.datetime
        FROM birthdayBooking bb
        LEFT JOIN birthdaySession bs
        ON bb.birthdaySessionId = bs.id
        WHERE bb.transactionId LIKE :query
        OR bb.userFirstName LIKE :query
        OR bb.userLastName LIKE :query
        OR bb.userEmail LIKE :query
        OR bb.userPhone LIKE :query
        OR confirmationNumber LIKE :query
        OR bb.notes LIKE :query
      `, {
                    query: `%${searchTerm}%`
                });
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
    static sendSeasonBarcodeReminders() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [birthdayBookings] = yield global.db.query('SELECT * FROM birthdayBooking');
                const [userPasses] = yield global.db.query('SELECT u.email, up.confirmationCode AS confirmationNumber FROM userPass up LEFT JOIN user u on up.userId = u.id');
                const [userTickets] = yield global.db.query('SELECT * FROM userTicket');
                for (let i = 0; i < birthdayBookings.length; i++) {
                    const el = birthdayBookings[i];
                    if (el.email && el.confirmationNumber) {
                        console.log('Sending reminder to', el.email);
                        yield EmailService_1.EmailService.sendSeasonStartReminder(el.email, el.confirmationNumber, 'birthday');
                    }
                }
                for (let i = 0; i < userPasses.length; i++) {
                    const el = userPasses[i];
                    if (el.email && el.confirmationNumber) {
                        console.log('Sending reminder to', el.email);
                        yield EmailService_1.EmailService.sendSeasonStartReminder(el.email, el.confirmationNumber, 'pass');
                    }
                }
                for (let i = 0; i < userTickets.length; i++) {
                    const el = userTickets[i];
                    if (el.email && el.confirmationNumber) {
                        console.log('Sending reminder to', el.email);
                        yield EmailService_1.EmailService.sendSeasonStartReminder(el.email, el.confirmationNumber, 'session');
                    }
                }
                return 'Done.';
            }
            catch (err) {
                throw new Error(err);
            }
        });
    }
    static updateUserTicketSession(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!payload.userTicketId) {
                    return ResponseService_1.ResponseBuilder(null, 'Ticket ID must be provided', true);
                }
                if (!payload.newSessionId) {
                    return ResponseService_1.ResponseBuilder(null, 'New session ID must be provided', true);
                }
                if (!payload.newSessionDate) {
                    return ResponseService_1.ResponseBuilder(null, 'New session date must be provided', true);
                }
                const [[ticketRecord]] = yield global.db.query('SELECT itemId, confirmationNumber, email, adultTickets, childTickets FROM userTicket WHERE id = :id', {
                    id: payload.userTicketId
                });
                if (!ticketRecord.itemId) {
                    return ResponseService_1.ResponseBuilder(null, 'Item ID not found', true);
                }
                try {
                    const { data: oldTicketData } = yield SquareService_1.SquareService.getItemById(ticketRecord.itemId);
                    const adultTickets = ticketRecord.adultTickets;
                    const kidTickets = ticketRecord.childTickets;
                    const ticketTypeIDs = yield SquareService_1.SquareService.getTicketVariationIDsByDate(oldTicketData.item_data.name);
                    const ticketTypes = [
                        { catalog_object_id: ticketTypeIDs[0], quantity: adultTickets },
                        { catalog_object_id: ticketTypeIDs[1], quantity: kidTickets },
                        { catalog_object_id: ticketTypeIDs[2], quantity: adultTickets + kidTickets }
                    ];
                    yield SquareService_1.SquareService.updateTicketCounts(ticketTypes, 'add');
                }
                catch (err) {
                    return ResponseService_1.ResponseBuilder(null, 'Could not update inventory count, pre-update', true, {
                        error: err,
                        log: true
                    });
                }
                yield global.db.query('UPDATE userTicket SET itemId = :newSessionId WHERE id = :userTicketId', {
                    newSessionId: payload.newSessionId,
                    userTicketId: payload.userTicketId
                });
                try {
                    const adultTickets = ticketRecord.adultTickets;
                    const kidTickets = ticketRecord.childTickets;
                    const ticketTypeIDs = yield SquareService_1.SquareService.getTicketVariationIDsByDate(payload.newSessionDate);
                    const ticketTypes = [
                        { catalog_object_id: ticketTypeIDs[0], quantity: adultTickets },
                        { catalog_object_id: ticketTypeIDs[1], quantity: kidTickets },
                        { catalog_object_id: ticketTypeIDs[2], quantity: adultTickets + kidTickets }
                    ];
                    yield SquareService_1.SquareService.updateTicketCounts(ticketTypes, 'remove');
                }
                catch (err) {
                    return ResponseService_1.ResponseBuilder(null, 'Could not update inventory count, post-update', true, {
                        error: err,
                        log: true
                    });
                }
                yield EmailService_1.EmailService.sendEmail(ticketRecord.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Your Booking Has Been Updated', `
        <h3>Thanks for booking a session with Modesto On Ice!</h3>

        <p>Below is your updated booking information.</p>

        <p>Confirmation code: <b>${ticketRecord.confirmationNumber}</b></p>

        <p>New session date: <b>${payload.newSessionDate}</b></p>

        <hr>

        <p><a href="${process.env.DOMAIN}/skater-waiver?cn=${ticketRecord.confirmationNumber}&type=session">Sign your skater waiver</a> before you get to the rink!</p>

        <p>Having trouble viewing the link? Copy and paste this in your browser: ${process.env.DOMAIN}/skater-waiver?cn=${ticketRecord.confirmationNumber}&type=session</p>

        <hr>

        <p>Use the barcode below at the ticket booth!</p>

        <img alt="Your barcode" src="http://www.barcodes4.me/barcode/c128a/${ticketRecord.confirmationNumber}.png?height=400&resolution=4">
        
        <hr>

        <p class="attrition">Barcodes generated by <a href="https://the-refinery.io">Cleveland Web Design company, The Refinery</a>.</p>
      `);
                return ResponseService_1.ResponseBuilder(null, 'Updated ticket session', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, 'Could not update session', true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static getSquareTransactionById(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield SquareService_1.SquareService.getTransactionById(transactionId);
            return data;
        });
    }
    static getBirthdaySessions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [sessions] = yield global.db.query('SELECT * FROM birthdaySession ORDER BY datetime LIMIT 200');
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
    static updateBirthdaySessionAvailability({ sessionId, totalAvailable }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!sessionId) {
                    return ResponseService_1.ResponseBuilder(null, 'Session ID must be provided', true);
                }
                yield global.db.query('UPDATE birthdaySession SET totalAvailable = :totalAvailable WHERE id = :sessionId', {
                    totalAvailable,
                    sessionId
                });
                return ResponseService_1.ResponseBuilder(null, 'Successfully updated availability', false);
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
exports.SystemService = SystemService;
