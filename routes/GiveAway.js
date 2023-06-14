const router = require("express").Router();
const date = require("date-and-time");
const rn = require("random-number");
const axios = require("axios").default;
const timediff = require("timediff");
const { now } = require("mongoose");
const _ = require("lodash");

const {
    GiveAwaysWinnerSelectionType,
    GiveAwaysStatus,
    FollowingApproval,
} = require("@prisma/client");
const trimRequest = require("trim-request");

const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

const verifyToken = require("../middlewares/AuthMiddleware");
const AnonomousUser = require("../middlewares/AnonomousUser");
const {
    giveAwayValidation,
    giveAwayPaymentVerificationValidation,
} = require("./validate");
const { getError, getSuccess } = require("../helpers");
const { getEnv } = require("../config");

//
//

router.post("/create_giveaway", [verifyToken, trimRequest.all],
    async(req, res) => {
        const { error, value } = giveAwayValidation(req.body);
        if (error) return res.status(400).send(getError(error.details[0].message));

        try {
            const { _id: user_id, email } = req.user;
            const {
                amount_per_person,
                total_winners,
                winner_selection_type,
                end_time,
                end_date,
                about,
                card_number,
                name_on_card,
                expiry_month,
                expiry_year,
                cvv,
                card_pin,
            } = req.body;

            const end_date_time = ValidateEndDateTime({
                end_date,
                end_time,
            });

            if (end_date_time && end_date_time.error) {
                return res.status(400).send(end_date_time);
            }

            // console.log({ body: req.body, end_date, end_time, end_date_time });

            // console.log("value", value);

            const key = getEnv("FLUTTERWAVE_ENCRYPTION_KEY");

            const random = rn.generator({
                min: 1111111,
                max: 9999999,
                integer: true,
            })();

            const card_details = {
                card_number,
                cvv,
                expiry_month,
                expiry_year,
                currency: "NGN",
                amount: amount_per_person * total_winners,
                fullname: name_on_card,
                email,
                tx_ref: random.toString(),
                // redirect_url: "https://webhook.site/3ed41e38-2c79-4c79-b455-97398730866c",
                authorization: {
                    mode: "pin",
                    pin: card_pin,
                },
            };

            const text = JSON.stringify(card_details);

            const encrypted = {
                client: encrypt(key, text),
            };
            axios
                .post("https://api.flutterwave.com/v3/charges?type=card", encrypted, {
                    headers: {
                        Authorization: `Bearer ${getEnv("FLUTTERWAVE_SECRET_KEY")}`,
                    },
                })
                .then(async(apiResponse) => {
                    console.log(apiResponse.data.meta);

                    if (
                        apiResponse.data &&
                        apiResponse.data.meta &&
                        apiResponse.data.meta.authorization &&
                        apiResponse.data.meta.authorization.mode &&
                        apiResponse.data.meta.authorization.mode == "otp"
                    ) {
                        const newGiveAway = await prisma.giveAways.create({
                            data: {
                                amount_per_person,
                                total_winners,
                                total_cost: amount_per_person * total_winners,
                                winner_selection_type,
                                end_date_time,
                                complete_end_date_time: `${end_date} ${end_time}`,
                                about,
                                user_id,
                            },
                        });

                        console.log("newGiveAway end_date_time", newGiveAway.end_date_time);

                        await prisma.giveAwaysPendingPayment.create({
                            data: {
                                give_away_id: newGiveAway.id,
                                user_id: user_id,
                                flw_ref: apiResponse.data.data.flw_ref,
                            },
                        });

                        return res.send(
                            getSuccess({
                                message: "Give Away created with pending payment verification",
                                give_away_id: newGiveAway.id,
                                otp_required: true,
                            })
                        );
                    } else if (
                        apiResponse.data &&
                        apiResponse.data.meta &&
                        apiResponse.data.meta.authorization &&
                        apiResponse.data.meta.authorization.mode &&
                        apiResponse.data.meta.authorization.mode == "redirect"
                    ) {
                        return res.status(400).send(getError("Pin is wrong."));
                    } else return res.status(400).send(getError("Error making payment."));
                })
                .catch((apiError) => {
                    console.log(apiError);
                    if (apiError && apiError.response && apiError.data && apiError.message) {
                        return res
                            .status(400)
                            .send(getError(apiError.response.data.message));
                    }
                    return res.status(400).send(getError(apiError.message));
                });
        } catch (err) {
            console.log("err", err);
            if (err && err.message) {
                return res.status(400).send(getError(err.message));
            }
            return res.status(400).send(getError(err));
        }
    }
);

router.post("/giveaway_payment_verification", [verifyToken, trimRequest.all],
    async(req, res) => {
        const { error, value } = giveAwayPaymentVerificationValidation(req.body);
        if (error) return res.status(400).send(getError(error.details[0].message));
        try {
            const { _id: user_id } = req.user;
            const { otp, give_away_id } = req.body;

            const giveAway = await prisma.giveAways.findFirst({
                where: { id: give_away_id },
            });
            if (!giveAway) {
                return res.status(400).send(getError("GiveAway does not exist."));
            }

            if (giveAway.status != GiveAwaysStatus.PAYMENTPENDING) {
                return res
                    .status(400)
                    .send(
                        getError("GiveAway does not have payment pending verification.")
                    );
            }

            const pendingVerification =
                await prisma.giveAwaysPendingPayment.findFirst({
                    where: { user_id, give_away_id },
                });
            if (!pendingVerification) {
                return res
                    .status(400)
                    .send(
                        getError(
                            "Payment pending for this giveaway verification does not exist."
                        )
                    );
            }
            const validate_data = {
                otp,
                flw_ref: pendingVerification.flw_ref,
                type: "card",
            };

            axios
                .post("https://api.flutterwave.com/v3/validate-charge", validate_data, {
                    headers: {
                        Authorization: `Bearer ${getEnv("FLUTTERWAVE_SECRET_KEY")}`,
                    },
                })
                .then(async(apiResponse) => {
                    await prisma.giveAwaysPendingPayment.delete({
                        where: { id: pendingVerification.id },
                    });

                    await prisma.giveAways.update({
                        where: { id: giveAway.id },
                        data: {
                            status: GiveAwaysStatus.ACTIVE,
                            payment_confirmed_at: now(),
                        },
                    });

                    return res.send(getSuccess("Payment Verified."));
                })
                .catch((apiError) => {
                    return res.status(400).send(getError(apiError.response.data));
                });
        } catch (err) {
            if (err && err.message) {
                return res.status(400).send(getError(err.message));
            }
            return res.status(400).send(getError(err));
        }
    }
);

router.get("/get_my_posts", [verifyToken, trimRequest.all],
    async(req, res) => {
        const user_id = req.user._id;
        try {
            const posts = await prisma.giveAways.findMany({
                where: {
                    user_id,
                    NOT: {
                        status: GiveAwaysStatus.PAYMENTPENDING,
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            user_name: true,
                            email: true,
                            phone: true,
                        },
                    },
                    comments: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    user_name: true,
                                    email: true,
                                    phone: true,
                                },
                            },
                            likes: true,
                            replies: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            user_name: true,
                                            email: true,
                                            phone: true,
                                        },
                                    },
                                    likes: true,
                                },
                            },
                        },
                    },
                    likes: true,
                },
                orderBy: {
                    updated_at: "desc",
                },
            });

            posts.forEach((post) => {
                post.time_left_to_end = timeLeftToEnd(post.end_date_time);
                post.showComments = false;
                const is_post_liked_by_me = post.likes.find(
                    (like) => like.user_id == user_id
                );
                if (is_post_liked_by_me) {
                    post.is_liked = true;
                } else {
                    post.is_liked = false;
                }
                const post_likes = post.likes.length;
                post.likes = 0;
                post.likes = post_likes;

                // give_away comments likes section
                post.comments.forEach((post_comment) => {
                    post_comment.showreplies = false;

                    const is_comment_liked_by_me = post_comment.likes.find(
                        (post_comment_like) => post_comment_like.user_id == user_id
                    );
                    if (is_comment_liked_by_me) post_comment.is_liked = true;
                    else post_comment.is_liked = false;

                    const post_comments_likes = post_comment.likes.length;
                    post_comment.likes = 0;
                    post_comment.likes = post_comments_likes;

                    // give_away comments replies likes section
                    post_comment.replies.forEach((post_comment_reply) => {
                        const is_comment_reply_liked_by_me = post_comment_reply.likes.find(
                            (post_comment_reply_like) =>
                            post_comment_reply_like.user_id == user_id
                        );
                        if (is_comment_reply_liked_by_me)
                            post_comment_reply.is_liked = true;
                        else post_comment_reply.is_liked = false;

                        const post_comments_replies_likes = post_comment_reply.likes.length;
                        post_comment_reply.likes = 0;
                        post_comment_reply.likes = post_comments_replies_likes;
                    });
                    // ////////////////////////////////////
                });
                // ////////////////////////////////////
            });

            return res.send(getSuccess({ posts }));
        } catch (err) {
            if (err && err.message) {
                return res.status(400).send(getError(err.message));
            }
            return res.status(400).send(getError(err));
        }
    }
);

router.get("/explore_posts", [AnonomousUser, trimRequest.all],
    async(req, res) => {
        const user_id = req.user._id;
        try {
            const latest_posts = await prisma.giveAways.findMany({
                where: {
                    NOT: {
                        status: GiveAwaysStatus.PAYMENTPENDING,
                    },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            user_name: true,
                            email: true,
                            phone: true,
                        },
                    },
                    comments: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    user_name: true,
                                    email: true,
                                    phone: true,
                                },
                            },
                            likes: true,
                            replies: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            user_name: true,
                                            email: true,
                                            phone: true,
                                        },
                                    },
                                    likes: true,
                                },
                            },
                        },
                    },
                    likes: true,
                },
                orderBy: {
                    updated_at: "desc",
                },
            });

            // give_away likes section
            latest_posts.forEach((post) => {
                console.log("post", {
                    "post.end_date_time": post.end_date_time,
                    "post.about": post.about,
                });
                post.time_left_to_end = timeLeftToEnd(post.end_date_time);
                post.showComments = false;

                const is_post_liked_by_me = post.likes.find(
                    (like) => like.user_id == user_id
                );
                if (is_post_liked_by_me) {
                    post.is_liked = true;
                } else {
                    post.is_liked = false;
                }
                const post_likes = post.likes.length;
                post.likes = 0;
                post.likes = post_likes;

                // give_away comments likes section
                post.comments.forEach((post_comment) => {
                    post_comment.showreplies = false;

                    const is_comment_liked_by_me = post_comment.likes.find(
                        (post_comment_like) => post_comment_like.user_id == user_id
                    );
                    if (is_comment_liked_by_me) post_comment.is_liked = true;
                    else post_comment.is_liked = false;

                    const post_comments_likes = post_comment.likes.length;
                    post_comment.likes = 0;
                    post_comment.likes = post_comments_likes;

                    // give_away comments replies likes section
                    post_comment.replies.forEach((post_comment_reply) => {
                        const is_comment_reply_liked_by_me = post_comment_reply.likes.find(
                            (post_comment_reply_like) =>
                            post_comment_reply_like.user_id == user_id
                        );
                        if (is_comment_reply_liked_by_me)
                            post_comment_reply.is_liked = true;
                        else post_comment_reply.is_liked = false;

                        const post_comments_replies_likes = post_comment_reply.likes.length;
                        post_comment_reply.likes = 0;
                        post_comment_reply.likes = post_comments_replies_likes;
                    });
                    // ////////////////////////////////////
                });
                // ////////////////////////////////////
            });
            // /////////////////////////////////////

            const trending_posts = [];

            return res.send(getSuccess({ latest_posts, trending_posts }));
        } catch (err) {
            if (err && err.message) {
                return res.status(400).send(getError(err.message));
            }
            return res.status(400).send(getError(err));
        }
    }
);

router.get("/get_home_posts", [verifyToken, trimRequest.all],
    async(req, res) => {
        const user_id = req.user._id;
        try {
            const user = await prisma.users.findFirst({
                where: {
                    id: user_id,
                },
                select: {
                    followings: {
                        where: {
                            status: FollowingApproval.APPROVED,
                        },
                        select: {
                            follower: {
                                select: {
                                    id: true,
                                    user_name: true,
                                    email: true,
                                    give_aways: {
                                        where: {
                                            NOT: [{
                                                status: GiveAwaysStatus.PAYMENTPENDING,
                                            }, ],
                                        },
                                        include: {
                                            user: {
                                                select: {
                                                    id: true,
                                                    name: true,
                                                    user_name: true,
                                                    email: true,
                                                    phone: true,
                                                },
                                            },
                                            comments: {
                                                include: {
                                                    user: {
                                                        select: {
                                                            id: true,
                                                            name: true,
                                                            user_name: true,
                                                            email: true,
                                                            phone: true,
                                                        },
                                                    },
                                                    likes: true,
                                                    replies: {
                                                        include: {
                                                            user: {
                                                                select: {
                                                                    id: true,
                                                                    name: true,
                                                                    user_name: true,
                                                                    email: true,
                                                                    phone: true,
                                                                },
                                                            },
                                                            likes: true,
                                                        },
                                                    },
                                                },
                                            },
                                            likes: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            const latest_posts = [];
            user && user.followings.forEach((following) => {
                following.follower && following.give_aways.forEach((giveAway) =>
                    latest_posts.push(giveAway)
                );
            });

            latest_posts.forEach((post) => {
                post.time_left_to_end = timeLeftToEnd(post.end_date_time);
                post.showComments = false;

                const is_post_liked_by_me = post.likes.find(
                    (like) => like.user_id == user_id
                );
                if (is_post_liked_by_me) {
                    post.is_liked = true;
                } else {
                    post.is_liked = false;
                }
                const post_likes = post.likes.length;
                post.likes = 0;
                post.likes = post_likes;

                // give_away comments likes section
                post.comments.forEach((post_comment) => {
                    post_comment.showreplies = false;

                    const is_comment_liked_by_me = post_comment.likes.find(
                        (post_comment_like) => post_comment_like.user_id == user_id
                    );
                    if (is_comment_liked_by_me) post_comment.is_liked = true;
                    else post_comment.is_liked = false;

                    const post_comments_likes = post_comment.likes.length;
                    post_comment.likes = 0;
                    post_comment.likes = post_comments_likes;

                    // give_away comments replies likes section
                    post_comment.replies.forEach((post_comment_reply) => {
                        const is_comment_reply_liked_by_me = post_comment_reply.likes.find(
                            (post_comment_reply_like) =>
                            post_comment_reply_like.user_id == user_id
                        );
                        if (is_comment_reply_liked_by_me)
                            post_comment_reply.is_liked = true;
                        else post_comment_reply.is_liked = false;

                        const post_comments_replies_likes = post_comment_reply.likes.length;
                        post_comment_reply.likes = 0;
                        post_comment_reply.likes = post_comments_replies_likes;
                    });
                    // ////////////////////////////////////
                });
                // ////////////////////////////////////
            });

            const posts = _.orderBy(latest_posts, ["payment_confirmed_at"], "desc");

            return res.send(getSuccess({ posts }));
        } catch (err) {
            if (err && err.message) {
                return res.status(400).send(getError(err.message));
            }
            return res.status(400).send(getError(err));
        }
    }
);

const ValidateEndDateTime = ({ end_date, end_time }) => {
    if (!date.isValid(end_time, "HH:mm:ss A", true)) {
        return getError("invalid Time");
    }

    const _1 = new Date(end_date + " " + end_time);
    const _2 = new Date();

    if (!(_1 > _2)) {
        return getError("end_time should be in future.");
    }

    const end_date_time = date.parse(
        end_date + " " + end_time,
        "YYYY-MM-DD HH:mm:ss A",
        true
    );
    if (isNaN(end_date_time)) {
        return getError("Invalid Date or Time");
    }

    console.log("_1:", _1);

    return _1;
};

function encrypt(key, text) {
    var forge = require("node-forge");
    var cipher = forge.cipher.createCipher(
        "3DES-ECB",
        forge.util.createBuffer(key)
    );
    cipher.start({ iv: "" });
    cipher.update(forge.util.createBuffer(text, "utf-8"));
    cipher.finish();
    var encrypted = cipher.output;
    return forge.util.encode64(encrypted.getBytes());
}

const timeLeftToEnd = (post_end_date_time) => {
    const today = new Date();
    const endingTime = new Date(post_end_date_time);

    // console.log({
    //   today: today,
    //   endingTime: endingTime,
    // });

    if (endingTime - today <= 0) return null;

    const { years, months, days, hours, minutes } = timediff(
        today,
        endingTime,
        "YMDHmS"
    );
    return years > 0 ?
        `${years} Years` :
        months > 0 ?
        `${months} Months` :
        days > 0 ?
        `${days} Days` :
        hours > 0 ?
        `${hours} Hours` :
        minutes > 0 ?
        `${minutes} Minutes` :
        null;
};

module.exports = router;