const { MessageType, GiveAwaysWinnerSelectionType } = require(".prisma/client");
const Joi = require("joi");

function adminRegisterValidation(data) {
    const loginSchema = Joi.object({
        sign_name: Joi.string().max(25).required(),
        // firstname: Joi.string().max(25).required(),
        // lastname: Joi.string().max(25).required(),
        // email: Joi.string().email().required(),
        // password: Joi.string().required(),
    });
    return loginSchema.validate(data);
}

function adminLoginValidation(data) {
    const loginSchema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    });
    return loginSchema.validate(data);
}

function adminFilterValidation(data) {
    const filterSchema = Joi.object({
        gender: Joi.string().required(),
    });
    return filterSchema.validate(data);
}

function registerValidation(data) {
    const registerSchema = Joi.object({
        firstname: Joi.string().max(25).required(),
        lastname: Joi.string().max(25).required(),
        user_name: Joi.string().max(15).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().max(15),
        password: Joi.string().required(),
        gender: Joi.string().max(10).required(),
        age: Joi.number().integer().required(),
        ziodic_sign: Joi.string().max(15).required(),
        education: Joi.string().max(20).required(),
        height: Joi.number().required(),
        status: Joi.string().max(50).required(),
        body_type: Joi.string().max(30).required(),
        profession: Joi.string().max(30).required(),
        religion: Joi.string().max(20).required(),
        show_profile_picture: Joi.boolean().required(),
        show_private_picture: Joi.boolean().required(),
        longitude: Joi.number().required(),
        latitude: Joi.number().required(),
        city: Joi.string().max(20).required(),
        country: Joi.string().max(20).required(),
        description: Joi.string().max(250).required(),
        // is_social_login: Joi.boolean().required(),
        // social_auth_id: Joi.when("is_social_login", {
        //     is: true,
        //     then: Joi.string().required(),
        // }),
    });
    return registerSchema.validate(data);
}

function likeValidation(data) {
    const registerSchema = Joi.object({
        liked_id: Joi.string().required(),
        interest: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function notificationValidation(data) {
    const registerSchema = Joi.object({
        notification_type: Joi.string().required(),
        notification_message: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function blockProfileValidation(data) {
    const registerSchema = Joi.object({
        blocked_id: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function fcmTokenValidation(data) {
    const registerSchema = Joi.object({
        fcm_token: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function disLikeValidation(data) {
    const registerSchema = Joi.object({
        liked_id: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function requestPicturesValidation(data) {
    const registerSchema = Joi.object({
        second_user_id: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function acceptRequestPicturesValidation(data) {
    const registerSchema = Joi.object({
        first_user_id: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function deleteRequestValidation(data) {
    const registerSchema = Joi.object({
        liker_id: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function approveValidation(data) {
    const registerSchema = Joi.object({
        liker_id: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function feedBackValidation(data) {
    const registerSchema = Joi.object({
        email: Joi.string().email(),
        name: Joi.string().max(25),
        message: Joi.string().required(),
    });
    return registerSchema.validate(data);
}

function updatProfileValidation(data) {
    const registerSchema = Joi.object({
        firstname: Joi.string().max(30),
        lastname: Joi.string().max(30),
        religion: Joi.string().max(20),
        height: Joi.number(),
        education: Joi.string().max(20),
        phone: Joi.string().max(20),
        description: Joi.string(),
        age: Joi.number().integer(),
        body_type: Joi.string().max(30),
        profession: Joi.string().max(30),
        status: Joi.string().max(50),
        show_profile_picture: Joi.boolean(),
        show_private_picture: Joi.boolean(),
        // picture_ids: Joi.array(),
    });
    return registerSchema.validate(data);
}

function deletePictureValidation(data) {
    const deleteSchema = Joi.object({
        picture_id: Joi.string().required(),
    });
    return deleteSchema.validate(data);
}

function loginValidation(data) {
    const loginSchema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    });
    return loginSchema.validate(data);
}

function emailValidation(data) {
    const emailSchema = Joi.object({
        email: Joi.string().email().required(),
    });
    return emailSchema.validate(data);
}

function userNamelValidation(data) {
    const userNameSchema = Joi.object({
        user_name: Joi.string().required(),
    });
    return userNameSchema.validate(data);
}

function changePasswordValidation(data) {
    const changePasswordSchema = Joi.object({
        old_password: Joi.string().required(),
        new_password: Joi.string().required(),
    });
    return changePasswordSchema.validate(data);
}

function phoneAndOtpValidation(data) {
    const phoneAndOtpSchema = Joi.object({
        phone: Joi.string().required(),
        otp: Joi.number().integer().greater(1111).less(9999).required().messages({
            "number.greater": "otp must be 4 digit number.",
            "number.less": "otp must be 4 digit number.",
        }),
    });
    return phoneAndOtpSchema.validate(data);
}

function phoneValidation(data) {
    const phoneSchema = Joi.object({
        phone: Joi.string().required(),
    });
    return phoneSchema.validate(data);
}

function emailPhoneAndOtpValidation(data) {
    const phoneEmailAndOtpSchema = Joi.object({
        email: Joi.string().email().required(),
        // phone: Joi.string().required(),
        otp: Joi.number().integer().greater(1111).less(9999).required().messages({
            "number.greater": "otp must be 4 digit number.",
            "number.less": "otp must be 4 digit number.",
        }),
    });
    return phoneEmailAndOtpSchema.validate(data);
}

function socialAuthValidation(data) {
    const SocialAuthSchema = Joi.object({
        firstname: Joi.string().max(25).required(),
        lastname: Joi.string().max(25).required(),
        user_name: Joi.string().max(15).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().max(15),
        // password: Joi.string().required(),
        gender: Joi.string().max(10).required(),
        age: Joi.number().integer().required(),
        ziodic_sign: Joi.string().max(15).required(),
        education: Joi.string().max(15).required(),
        height: Joi.number().required(),
        status: Joi.string().max(50).required(),
        body_type: Joi.string().max(15).required(),
        profession: Joi.string().max(15).required(),
        religion: Joi.string().max(15).required(),
        show_profile_picture: Joi.boolean().required(),
        show_private_picture: Joi.boolean().required(),
        longitude: Joi.number().required(),
        latitude: Joi.number().required(),
        city: Joi.string().max(15).required(),
        country: Joi.string().max(15).required(),
        description: Joi.string().max(250).required(),
        is_social_login: Joi.boolean().required(),
        social_auth_id: Joi.when("is_social_login", {
            is: true,
            then: Joi.string().required(),
        }),
    });
    return SocialAuthSchema.validate(data);
}

function socialLoginValidation(data) {
    const loginSchema = Joi.object({
        email: Joi.string().email().required(),
        social_auth_id: Joi.string().required(),
    });
    return loginSchema.validate(data);
}

function ForgotPasswordValidation(data) {
    const ResetPasswordSchema = Joi.object({
        email: Joi.string().email().required(),
        // phone: Joi.string(),
    });
    // .xor("email", "phone");
    return ResetPasswordSchema.validate(data);
}

function OtpVerifyForgotPasswordValidation(data) {
    const OtpVerifyForgotPasswordSchema = Joi.object({
        email: Joi.string().email().required(),
        // phone: Joi.string(),
        otp: Joi.number().integer().greater(1111).less(9999).required().messages({
            "number.greater": "otp must be 4 digit number.",
            "number.less": "otp must be 4 digit number.",
        }),
    });
    // .xor("email", "phone");
    return OtpVerifyForgotPasswordSchema.validate(data);
}

function ResetForgotPasswordValidation(data) {
    const ResetForgotPasswordSchema = Joi.object({
        email: Joi.string().email().required(),
        // phone: Joi.string(),
        password: Joi.string().required(),
    });
    // .xor("email", "phone");
    return ResetForgotPasswordSchema.validate(data);
}

function prefrencesValidation(data) {
    const prefrencesSchema = Joi.object({
        gender: Joi.string().required(),
        ziodic_sign: Joi.string().required(),
        country: Joi.string().required(),
        religion: Joi.string().required(),
        height: Joi.number().required(),
        status: Joi.string().required(),
        body_type: Joi.string().required(),
        profession: Joi.string().required(),
        age_start: Joi.number().integer().required(),
        age_end: Joi.number().integer().required(),
    });
    return prefrencesSchema.validate(data);
}

function giveAwayValidation(data) {
    const __ = new Date();
    __.setHours(0, 0, 0, 0);

    const giveAwaySchema = Joi.object({
        amount_per_person: Joi.number().greater(0).required(),
        total_winners: Joi.number().integer().greater(0).required(),
        winner_selection_type: Joi.string()
            .valid(
                GiveAwaysWinnerSelectionType.AUTOMATIC,
                GiveAwaysWinnerSelectionType.MANUALLY
            )
            .required(),
        end_time: Joi.string()
            .regex(/^([0-9]{2})\:([0-9]{2})$/)
            .required(),
        end_date: Joi.date().min(__).required(),
        about: Joi.string().required(),
        card_number: Joi.number().integer().required(),
        name_on_card: Joi.string().required(),
        expiry_month: Joi.number().integer().required(),
        expiry_year: Joi.number().integer().required(),
        cvv: Joi.number().integer().required(),
        card_pin: Joi.number().integer().required(),
    });
    return giveAwaySchema.validate(data);
}

function giveAwayPaymentVerificationValidation(data) {
    const giveAwayPaymentVerificationSchema = Joi.object({
        otp: Joi.number().integer().required(),
        give_away_id: Joi.string().required(),
    });
    return giveAwayPaymentVerificationSchema.validate(data);
}

function userProfileValidation(data) {
    const userProfileSchema = Joi.object({
        user_id: Joi.string().required(),
    });
    return userProfileSchema.validate(data);
}

function postValidation(data) {
    const postSchema = Joi.object({
        post_id: Joi.string().required(),
    });
    return postSchema.validate(data);
}

function postCommentValidation(data) {
    const postCommentSchema = Joi.object({
        post_id: Joi.string().required(),
        comment: Joi.string().required(),
    });
    return postCommentSchema.validate(data);
}

function postCommentRepliesValidation(data) {
    const postCommentRepliesSchema = Joi.object({
        post_id: Joi.string().required(),
        comment_id: Joi.string().required(),
        reply: Joi.string().required(),
    });
    return postCommentRepliesSchema.validate(data);
}

function postCommentLikesValidation(data) {
    const postCommentLikesSchema = Joi.object({
        post_id: Joi.string().required(),
        comment_id: Joi.string().required(),
    });
    return postCommentLikesSchema.validate(data);
}

function postCommentReplyLikesValidation(data) {
    const postCommentReplyLikesSchema = Joi.object({
        post_id: Joi.string().required(),
        comment_id: Joi.string().required(),
        reply_id: Joi.string().required(),
    });
    return postCommentReplyLikesSchema.validate(data);
}

function messageValidation(data) {
    const messageSchema = Joi.object({
        to_id: Joi.string().required(),
        message_type: Joi.string()
            .valid(MessageType.TEXT, MessageType.MEDIA)
            .required(),
        // attachment: Joi.when("message_type", {
        //     is: MessageType.MEDIA,
        //     then: Joi.string().required(),
        // }),
        // media_type: Joi.when("message_type", {
        //     is: MessageType.MEDIA,
        //     then: Joi.string().required(),
        // }),
        message_body: Joi.when("message_type", {
            is: MessageType.TEXT,
            then: Joi.string().required(),
            otherwise: Joi.string(),
        }),
        // uuid: Joi.any().required(),
    });
    return messageSchema.validate(data);
}

function fetchMessageValidation(data) {
    const fetchMessageSchema = Joi.object({
        to_id: Joi.string().required(),
        page: Joi.number().integer(),
    });
    return fetchMessageSchema.validate(data);
}

function seenMessagesValidation(data) {
    const seenMessagesSchema = Joi.object({
        from_id: Joi.string().required(),
    });
    return seenMessagesSchema.validate(data);
}

function deleteChatValidation(data) {
    const deleteChatSchema = Joi.object({
        to_id: Joi.string().required(),
    });
    return deleteChatSchema.validate(data);
}

function deleteMessagesValidation(data) {
    const deleteMessagesSchema = Joi.object({
        to_id: Joi.string().required(),
        message_ids: Joi.string().required(),
    });
    return deleteMessagesSchema.validate(data);
}

function updateApprovalValidation(data) {
    const updateApprovalSchema = Joi.object({
        email: Joi.string().email().required(),
    });
    return updateApprovalSchema.validate(data);
}

module.exports = {
    adminLoginValidation,
    adminRegisterValidation,
    adminFilterValidation,
    registerValidation,
    likeValidation,
    notificationValidation,
    blockProfileValidation,
    fcmTokenValidation,
    deleteRequestValidation,
    disLikeValidation,
    requestPicturesValidation,
    acceptRequestPicturesValidation,
    approveValidation,
    feedBackValidation,
    updatProfileValidation,
    deletePictureValidation,
    loginValidation,
    emailValidation,
    userNamelValidation,
    changePasswordValidation,
    phoneAndOtpValidation,
    phoneValidation,
    emailPhoneAndOtpValidation,
    socialAuthValidation,
    socialLoginValidation,
    ForgotPasswordValidation,
    OtpVerifyForgotPasswordValidation,
    ResetForgotPasswordValidation,
    prefrencesValidation,
    giveAwayValidation,
    giveAwayPaymentVerificationValidation,
    userProfileValidation,
    postValidation,
    postCommentValidation,
    postCommentRepliesValidation,
    postCommentLikesValidation,
    postCommentReplyLikesValidation,
    messageValidation,
    fetchMessageValidation,
    seenMessagesValidation,
    deleteMessagesValidation,
    deleteChatValidation,
    updateApprovalValidation,
};