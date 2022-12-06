"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLogs = (environmentName, processName, functionName, message, logType = 'log') => {
    console[logType || 'log'](`${new Date()} - ${environmentName}:${processName}.${functionName}\n${message}\n`);
};
//# sourceMappingURL=logging.js.map