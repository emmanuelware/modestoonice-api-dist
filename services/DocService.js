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
const ResponseService_1 = require("./ResponseService");
const UtilService_1 = require("./UtilService");
const fs = require("fs");
const moment = require("moment");
const PDFDocument = require("pdfkit");
exports.docColors = {
    black: '#11211',
    gray: '#b5b6b4',
    lightGray: '#d0d7d8'
};
class DocService {
    static getDocReceiptBySubscriptionItemId(subItemId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!fs.existsSync(process.env.TEMP_DOC_DIR)) {
                    console.warn('Directory', process.env.TEMP_DOC_DIR, "doesn't exist. Creating now");
                    fs.mkdirSync(process.env.TEMP_DOC_DIR);
                }
                const subItem = {
                    id: 9,
                    amount: 179,
                    invoiceNumber: 'P000001',
                    billingDate: new Date(),
                    userId: 1,
                    companyName: 'G.W. King Pools',
                    email: 'gwking@sbcglobal.net',
                    phone: '2099854826',
                    street: '123 ABC Street',
                    city: 'Oakdale',
                    state: 'CA',
                    tax: 14.03,
                    zip: 95361
                };
                const dir = `${process.env.TEMP_DOC_DIR}/${userId}_${UtilService_1.UtilService.generateRandomString(64)}.pdf`;
                // Change these to change the layout of the doc
                const docOptions = {
                    /** The default font size used for the content */
                    defaultFontSize: 12,
                    /** The font size used for any subheadings or any words that are used
                     * to describe content sections, i.e. "Prepared for" */
                    subheadingFontSize: 16,
                    headingFontSize: 21,
                    /** The document is generated without any margins, and the dimensions
                     * are taller than they are wider. */
                    horizontalPadding: 80,
                    lineHeight: 14,
                    /** The starting Y position for all page content */
                    startingY: 120,
                    /** The document is generated without any margins, and the dimensions
                     * are taller than they are wider. */
                    verticalPadding: 70
                };
                const doc = new PDFDocument({
                    margin: 0
                });
                let lineY = docOptions.startingY;
                const incrementLineY = (amount) => {
                    if (amount) {
                        lineY += amount;
                    }
                    else {
                        lineY += docOptions.lineHeight;
                    }
                };
                const setLineY = (value) => {
                    lineY = value;
                };
                doc.pipe(fs.createWriteStream(dir));
                doc.fillColor(exports.docColors.black);
                // Doc heading
                doc
                    .fontSize(docOptions.headingFontSize)
                    .fillColor(exports.docColors.gray)
                    .text('POOL ORCHARD INVOICE', doc.x, docOptions.verticalPadding, {
                    align: 'center'
                });
                // Pool Orchard billing header
                doc
                    .fontSize(docOptions.subheadingFontSize)
                    .fillColor(exports.docColors.black)
                    .text('Pool Orchard Inc.', docOptions.horizontalPadding, lineY);
                incrementLineY(docOptions.lineHeight + (docOptions.subheadingFontSize - docOptions.defaultFontSize));
                doc.fontSize(docOptions.defaultFontSize).text('4701 Stoddard Road', docOptions.horizontalPadding, lineY);
                incrementLineY();
                doc.text('Modesto, CA 95356', docOptions.horizontalPadding, lineY);
                incrementLineY();
                setLineY(lineY + docOptions.lineHeight * 3);
                // Bill-to billing header
                doc.fontSize(docOptions.subheadingFontSize).text('Prepared for', docOptions.horizontalPadding, lineY);
                incrementLineY(docOptions.lineHeight + 5);
                doc
                    .moveTo(docOptions.horizontalPadding, lineY)
                    .lineTo(225, lineY)
                    .stroke();
                incrementLineY(docOptions.lineHeight / 2);
                doc.fontSize(docOptions.defaultFontSize).text(subItem.companyName, docOptions.horizontalPadding, lineY);
                incrementLineY();
                doc.text('Modesto, CA 95356', docOptions.horizontalPadding, lineY);
                incrementLineY();
                lineY = docOptions.startingY;
                // Meta data
                const metaLeftColX = 360;
                const metaRightColX = 440;
                doc.text('Invoice #', metaLeftColX, lineY);
                doc.text(subItem.invoiceNumber, metaRightColX, lineY);
                incrementLineY();
                doc.text('Invoice Date', metaLeftColX, lineY);
                doc.text(moment(subItem.billingDate).format('MMM d, YYYY'), metaRightColX, lineY);
                incrementLineY();
                doc
                    .rect(metaLeftColX - 3, lineY - docOptions.defaultFontSize / 4, 185, docOptions.lineHeight)
                    .fill(exports.docColors.lightGray);
                doc.fill(exports.docColors.black).text('Amount', metaLeftColX, lineY);
                doc.text(`$${(subItem.amount + subItem.tax).toFixed(2)}`, metaRightColX, lineY);
                // Total block
                lineY = 320;
                const totalLeftColX = 360;
                const totalRightColX = 440;
                doc.text('Subtotal', totalLeftColX, lineY);
                doc.text(subItem.amount.toFixed(2), totalRightColX, lineY);
                incrementLineY();
                doc.text('Tax', totalLeftColX, lineY);
                doc.text(subItem.tax.toFixed(2), totalRightColX, lineY);
                incrementLineY(20);
                doc.fontSize(18).text('Total', 300, lineY);
                doc.fontSize(26).text(`$${subItem.amount}.00`, 380, lineY);
                doc.end();
                fs.unlinkSync(dir);
            }
            catch (e) {
                return ResponseService_1.ResponseBuilder(null, 'Could not fetch receipt document for subscription item', true, {
                    error: e,
                    log: true
                });
            }
        });
    }
}
exports.DocService = DocService;
//# sourceMappingURL=DocService.js.map