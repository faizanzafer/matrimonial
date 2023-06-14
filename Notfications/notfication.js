var admin = require("firebase-admin");

var serviceAccount = require("./matrimonial-e108f-firebase-adminsdk-zzl9x-1e5360769f.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const SendNotification = (
    token,
    notification,
    data = {},
    apns = {},
    android = {}
) => {
    return admin.messaging().send({
        token,
        notification,
        data,
        apns,
        android,
    });
};

module.exports = { SendNotification };