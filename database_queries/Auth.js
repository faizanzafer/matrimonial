const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;
const bcrypt = require("bcrypt");

function getUserfromId(id) {
    return prisma.users.findFirst({
        where: {
            id,
            is_registered: true,
        },
    });
}

function getUserNotifications(id) {
    return prisma.notification.findMany({
        where: {
            to_id: id,
            seen: false
        },
    });
}

function getExistingUserFromEmail(email) {
    return prisma.users.findFirst({
        where: {
            email,
            is_registered: true,
        },
    });
}

function checkUserNameTaken(user_name) {
    return prisma.users.findFirst({
        where: {
            user_name,
            is_registered: true,
        },
    });
}

function createUser(
    user,
    firstname,
    lastname,
    user_name,
    email,
    phone,
    password,
    gender,
    age,
    ziodic_sign,
    education,
    height,
    status,
    body_type,
    profession,
    religion,
    show_profile_picture,
    show_private_picture,
    longitude,
    latitude,
    city,
    country,
    description
) {
    const hashPassword = bcrypt.hashSync(password, 10);

    return prisma.users.update({
        where: {
            id: user.id,
        },
        data: {
            firstname,
            lastname,
            user_name,
            phone,
            password: hashPassword,
            gender,
            age,
            ziodic_sign,
            education,
            height,
            status,
            body_type,
            profession,
            religion,
            show_profile_picture,
            show_private_picture,
            longitude,
            latitude,
            city,
            country,
            is_registered: true,
            description,
        },
    });
}

function createSocialUser(
    user,
    firstname,
    lastname,
    user_name,
    email,
    phone,
    // password,
    gender,
    age,
    ziodic_sign,
    education,
    height,
    status,
    body_type,
    profession,
    religion,
    show_profile_picture,
    show_private_picture,
    longitude,
    latitude,
    city,
    country,
    description,
    social_auth_id,
    social_auth_provider,
    is_social_login,
) {
    // const hashPassword = bcrypt.hashSync(password, 10);

    return prisma.users.update({
        where: {
            id: user.id,
        },
        data: {
            firstname,
            lastname,
            user_name,
            phone,
            // password: hashPassword,
            gender,
            age,
            ziodic_sign,
            education,
            height,
            status,
            body_type,
            profession,
            religion,
            show_profile_picture,
            show_private_picture,
            longitude,
            latitude,
            city,
            country,
            is_registered: true,
            description,
            social_auth_id,
            social_auth_provider,
            is_social_login,
        },
    });
}

function checkEmailAndPhoneExist(email, phone) {
    return prisma.users.findFirst({
        where: {
            email,
            phone,
            is_registered: false,
        },
    });
}

function getUserFromPhone(phone) {
    // if (phone) {
    return prisma.users.findFirst({
        where: {
            phone,
            // NOT: [{
            //     phone: null,
            // }]
        },
    });
    // }
}

function getUserfromEmail(email) {
    return prisma.users.findFirst({
        where: {
            email,
        },
    });
}

module.exports = {
    getUserfromId,
    getUserNotifications,
    getExistingUserFromEmail,
    checkUserNameTaken,
    createUser,
    createSocialUser,
    checkEmailAndPhoneExist,
    getUserFromPhone,
    getUserfromEmail,
};