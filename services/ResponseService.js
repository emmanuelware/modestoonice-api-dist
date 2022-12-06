"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SentryBuilderOptions {
    constructor(options) {
        this.error = null;
        this.log = false;
        this.error = options ? options.error : this.error;
        this.log = options ? options.log : this.log;
    }
}
exports.SentryBuilderOptions = SentryBuilderOptions;
exports.ResponseBuilder = (data, msg, err, builderOptions) => {
    const response = {
        data: data || null,
        msg: msg || null,
        err: err || false,
        sentryPayload: null
    };
    const options = new SentryBuilderOptions(builderOptions);
    if (options.log) {
        global.db
            .query(`INSERT INTO responseBuilderError (timestamp, error) VALUES (NOW(), "${options.error}")`)
            .then(() => {
            console.log('ResponseBuilder logged an error\n', options.error);
        })
            .catch(e => {
            console.log('ResponseBuilder could not log error\n', e);
        });
    }
    if (err) {
        if (options.error) {
            response.sentryPayload = options;
        }
        if (options.log) {
            console.error(options.error);
        }
    }
    return response;
};
exports.ResponseHandler = (ctx, payload = {
    data: null,
    msg: null,
    err: false,
    sentryPayload: null
}) => {
    const { data, msg, err, sentryPayload } = payload;
    if (sentryPayload) {
        ctx.app.emit('error', sentryPayload.error, ctx);
    }
    return {
        data,
        msg,
        err
    };
};
//# sourceMappingURL=ResponseService.js.map