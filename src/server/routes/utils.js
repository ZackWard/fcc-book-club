export const rejectNonJSON = function (req, res, next) {
    if (String(req.headers['content-type']).toLowerCase() !== 'application/json') {
        return res.status(406).json({error: "Only application/json accepted"});
    }
    next();
};

export const requireAuthentication = function (req, res, next) {
    if ( ! req.session.user) {
        return res.status(403).json({error: "You must be logged in to complete this request."});
    }
    next();
};