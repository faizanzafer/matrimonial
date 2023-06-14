const jwt = require("jsonwebtoken");
const { getEnv } = require("../config");
const { getError } = require("../helpers");
const { getUserfromId } = require("../database_queries/Auth");

module.exports = async function(req, res, next) {
    const token = req.header("Authorization");
    if (!token) {
        return res.status(403).send(getError("Access Denied!"));
    }
    try {
        const verified = jwt.verify(token, getEnv("JWT_SECERET"));
        const { _id: id } = verified;
        const user = await getUserfromId(id);
        if (!user)
            return res
                .status(403)
                .send(getError("Unauthorized! Please login again to refresh token."));
        user._id = user.id;
        req.user = user;
        next();
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError("Invalid token!."));
    }
};