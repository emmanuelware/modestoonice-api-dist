"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
exports.wait = (ms = 1000) => rxjs_1.of()
    .pipe(operators_1.delay(ms))
    .toPromise();
//# sourceMappingURL=rx.js.map