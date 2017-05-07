"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectNonJSON = function (req, res, next) {
    if (String(req.headers['content-type']).toLowerCase() !== 'application/json') {
        return res.status(406).json({ error: "Only application/json accepted" });
    }
    next();
};
