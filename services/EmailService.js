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
const MailchimpService_1 = require("./MailchimpService");
const ResponseService_1 = require("./ResponseService");
const email_constants_1 = require("../common/email.constants");
const constants_1 = require("../common/constants");
const moment = require("moment");
const sgMail = require("@sendgrid/mail");
class EmailService {
    static sendFifteenOrMoreTicketsBoughtEmail(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                sgMail.setApiKey(process.env.SENDGRID_KEY);
                const subject = 'Modesto On Ice | 15 or More Tickets Have Been Purchased';
                const birthdayText = `
      <p>Package name: <b>${payload.packageName}</b></p>

      <p>Selected pizzas: <b>${payload.pizzaText}</b></p>

      ${payload.extrasHtml}`;
                const extraText = payload.packageName ? birthdayText : '';
                const msg = {
                    to: email_constants_1.DEFAULT_ADMIN_EMAIL,
                    from: email_constants_1.DEFAULT_EMAIL_SENDER,
                    subject: subject,
                    html: `
          <!doctype html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width" />
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
              <title>${subject}</title>
              ${email_constants_1.EMAIL_STYLES}
            </head>
    
            <body>
              <table border="0" cellpadding="0" cellspacing="0" class="body">
                <tr>
                  <td>&nbsp;</td>
                  <td class="container">
                    <div class="content">
                      <span class="preheader">${subject}</span>
                      <table class="main" style="padding: 24px;">
                        <p>On ${moment().format(constants_1.DEFAULT_MOMENT_FORMAT)} there has been 15 or more tickets purchased.</p>

                        <p>Below is ${payload.firstName} ${payload.lastName}'s booking information.</p>
                        
                        <p>Email: ${payload.email}</p>

                        <p>Phone: ${payload.phone}</p>

                        <p>Confirmation code: <b>${payload.confirmationNumber}</b></p>

                        <p>Session date: <b>${payload.sessionDate}</b></p>

                        ${extraText}
                    
                        <p>Adult Tickets: ${payload.adultTicketCount}</p>
                        <p>Child Tickets: ${payload.childTicketCount}</p>
                  
                        <p>Total: <b>$${payload.total}</b></p>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `
                };
                yield sgMail.send(msg);
                return ResponseService_1.ResponseBuilder(null, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, 'Could not send email', true, {
                    log: true,
                    error: err
                });
            }
        });
    }
    static sendEmail(to, from, subject, body, cc) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                sgMail.setApiKey(process.env.SENDGRID_KEY);
                const msg = {
                    to: to,
                    from: from || email_constants_1.DEFAULT_EMAIL_SENDER,
                    subject: subject,
                    html: `
          <!doctype html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width" />
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
              <title>${subject}</title>
              ${email_constants_1.EMAIL_STYLES}
            </head>
    
            <body>
              <table border="0" cellpadding="0" cellspacing="0" class="body">
                <tr>
                  <td>&nbsp;</td>
                  <td class="container">
                    <div class="content">
                      <span class="preheader">${subject}</span>
                      <table class="main" style="padding: 24px;">
                        ${body}
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `
                };
                if (cc) {
                    msg.cc = cc;
                }
                yield sgMail.send(msg);
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
    static sendResetPasswordEmail(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Reset Your Password', `
          <p>Click <a href="${payload.link}">here</a> to reset your Modesto On Ice password.</p>
          <p>If you didn't request to reset your password, you can ignore this message.</p>
        `);
                return ResponseService_1.ResponseBuilder(null, 'Successfully sent', false);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, 'An error occurred', true, {
                    error: e,
                    log: true
                });
            }
        });
    }
    static sendContactUsEmail(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const [contactUsEmails] = yield global.db.query('SELECT * FROM contactUsEmailList');
                yield MailchimpService_1.MailchimpService.addEmailToSpecialOffersList(payload.email, payload.name);
                yield Promise.all(contactUsEmails.map((email) => __awaiter(this, void 0, void 0, function* () {
                    yield this.sendEmail(email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | You Have Mail!', `
              <h3>You have a Contact Us form submission</h3>
              <p style="font-weight: 600;">Name</p>
              <p>${payload.name}</p>

              <p style="font-weight: 600;">Email</p>
              <p>${payload.email}</p>

              <p style="font-weight: 600;">Message</p>
              <p>${payload.message}</p>
            `);
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
    static sendBirthdayUpdateEmail(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Your Birthday Booking Information Has Been Updated', `
        <h3>Thanks for booking your party with Modesto On Ice!</h3>

        <p>Below is your updated birthday booking information</p>

        <p>Confirmation code: <b>${payload.confirmationNumber}</b></p>

        <p>Package name: <b>${payload.packageRecord.name}</b></p>

        <p>Selected pizzas: <b>${payload.pizzaText}</b></p>

        ${payload.extrasHtml}

        <p>Booking date: <b>${moment(payload.datetime).format('MMM D, YYYY') +
                    ' at ' +
                    moment(payload.datetime).format('h:mm a')}</b></p>

        <hr>

        <p>First name: <b>${payload.firstName || '-'}</b></p>

        <p>Last name: <b>${payload.lastName || '-'}</b></p>

        <p>Email: <b>${payload.email || '-'}</b></p>

        <p>Phone: <b>${payload.phone || '-'}</b></p>

        <p>Notes: <b>${payload.notes || '-'}</b></p>

        <hr>

        <p>**** Skater Waiver ****</p>
        <p>All skaters are required to have a Waiver. which becomes valid for the entire season. One waiver per adult, age 18 and older.  Minors must have their Waiver completed by an adult, and multiple minors can be on an Adult's waiver. Maximize your ice time and submit your waiver before you get to the rink!  </p>

        <p>
          <a href="${process.env.DOMAIN}/skater-waiver?cn=${payload.confirmationNumber}&type=session">Click here</a> or copy and paste this in your browser:
        </p>

        <p>${process.env.DOMAIN}/skater-waiver?cn=${payload.confirmationNumber}&type=session</p>

        <hr>

        <p><i>Due to the limited availability, all sales are final. In some cases, based on availability, rescheduling of tickets and/or parties may be made by contacting Modesto On Ice.</i></p>

        `);
                return ResponseService_1.ResponseBuilder(null, null, false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, 'Not able to send update email', true, {
                    log: true,
                    error: err
                });
            }
        });
    }
    static sendBirthdayEmailUsingPayload(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Your Birthday Information', `
        <h3>Thanks for booking your party with Modesto On Ice!</h3>

        <p>Below is your birthday booking information</p>

        <p>Confirmation code: <b>${payload.confirmationNumber}</b></p>

        <p>Booking date: <b>${moment(payload.sessionDate).format('MMM D, YYYY') +
                    ' at ' +
                    moment(payload.sessionDate).format('h:mm a')}</b></p>

        <p>Total: <b>$${payload.dollarAmount.toFixed(2)}</b></p>

        <hr>

        <p>**** Skater Waiver ****</p>
        <p>All skaters are required to have a Waiver. which becomes valid for the entire season. One waiver per adult, age 18 and older.  Minors must have their Waiver completed by an adult, and multiple minors can be on an Adult's waiver. Maximize your ice time and submit your waiver before you get to the rink!  </p>

        <p>
          <a href="${process.env.DOMAIN}/skater-waiver?cn=${payload.confirmationNumber}&type=birthdayBooking">Click here</a> or copy and paste this in your browser:
        </p>

        <p>${process.env.DOMAIN}/skater-waiver?cn=${payload.confirmationNumber}&type=birthdayBooking</p>

        <hr>

        <p><i>Due to the limited availability, all sales are final. In some cases, based on availability, rescheduling of tickets and/or parties may be made by contacting Modesto On Ice.</i></p>

      `);
                return ResponseService_1.ResponseBuilder(null, 'Sent email', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, 'Could not send email', true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static sendPassEmailUsingPayload(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield EmailService.sendEmail(payload.email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | Your Pass Information', `
        <h3>Thanks for booking your ${payload.passType} with Modesto On Ice!</h3>

        <p>Below is your ${payload.passType} information</p>

        <p>Confirmation code: <b>${payload.confirmationNumber}</b></p>

        <hr>

        <p>**** Skater Waiver ****</p>
        <p>All skaters are required to have a Waiver.  If additional waivers are needed under your Confirmation Number, please share the following link and your Confirmation number to everyone in your group for a smoother check-in when you arrive at the ice rink.  </p>

        <p>
          <a href="${process.env.DOMAIN}/skater-waiver?cn=${payload.confirmationNumber}&type=session">Click here</a> or copy and paste this in your browser:
        </p>

        <p>${process.env.DOMAIN}/skater-waiver?cn=${payload.confirmationNumber}&type=session</p>

        <hr>

        <p><i>Due to the limited availability, all sales are final. In some cases, based on availability, rescheduling of tickets and/or parties may be made by contacting Modesto On Ice.</i></p>

      `);
                return ResponseService_1.ResponseBuilder(null, 'Sent email', false);
            }
            catch (err) {
                return ResponseService_1.ResponseBuilder(null, 'Could not send email', true, {
                    error: err,
                    log: true
                });
            }
        });
    }
    static sendReportEmail(to, date, reportAttachment) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const subject = 'Modesto On Ice | Daily Birthday Report';
                sgMail.setApiKey(process.env.SENDGRID_KEY);
                const msg = {
                    to: to,
                    from: email_constants_1.DEFAULT_EMAIL_SENDER,
                    subject: 'Daily Birthday Report',
                    html: `
          <!doctype html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width" />
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
              <title>${subject}</title>
              ${email_constants_1.EMAIL_STYLES}
            </head>
    
            <body>
              <table border="0" cellpadding="0" cellspacing="0" class="body">
                <tr>
                  <td>&nbsp;</td>
                  <td class="container">
                    <div class="content">
                      <span class="preheader">${subject}</span>
                      <table class="main" style="padding: 24px;">
                        <p>Your daily birthday booking report is attached for ${date.format('dddd, MMMM Do')}.</p>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
                    attachments: [
                        {
                            filename: `DailyBirthdayReport_${date.format('MMMM_DD_YYYY')}.pdf`,
                            content: reportAttachment,
                            type: 'application/pdf',
                            disposition: 'attachment'
                        }
                    ]
                };
                yield sgMail.send(msg);
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
    static sendSeasonStartReminder(email, confirmationNumber, bookingType) {
        return __awaiter(this, void 0, void 0, function* () {
            return EmailService.sendEmail(email, email_constants_1.DEFAULT_EMAIL_SENDER, 'Modesto On Ice | The Season Has Started!', `
      <h3>Thanks for booking your ${bookingType} with Modesto On Ice!</h3>

      <p>As a friendly reminder, here is your barcode. Use this at the ticket booth for a quick and easy check-in.</p>

      <hr>

      <img alt="Your barcode" src="http://www.barcodes4.me/barcode/c128a/${confirmationNumber}.png?height=400&resolution=4">

      <hr>

      <p><a href="https://tickets.modestoonice.com/skater-waiver?cn=${confirmationNumber}">Sign your skater waiver</a> before you get to the rink!</p>

      <p>Having trouble viewing the link? Copy and paste this in your browser: https://tickets.modestoonice.com/skater-waiver?cn=confirmationNumber</p>
    
      <hr>

      <p><i>Due to the limited availability, all sales are final. In some cases, based on availability, rescheduling of tickets and/or parties may be made by contacting Modesto On Ice.</i></p>

    `);
        });
    }
}
exports.EmailService = EmailService;
