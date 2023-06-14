const router = require("express").Router();
const date = require("date-and-time");
const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");
const Socket = require('../Socket/Socket');
// const { postValidation } = require("./validate");
const { likeValidation, disLikeValidation, approveValidation, deleteRequestValidation } = require("./validate");
const { getError, getSuccess, sendError, sendSuccess } = require("../helpers");
const { LikeApproval, NotificationType, LogInApproval } = require("@prisma/client");
const { SendNotification } = require('../Notfications/notfication');

//

router.post("/like", trimRequest.all, async(req, res) => {
    // try {
        const { error, value } = likeValidation(req.body);
        if (error) return res.status(400).send(getError(error.details[0].message));
        const { firstname, lastname } = req.user
        const liker_id = req.user._id;
        const { liked_id, interest } = value;
        const isUserExist = await prisma.users.findFirst({
            where:{
                id:liked_id,
                is_registered:true,
            }
        })
        if (!isUserExist) {
            return res.status(400).send(getError("User does not exist"))
        }

        const isLiked = await prisma.likeProfile.findFirst({
            where: {
                OR: [{
                        liker_id,
                        liked_id
                    },
                    {
                        liker_id: liked_id,
                        liked_id: liker_id
                    }
                ]
            }
        });

        const isNotificationRequest = await prisma.notification.findFirst({
            where:{
                from_id:liker_id,
                to_id:liked_id,
                notification_type:NotificationType.REQUEST
            }
        })

        const isNotify = await prisma.users.findFirst({
            where: {
                id: liked_id,
                is_registered:true,
                show_notifications: true,
            }
        })

        // var likeUser
        if (!isLiked) {
            var likeUser = await prisma.likeProfile.create({
                data: {
                    liker_id,
                    liked_id,
                    interest,
                }
            });
                // [{
                //     from_id: liker_id,
                //     to_id: liked_id,
                //     notification_type: NotificationType.LIKE,
                //     request_id:likeUser.id
                // }, {
                //     from_id: liker_id,
                //     to_id: liked_id,
                //     notification_type: NotificationType.REQUEST,
                //     request_id:likeUser.id
                // }]
        }else {
            await prisma.likeProfile.update({
                where:{
                    id:isLiked.id
                },
                data: {
                    interest,
                    status: LikeApproval.APPROVED,
                }
            });

            await prisma.notification.create({
                data: {
                    from_id: liker_id,
                    to_id: liked_id,
                    notification_type: NotificationType.REQ_ACCEPT,
                    request_id:isLiked.id,
                }
            })
        }

        if(!isLiked){
        if (!isNotificationRequest) {
            await prisma.notification.create({
                data: {
                    from_id: liker_id,
                    to_id: liked_id,
                    notification_type: NotificationType.REQUEST,
                    request_id:likeUser?.id,
                }
            })
        }else{
            await prisma.notification.update({
                where:{
                    id:isNotificationRequest.id
                },
                data: {
                    from_id: liker_id,
                    to_id: liked_id,
                    notification_type: NotificationType.REQUEST,
                    request_id: likeUser?.id,
                    seen: false,
                    created_at: new Date()
                }
            })
        }
    }




        // const isNotificationLike = await prisma.notification.findFirst({
        //     where:{
        //         from_id:liker_id,
        //         to_id:liked_id,
        //         notification_type:NotificationType.LIKE
        //     }
        // })
        // if (isLiked) {
        //    const updat =  await prisma.likeProfile.update({
        //         where: {
        //             id: isLiked.id
        //         },
        //         data: {
        //             status: LikeApproval.APPROVED
        //         }
        //     })
        //     // await prisma.notification.update({
        //     //     where:{
        //     //         id:isNotificationLike.id,
        //     //     },
        //     //     data:{
        //     //         from_id: liker_id,
        //     //         to_id: liked_id,
        //     //         notification_type: NotificationType.LIKE,
        //     //         request_id:updat.id
        //     //     }
        //     // })
        //     await prisma.notification.update({
        //         where:{
        //             id:isNotificationRequest.id,
        //         },
        //         data:{
        //             from_id: liker_id,
        //             to_id: liked_id,
        //             notification_type: NotificationType.REQUEST,
        //             request_id:updat.id,
        //             seen:false,
        //         }
        //     })
        // }

        if (liked_id == liker_id) {
            return sendError(res, "Action not perform on same ID")
        }


        if (isNotify) {
            const isFcmToken = await prisma.users.findFirst({
                where: {
                    id: liked_id,
                },
                select: {
                    fcm_token: true,
                }
            })
            if (isFcmToken.fcm_token) {
                SendNotification(isFcmToken.fcm_token, {
                    "title": firstname + ' ' + lastname,
                    "body": "Sent you a friend request"
                }).then((res) => {
                    console.log(res, "done");
                }).catch((error) => {
                    console.log(error, "Error sending notification");
                })
            }
        }
        await Socket.likeProfile(liker_id, liked_id, true)
        return res.status(200).send(getSuccess("Profile successfully liked"));

        // const post = await prisma.giveAways.findFirst({
        //     where: {
        //         id: post_id,
        //     },
        //     include: {
        //         likes: {
        //             where: {
        //                 user_id,
        //             },
        //         },
        //     },
        // });

        // if (!post)
        //     return res.status(400).send(getError("Post does not exist or deleted"));

        // if (post && post.likes && post.likes.length > 0)
        //     return res.status(400).send(getError("You already liked this post"));

        // await prisma.giveAwayLikes.create({
        //     data: { user_id, give_away_id: post.id },
        // });

        // return res.status(200).send(getSuccess("Post successfully liked"));
    // } catch (err) {
    //     if (err && err.message) {
    //         return res.status(400).send(getError(err.message));
    //     }
    //     return res.status(400).send(getError(err));
    // }
});

router.post("/approve_request", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = approveValidation(req.body)
        if (error) {
            return res.status(400).send(getError(error.details[0].message))
        }
        const { firstname, lastname } = req.user;
        const liked_id = req.user._id
        const { liker_id } = value
        const isLiked = await prisma.likeProfile.findFirst({
            where: {
                liked_id,
                liker_id
            }
        })

        if (!isLiked) {
            return res.status(400).send(getError("Request does not exist"))
        }
        const isNotify = await prisma.users.findFirst({
            where: {
                id: liker_id,
                show_notifications: true,
            }
        })
        if (isLiked) {
            await prisma.likeProfile.update({
                where: {
                    id: isLiked.id
                },
                data: {
                    status: LikeApproval.APPROVED
                }
            })
        }
        const findNotify = await prisma.notification.findFirst({
            where:{
                from_id: liked_id,
                to_id:liker_id,
                notification_type: NotificationType.REQ_ACCEPT,
            }
        })
        if(!findNotify){
        const notify = await prisma.notification.create({
            data: {
                from_id: liked_id,
                to_id: liker_id,
                notification_type: NotificationType.REQ_ACCEPT,
                request_id:isLiked.id,
            }
        })
    }else{
         await prisma.notification.update({
            where:{
                id: findNotify.id,
            },
            data: {
                from_id: liked_id,
                to_id: liker_id,
                notification_type: NotificationType.REQ_ACCEPT,
                request_id:isLiked.id,
                seen: false,
                created_at: new Date()
            }
        })
    }
        if (isNotify) {
            const isFcmToken = await prisma.users.findFirst({
                where: {
                    id: liker_id,
                },
                select: {
                    fcm_token: true,
                }
            })
            if (isFcmToken.fcm_token) {
                SendNotification(isFcmToken.fcm_token, {
                    "title": firstname + ' ' + lastname,
                    "body": "Accept your friend request"
                }).then((res) => {
                    console.log(res, "done");
                }).catch((error) => {
                    console.log(error, "Error sending notification");
                })
            }
        }
        await Socket.friendRequest(liked_id, liker_id, true, "Request Accepted")
        return res.status(200).send(getSuccess("Request approved successfully"));
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message))
        }
        return res.status(404).send(getError(err))
    }
});

router.post("/delete_request", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = deleteRequestValidation(req.body)
        if (error) {
            return res.status(400).send(getError(error.details[0].message))
        }

        const liked_id = req.user._id
        const { liker_id } = value

        const isLiked = await prisma.likeProfile.findFirst({
            where: {
                liked_id,
                liker_id
            }
        })
        if (!isLiked) {
            return res.status(400).send(getError("Record does not exist"))
        }

        await prisma.notification.deleteMany({
            where:{
                id:isLiked.notification_id,
            }
        })

        await prisma.likeProfile.delete({
            where: {
                id: isLiked.id
            }
        })
        await Socket.friendRequest(liked_id, liker_id, false, "Request Not Accepted")
        return res.status(200).send(getSuccess("Request not accepted"))

    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

router.post("/dislike", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = disLikeValidation(req.body);
        if (error) return res.status(400).send(getError(error.details[0].message));

        const liker_id = req.user._id;
        const { liked_id } = value;

        const isLiked = await prisma.likeProfile.findFirst({
            where: {
                OR: [{
                        liker_id,
                        liked_id
                    },
                    {
                        liker_id: liked_id,
                        liked_id: liker_id
                    }
                ]
            }
        });
        if (!isLiked) {
            return res.status(400).send(getError("Record does not exist"))
        }
        const notifi = await prisma.notification.findFirst({
            where:{
                request_id:isLiked.id
            }
        })
        if (notifi) {
        await prisma.notification.deleteMany({
            where:{
                request_id:isLiked.id,
            }
        })
    }

        await prisma.likeProfile.delete({
            where: {
                id: isLiked.id
            }
        })

        await Socket.likeProfile(liker_id, liked_id, false)
        return res.status(200).send(getSuccess("Profile successfully dislike"))
            // const post = await prisma.giveAways.findFirst({
            //     where: {
            //         id: post_id,
            //     },
            //     include: {
            //         likes: {
            //             where: {
            //                 user_id,
            //             }
            //         },
            //     },
            // });

        // if (!post)
        //     return res.status(400).send(getError("Post does not exist or deleted"));

        // if (post && post.likes && post.likes.length <= 0)
        //     return res.status(400).send(getError("Only Liked posts can be disliked"));

        // await prisma.giveAwayLikes.delete({
        //     where: {
        //         user_give_away_like: {
        //             user_id,
        //             give_away_id: post_id,
        //         },
        //     },
        // });

        // return res.status(200).send(getSuccess("Post successfully disliked"));
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

router.get("/get_requests", async(req, res) => {
    try {
        const { id } = req.user;

        const userApproved = await prisma.users.findFirst({
            where:{
                id,
                is_registered:true,
                admin_approval:LogInApproval.APPROVED
            }
        })

        const my_requests = await prisma.users.findFirst({
            where: {
                id,
            },
            select: {
                my_profile_likes: {
                    where: {
                        status: LikeApproval.PENDING
                    },
                    select: {
                        liker: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                profile_picture_url: true,
                                show_profile_picture: true,
                                admin_approval: true,
                            }
                        }
                    }
                }
            }
        })
        const array = my_requests.my_profile_likes
        const likers = array.map((arr) => {
            if (!arr.liker.show_profile_picture) {
                arr.liker.profile_picture_url = null;
                delete arr.liker.show_profile_picture;
            }
            if (!userApproved) {
                arr.liker.profile_picture_url = null;
                arr.liker.is_approval = false;
            }else{
                arr.liker.is_approval = true;
            }

            if (userApproved) {
                const notApproved = array.filter((ary)=> ary.liker.admin_approval == "PENDING");
                notApproved.forEach((arry)=>{
                    if (arry.liker.admin_approval=="PENDING") {
                        arry.liker.profile_picture_url = null;
                        arry.liker.is_approval = false;
                    }else{
                        arry.liker.is_approval = true;
                    }
                })
            }
            const obj = arr.liker
            return obj
        })
        return sendSuccess(res, likers)
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message)
        }
        return sendError(res, catchError)
    }
});

router.get("/get_friends", async(req, res) => {
    try {
        const { id } = req.user;

        const userApproved = await prisma.users.findFirst({
            where:{
                id,
                is_registered:true,
                admin_approval:LogInApproval.APPROVED
            }
        })

        const my_friends = await prisma.users.findFirst({
            where: {
                id,
            },
            select: {
                my_liked_profiles: {
                    where: {
                        status: LikeApproval.APPROVED
                    },
                    select: {
                        liked: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                gender: true,
                                profile_picture_url: true,
                                show_profile_picture: true,
                                admin_approval: true,
                                user_i_block: {
                                    where:{
                                        blocked_id: id,
                                    }
                                },
                                user_blocked_me:{
                                    where:{
                                        blocker_id: id,
                                    }
                                },
                                primary_user_channels: {
                                    where: {
                                        to_id: id,
                                    },
                                },
                                secondary_user_channels: {
                                    where: {
                                        from_id: id,
                                    },
                                },
                                senders_messages:{
                                    where:{
                                        OR:[{
                                            from_id: id,
                                        },{
                                            to_id: id,
                                        }]
                                    }
                                },
                                receivers_messages:{
                                    where:{
                                        OR:[{
                                            from_id: id,
                                        },{
                                            to_id: id,
                                        }]
                                    }
                                },
                            }
                        }
                    }
                },
                my_profile_likes: {
                    where: {
                        status: LikeApproval.APPROVED
                    },
                    select: {
                        liker: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                profile_picture_url: true,
                                show_profile_picture: true,
                                admin_approval: true,
                                user_i_block: {
                                    where:{
                                        blocked_id: id,
                                    }
                                },
                                user_blocked_me:{
                                    where:{
                                        blocker_id: id,
                                    }
                                },
                                primary_user_channels: {
                                    where: {
                                        to_id: id,
                                    },
                                },
                                secondary_user_channels: {
                                    where: {
                                        from_id: id,
                                    },
                                },
                                senders_messages:{
                                    where:{
                                        OR:[{
                                            from_id: id,
                                        },{
                                            to_id: id,
                                        }]
                                    }
                                },
                                receivers_messages:{
                                    where:{
                                        OR:[{
                                            from_id: id,
                                        },{
                                            to_id: id,
                                        }]
                                    }
                                },
                            }
                        }
                    }
                }
            }
        })
        const first = my_friends.my_liked_profiles
        const iLiked = first.map((arr) => {
            if (!arr.liked.show_profile_picture) {
                arr.liked.profile_picture_url = null;
                delete arr.liked.show_profile_picture;
            }
            if (!userApproved) {
                arr.liked.profile_picture_url = null;
                arr.liked.is_approval = false;
            }else{
                arr.liked.is_approval = true;
            }

            if (userApproved) {
                const notApproved = first.filter((ary)=> ary.liked.admin_approval == "PENDING");
                notApproved.forEach((arry)=>{
                    if (arry.liked.admin_approval=="PENDING") {
                        arry.liked.profile_picture_url = null;
                        arry.liked.is_approval = false;
                    }else{
                        arry.liked.is_approval = true;
                    }
                })
            }

            if (arr.liked.user_i_block.length > 0) {
                arr.liked.is_i_block = true;
            }else{
                arr.liked.is_i_block = false;
            }
            delete arr.liked.user_i_block;

            if (arr.liked.user_blocked_me.length > 0) {
                arr.liked.is_block_me = true;
            }else{
                arr.liked.is_block_me= false;
            }
            delete arr.liked.user_blocked_me

            if (arr.liked.primary_user_channels.length > 0 || arr.liked.secondary_user_channels.length > 0) {
                arr.liked.is_chat = true;
            }else{
                arr.liked.is_chat = false;
            }
            delete arr.liked.primary_user_channels;
            delete arr.liked.secondary_user_channels;

            if (arr.liked.senders_messages.length > 0 && arr.liked.receivers_messages.length > 0) {
                arr.liked.is_chat_start = true;
            }else{
                arr.liked.is_chat_start = false;
            }
            delete arr.liked.senders_messages;
            delete arr.liked.receivers_messages;

            const obj = arr.liked
            return obj
        })
        const second = my_friends.my_profile_likes
        const myLikes = second.map((arr) => {
            if (!arr.liker.show_profile_picture) {
                arr.liker.profile_picture_url = null;
                delete arr.liker.show_profile_picture;
            }
            if (!userApproved) {
                arr.liker.profile_picture_url = null;
                arr.liker.is_approval = false;
            }else{
                arr.liker.is_approval = true;
            }

            if (userApproved) {
                const notApproved = second.filter((ary)=> ary.liker.admin_approval == "PENDING");
                notApproved.forEach((arry)=>{
                    if (arry.liker.admin_approval=="PENDING") {
                        arry.liker.profile_picture_url = null;
                        arry.liker.is_approval = false;
                    }else{
                        arry.liker.is_approval = true;
                    }
                })
            }

            if (arr.liker.user_i_block.length > 0) {
                arr.liker.is_i_block = true;
            }else{
                arr.liker.is_i_block = false;
            }
            delete arr.liker.user_i_block;

            if (arr.liker.user_blocked_me.length > 0) {
                arr.liker.is_block_me = true;
            }else{
                arr.liker.is_block_me= false;
            }
            delete arr.liker.user_blocked_me;

            if (arr.liker.primary_user_channels.length > 0 || arr.liker.secondary_user_channels.length > 0) {
                arr.liker.is_chat = true;
            }else{
                arr.liker.is_chat = false;
            }
            delete arr.liker.primary_user_channels;
            delete arr.liker.secondary_user_channels;

            if (arr.liker.senders_messages.length > 0 && arr.liker.receivers_messages.length > 0) {
                arr.liker.is_chat_start = true;
            }else{
                arr.liker.is_chat_start = false;
            }
            delete arr.liker.senders_messages;
            delete arr.liker.receivers_messages;


            const objt = arr.liker;
            return objt
        })
        const friends = [...iLiked, ...myLikes]
        return sendSuccess(res, friends)
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message)
        }
        return sendError(res, catchError)
    }
});

module.exports = router;