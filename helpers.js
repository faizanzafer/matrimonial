const { now } = require("mongoose");
const timediff = require("timediff");
const jwt = require("jsonwebtoken");
const { getEnv } = require("./config");

const timeExpired = ({
    p_years = 0,
    p_months = 0,
    p_days = 0,
    p_hours = 0,
    p_minutes = 0,
    p_seconds = 60,
    time = now(),
}) => {
    const { years, months, days, hours, minutes, seconds } = timediff(
        time,
        now(),
        "YMDHmS"
    );

    return (
        years > p_years ||
        months > p_months ||
        days > p_days ||
        hours > p_hours ||
        minutes > p_minutes ||
        seconds > p_seconds
    );
};

const createToken = (user) => {
    return jwt.sign({
            _id: user.id,
            firstname: user.firstname,
            lastname: user.lastname,
            user_name: user.user_name,
            email: user.email,
            gender: user.gender,
            picture_url: user.picture_url,
            show_profile_picture: user.show_profile_picture,
            show_private_picture: user.show_private_picture,
            show_phone_number: user.show_phone_number,
        },
        getEnv("JWT_SECERET")
    );
};

const createAdminToken = () => {
    return jwt.sign({
            email: getEnv("ADMIN_MAIL")
        },
        getEnv("ADMIN_JWT_SECERET")
    );
};

const getError = (error) => {
    return {
        error,
        code: 404,
    };
};

const getSuccess = (data) => {
    return {
        data,
        code: 200,
    };
};

const sendError = (res, error) => {
    return res.status(404).send(getError(error));
};

const sendSuccess = (res, data) => {
    return res.send(getSuccess(data));
};

const clean = (str) => {
    return str
        .replace(/[^\d.-]/g, "")
        .replace(/(?!\w|\s)./g, "")
        .replace(/\s+/g, "")
        .replace(/^(\s*)([\W\w]*)(\b\s*$)/g, "$2");
};

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

module.exports = {
    getError,
    sendError,
    getSuccess,
    sendSuccess,
    timeExpired,
    clean,
    createToken,
    getDistanceFromLatLonInKm,
    createAdminToken,
};