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
const crypto_1 = require("crypto");
const numbersDictionary = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const lettersDictionary = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z'
];
class UtilService {
    static generateRandomString(length = 32, _opts) {
        try {
            const opts = {
                numbers: _opts ? _opts.numbers : true,
                letters: _opts ? _opts.letters : false
            };
            let dictionary = [];
            if (opts.numbers) {
                dictionary = dictionary.concat(numbersDictionary);
            }
            if (opts.letters) {
                dictionary = dictionary.concat(lettersDictionary);
            }
            let str = '';
            for (let i = 0; i < length; i++) {
                const rand = Math.random();
                const index = Math.floor(Math.random() * dictionary.length);
                if (rand <= 0.5) {
                    str += dictionary[index].toUpperCase();
                }
                else {
                    str += dictionary[index].toLowerCase();
                }
            }
            return str;
        }
        catch (e) {
            throw new Error(e);
        }
    }
    static generateCryptoString() {
        return crypto_1.randomBytes(64).toString('hex');
    }
    static wait(ms = 500) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve();
                    }, ms);
                });
            }
            catch (e) {
                throw new Error(e);
            }
        });
    }
}
exports.UtilService = UtilService;
