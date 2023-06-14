const router = require("express").Router();
const date = require("date-and-time");
const { FollowingApproval } = require("@prisma/client");
const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");

const { userProfileValidation } = require("./validate");
const { getError, getSuccess } = require("../helpers");

//

router.post("/follow", trimRequest.all, async(req, res) => {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    const my_id = req.user._id;
    const { user_id } = value;

    if (my_id == user_id) {
        return res.status(400).send(getError("You cannot follow or unfollow yourself."))
    }

    // if (my_id == user_id)
    //     return res
    //         .status(400)
    //         .send(getError("You cannot follow or unfollow yourself."));

    try {
        const user = await prisma.users.findFirst({
            where: {
                id: user_id,
            },
            select: {
                is_public: true,
                followers: {
                    where: {
                        follower_id: my_id,
                    },
                },
            },
        });

        if (!user)
            return res.status(400).send(getError("user does not exist or deleted"));

        if (user.followers.length > 0) {
            const follower = user.followers[0];
            if (follower.status == FollowingApproval.APPROVED)
                return res
                    .status(400)
                    .send(getError("You already following this user"));
            else return res.status(400).send(getError("Your request is pending."));
        }
        if (user.is_public == false) {
            await prisma.followRequests.create({
                data: {
                    follower_id: my_id,
                    following_id: user_id,
                    status: FollowingApproval.PENDING,
                },
            });

            const request_status = await getCurrentFollowUnfollowStatus(
                my_id,
                user_id
            );
            console.log(request_status);
            return res.status(200).send(
                getSuccess({
                    message: "Request sent to user, wait for his approval.",
                    request_status,
                })
            );
        }

        await prisma.followRequests.create({
            data: {
                follower_id: my_id,
                following_id: user_id,
                status: FollowingApproval.APPROVED,
            },
        });
        const request_status = await getCurrentFollowUnfollowStatus(my_id, user_id);
        return res.status(200).send(
            getSuccess({
                message: "You are now following this user.",
                request_status,
            })
        );
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

router.post("/accept_follow_request", trimRequest.all, async(req, res) => {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    const my_id = req.user._id;
    const { user_id } = value;

    if (my_id == user_id)
        return res
            .status(400)
            .send(getError("You cannot follow or unfollow yourself."));

    try {
        const user = await prisma.users.findFirst({
            where: {
                id: user_id,
            },
            select: {
                is_public: true,
                followings: {
                    where: {
                        following_id: my_id,
                    },
                },
            },
        });

        if (!user)
            return res.status(400).send(getError("user does not exist or deleted"));

        if (user.followings.length > 0) {
            const following = user.followings[0];
            if (following.status == FollowingApproval.APPROVED)
                return res.status(400).send(getError("Request already accepted."));
            else {
                await prisma.followRequests.update({
                    where: {
                        id: following.id,
                    },
                    data: {
                        status: FollowingApproval.APPROVED,
                    },
                });
                const request_status = await getCurrentFollowUnfollowStatus(
                    my_id,
                    user_id
                );
                return res.status(200).send(
                    getSuccess({
                        message: "Request accepted.",
                        request_status,
                    })
                );
            }
        }

        return res.status(400).send(getError("Invalid request approval."));
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

router.post("/decline_follow_request", trimRequest.all, async(req, res) => {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    const my_id = req.user._id;
    const { user_id } = value;

    if (my_id == user_id)
        return res
            .status(400)
            .send(getError("You cannot follow or unfollow yourself."));

    try {
        const user = await prisma.users.findFirst({
            where: {
                id: user_id,
            },
            select: {
                is_public: true,
                followings: {
                    where: {
                        following_id: my_id,
                    },
                },
            },
        });

        if (!user)
            return res.status(400).send(getError("user does not exist or deleted"));

        if (user.followings.length > 0) {
            await prisma.followRequests.delete({
                where: { id: user.followings[0].id },
            });
            const request_status = await getCurrentFollowUnfollowStatus(
                my_id,
                user_id
            );
            return res.status(200).send(
                getSuccess({
                    message: "Request declined.",
                    request_status,
                })
            );
        }

        return res.status(400).send(getError("Invalid request decline."));
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

router.post("/unfollow", trimRequest.all, async(req, res) => {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    const my_id = req.user._id;
    const { user_id } = value;

    if (my_id == user_id)
        return res
            .status(400)
            .send(getError("You cannot follow unfollow yourself."));

    try {
        const user = await prisma.users.findFirst({
            where: {
                id: user_id,
            },
            select: {
                is_public: true,
                followers: {
                    where: {
                        follower_id: my_id,
                    },
                },
            },
        });

        if (!user)
            return res.status(400).send(getError("user does not exist or deleted"));

        if (user.followers.length <= 0)
            return res
                .status(400)
                .send(
                    getError(
                        "You cannot unfollow this user, because you are not following yet."
                    )
                );

        await prisma.followRequests.delete({
            where: { id: user.followers[0].id },
        });
        const request_status = await getCurrentFollowUnfollowStatus(my_id, user_id);

        return res.status(200).send(
            getSuccess({
                message: "Request declined.",
                request_status,
            })
        );
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

const getCurrentFollowUnfollowStatus = async(my_id, user_id) => {
    const user = await prisma.users.findFirst({
        where: {
            id: user_id,
        },
        select: {
            followers: {
                where: {
                    following_id: user_id,
                },
            },
            followings: {
                where: {
                    follower_id: user_id,
                },
            },
        },
    });

    let hisAndMyFollowRelation = user.followers.find(
        (follower) => follower.follower_id == my_id
    );

    if (!hisAndMyFollowRelation) {
        hisAndMyFollowRelation = user.followings.find(
            (follower) => follower.following_id == my_id
        );
        if (!hisAndMyFollowRelation) {
            user.his_and_my_follow_relation = null;
        } else {
            user.his_and_my_follow_relation = {
                type: 2,
                status: hisAndMyFollowRelation.status,
            };
        }
    } else {
        user.his_and_my_follow_relation = {
            type: 1,
            status: hisAndMyFollowRelation.status,
        };
    }

    return user.his_and_my_follow_relation;
};

module.exports = router;