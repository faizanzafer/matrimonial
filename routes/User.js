const router = require("express").Router();
const trimRequest = require("trim-request");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const fs = require("fs");
const { functions, map } = require("lodash");
const { array } = require("joi");

// const path = require("path");
const {
    FollowingApproval,
    GiveAwaysStatus,
    NotificationType,
    LogInApproval,
} = require("@prisma/client");
const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

const Socket = require("../Socket/Socket");

const uploadUserFile = require("../middlewares/FileMulter");
const { uploadFile, deleteFile } = require("../S3_BUCKET/S3-bucket");

const preferencesCheck = require("../middlewares/PreferencesMiddleware");
const { getEnv } = require("../config");
const {
    userProfileValidation,
    prefrencesValidation,
    changePasswordValidation,
    feedBackValidation,
    updatProfileValidation,
    fcmTokenValidation,
    blockProfileValidation,
    requestPicturesValidation,
    acceptRequestPicturesValidation,
    deletePictureValidation,
} = require("./validate");
const {
    getError,
    getSuccess,
    sendError,
    sendSuccess,
    getDistanceFromLatLonInKm,
    createToken,
} = require("../helpers");

const { SendNotification } = require("../Notfications/notfication");
const { getUserNotifications } = require("../database_queries/Auth");
const { getUsersChannel } = require("../database_queries/Chat");
// const { Socket } = require("dgram");

//
router.get("/discover_people", async(req, res) => {
    try {
        const {
            _id: my_id,
            longitude: my_longitude,
            latitude: my_latitude,
            my_prefrences,
            gender,
        } = req.user;

        // const isReqExist = await prisma.requestPictures.findFirst({
        //     where: {
        //         first_user_id: my_id,
        //         second_user_id: user_id,
        //     },
        // });

        const userApproved = await prisma.users.findFirst({
            where:{
                id:my_id,
                is_registered:true,
                admin_approval:LogInApproval.APPROVED
            }
        })

        const userIBlocke = await prisma.blockProfile.findFirst({
            where:{
                blocker_id: my_id,
            }
        })

        const userBlockedMe = await prisma.blockProfile.findFirst({
            where:{
                blocked_id: my_id,
            }
        })

        // const preferences = JSON.parse(my_prefrences.preferences);

        const users = await prisma.users.findMany({
            where: {
                NOT: [{
                        id: my_id,
                    },
                    {
                        gender,
                    },
                    {
                        user_blocked_me: {
                            some: {
                                blocker_id: my_id,
                            },
                        },
                    },
                    {
                        user_i_block: {
                            some: {
                                blocked_id: my_id,
                            },
                        },
                    },
                ],
                is_registered: true,
                admin_approval: LogInApproval.APPROVED,
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                gender: true,
                age: true,
                description: true,
                profession: true,
                user_name: true,
                profile_picture_url: true,
                show_profile_picture: true,
                online_status: true,
                online_status_updated_at: true,
                longitude: true,
                latitude: true,
                admin_approval: true,
                user_i_block: {
                    where:{
                        blocked_id: my_id,
                    }
                },
                user_blocked_me:{
                    where:{
                        blocker_id:my_id,
                    }
                },
                my_profile_likes: {
                    where: {
                        liker_id: my_id,
                    },
                },
                my_liked_profiles:{
                    where:{
                        liked_id: my_id,
                    }
                },
                primary_user_channels: {
                    where: {
                        to_id: my_id,
                        // OR: [{
                        //         from_id: my_id,
                        //     },
                        //     {
                        //         to_id: my_id,
                        //     }
                        // ]
                    },
                },
                secondary_user_channels: {
                    where: {
                        from_id: my_id,
                        // OR: [{
                        //         from_id: my_id,
                        //     },
                        //     {
                        //         to_id: my_id,
                        //     }
                        // ]
                    },
                },
                senders_messages:{
                    where:{
                        OR:[{
                            from_id:my_id,
                        },{
                            to_id:my_id
                        }]
                    }
                },
                receivers_messages:{
                    where:{
                        OR:[{
                            from_id:my_id,
                        },{
                            to_id:my_id,
                        }]
                    }
                },
            },
            orderBy: [{
                    online_status: "asc",
                },
                {
                    online_status_updated_at: "desc",
                },
            ],
        });
        // console.log(users.length);
        users.forEach((user) => {
            if (user.latitude && user.longitude){
                user.distance = getDistanceFromLatLonInKm(
                    user.latitude,
                    user.longitude,
                    my_latitude,
                    my_longitude
                );
            }

            if (!user.show_profile_picture) {
                user.profile_picture_url = null;
                delete user.show_profile_picture;
            }

            if (user.my_profile_likes.length > 0)
            user.is_liked = true;
            else user.is_liked = false;
            delete user.my_profile_likes;

            if (user.primary_user_channels.length > 0 || user.secondary_user_channels.length > 0)
            user.is_chat = true;
            else user.is_chat = false;
            delete user.primary_user_channels;
            delete user.secondary_user_channels;

            // if(!isReqExist){
        if (user.senders_messages.length > 0 && user.receivers_messages?.length > 0){
            user.is_chat_start = true;
        }else {
            user.is_chat_start = false;
        }
        delete user.senders_messages;
        delete user.receivers_messages;
        // }

            if (!userApproved) {
                user.profile_picture_url = null;
                user.is_approval = false;
                }else{
                user.is_approval = true;
            }

            if (userApproved) {
            const notApproved = users.filter((arr)=> arr.admin_approval == "PENDING");
            notApproved.forEach((ary)=>{
                if (ary.admin_approval=="PENDING") {
                    ary.profile_picture_url = null;
                    ary.is_approval = false;
                }else{
                    ary.is_approval = true;
                }
            })
        }

        if (user.user_i_block.length > 0) {
            user.is_i_block = true;
        }else{
            user.is_i_block = false;
        }
        delete user.user_i_block;

        if (user.user_blocked_me.length>0) {
            user.is_block_me = true;
        }else{
            user.is_block_me = false;
        }
        delete user.user_blocked_me;
            // if (user.admin_approval == "PENDING") {
            //     user.profile_picture_url = null;
            //     user.is_approval = false;
            // }else{
            //     user.is_approval = true;
            // }
        });

        const notifications = await getUserNotifications(my_id);
        // console.log(notifications.length);
        users.forEach((user) => {

        });
        const sorted_users = _.orderBy(
            users, ["distance", "online_status"], ["asc", "desc"]
        );

        return res.send(
            getSuccess({
                sorted_users,
                notification_count: notifications.length,
            })
        );
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.get("/my_matches", async(req, res) => {
    try {
        const {
            _id: my_id,
            longitude: my_longitude,
            latitude: my_latitude,
            gender,
            // my_prefrences,
        } = req.user;

        let user = req.user;

        const my_prefrences = await prisma.userPreferences.findFirst({
            where: {
                user_id: my_id,
            },
        });

        const userApproved = await prisma.users.findFirst({
            where:{
                id:my_id,
                is_registered:true,
                admin_approval:LogInApproval.APPROVED
            }
        })

        const preferences = my_prefrences?.preferences?JSON.parse(my_prefrences.preferences):null;
        const users = await prisma.users.findMany({
            where: {
                NOT: [{
                        id: my_id,
                    },
                    {
                        gender,
                    },
                    {
                        user_blocked_me: {
                            some: {
                                blocker_id: my_id,
                            },
                        },
                    },
                    {
                        user_i_block: {
                            some: {
                                blocked_id: my_id,
                            },
                        },
                    },
                ],
                OR: [{
                        country: preferences?.country??user?.country??null,
                        religion: preferences?.religion??user?.religion??null,
                        profession: preferences?.profession??user?.profession??null,
                        status: preferences?.status??user?.status??null,
                    },
                    {
                        gender: preferences?.gender??user?.gender??null,
                    },
                    {
                        ziodic_sign: preferences?.ziodic_sign??user?.ziodic_sign??null,
                    },
                    {
                        body_type: preferences?.body_type??user?.body_type??null,
                    },
                    {
                        height: {
                            lte: preferences?.height + 1?preferences.height + 1:user?.height + 1?user.height + 1:undefined,
                            gte: preferences?.height - 1?preferences.height - 1:user?.height - 1?user.height - 1:undefined,
                        },
                    },
                ],
                is_registered: true,
                admin_approval: LogInApproval.APPROVED,
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                gender: true,
                age: true,
                description: true,
                profession: true,
                user_name: true,
                profile_picture_url: true,
                show_profile_picture: true,
                online_status: true,
                online_status_updated_at: true,
                longitude: true,
                latitude: true,
                admin_approval:true,
                user_i_block:{
                    where:{
                        blocked_id: my_id
                    }
                },
                user_blocked_me:{
                    where:{
                        blocker_id: my_id,
                    }
                },
                my_profile_likes: {
                    where: {
                        liker_id: my_id,
                    },
                },
                my_liked_profiles:{
                    where:{
                        liked_id: my_id,
                    }
                },
                primary_user_channels: {
                    where: {
                        to_id: my_id,
                        // OR: [{
                        //         from_id: my_id,
                        //     },
                        //     {
                        //         to_id: my_id,
                        //     }
                        // ]
                    },
                },
                secondary_user_channels: {
                    where: {
                        from_id: my_id,
                        // OR: [{
                        //         from_id: my_id,
                        //     },
                        //     {
                        //         to_id: my_id,
                        //     }
                        // ]
                    },
                },
                senders_messages:{
                    where:{
                        OR:[{
                            from_id:my_id,
                        },{
                            to_id:my_id,
                        }]
                    }
                },
                receivers_messages:{
                    where:{
                        OR:[{
                            from_id: my_id,
                        },{
                            to_id:my_id,
                        }]
                    }
                }
            },
            orderBy: [{
                    online_status: "asc",
                },
                {
                    online_status_updated_at: "desc",
                },
            ],
        });
        // console.log("users", preferences?.country?preferences.country:user.country?user.country:null);
        // console.log("users", preferences?.country??user?.country??null);

        users.forEach((user) => {
            if (user.latitude && user.longitude)
                user.distance = getDistanceFromLatLonInKm(
                    user.latitude,
                    user.longitude,
                    my_latitude,
                    my_longitude
                );

            if (user.my_profile_likes.length > 0) user.is_liked = true;
            else user.is_liked = false;
            delete user.my_profile_likes;

            if (user.primary_user_channels.length > 0 || user.secondary_user_channels.length > 0)
                user.is_chat = true;
            else user.is_chat = false;
            delete user.primary_user_channels;
            delete user.secondary_user_channels;

        if (user.senders_messages.length > 0 && user.receivers_messages.length > 0){
            user.is_chat_start = true;
        }else {
            user.is_chat_start = false;
        }
        delete user.senders_messages;
        delete user.receivers_messages;

            if (!user.show_profile_picture) {
                user.profile_picture_url = null;
                delete user.show_profile_picture;
            }

            if (!userApproved) {
                user.profile_picture_url = null;
                user.is_approval = false;
            }else{
                user.is_approval = true;
            }

            if (userApproved) {
                const notApproved = users.filter((arr)=> arr.admin_approval == "PENDING");
                notApproved.forEach((ary)=>{
                    if (ary.admin_approval=="PENDING") {
                        ary.profile_picture_url = null;
                        ary.is_approval = false;
                    }else{
                        ary.is_approval = true;
                    }
                })
            }

            if (user.user_i_block.length > 0) {
                user.is_i_block = true;
            }else{
                user.is_i_block = false;
            }
            delete user.user_i_block;

            if (user.user_blocked_me.length>0) {
                user.is_block_me = true;
            }else{
                user.is_block_me = false;
            }
            delete user.user_blocked_me
        });

        const sorted_users = _.orderBy(
            users, ["distance", "online_status"], ["asc", "desc"]
        );

        return res.send(getSuccess(sorted_users));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/user_profile", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = userProfileValidation(req.body);
        if (error) {
            return res.status(400).send(getError(error.details[0].message));
        }
        const { id, firstname, lastname, longitude, latitude } = req.user;
        const { user_id } = value;

        const isExist = await prisma.requestPictures.findFirst({
            where: {
                first_user_id: id,
                second_user_id: user_id,
                // permissions: true,
            },
        });

        const userApproved = await prisma.users.findFirst({
            where:{
                id,
                is_registered:true,
                admin_approval:LogInApproval.APPROVED
            }
        })

        const user = await prisma.users.findFirst({
            where: {
                id: user_id,
                is_registered:true,
                admin_approval:LogInApproval.APPROVED,
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                profile_picture_url: true,
                gender: true,
                age: true,
                ziodic_sign: true,
                country: true,
                city: true,
                phone: true,
                education: true,
                height: true,
                status: true,
                religion: true,
                body_type: true,
                profession: true,
                description: true,
                online_status: true,
                online_status_updated_at: true,
                show_profile_picture: true,
                show_private_picture: true,
                show_phone_number: true,
                admin_approval:true,
                user_i_block:{
                    where:{
                        blocked_id: id,
                    }
                },
                user_blocked_me:{
                    where:{
                        blocker_id: id,
                    }
                },
                gallery: {
                    select: {
                        picture_url: true,
                    },
                    orderBy: {
                        updated_at: "desc",
                    },
                },
                longitude: true,
                latitude: true,
                my_profile_likes: {
                    where: {
                        liker_id: id,
                    },
                },
                my_liked_profiles:{
                    where:{
                        liked_id: id,
                    }
                },
            },
        });
        if (!user) {
            return res.status(400).send(getError("User dose not exist"));
        }

        if (user_id == id) {
            return res.status(400).send(getError("Action not perform on same ID"));
        }

        if (user.latitude && user.longitude)
            user.distance = getDistanceFromLatLonInKm(
                user.latitude,
                user.longitude,
                latitude,
                longitude
            );

        if (user.my_profile_likes.length > 0) {
            user.is_liked = true;
            delete user.my_profile_likes;
        } else {
            user.is_liked = false;
            delete user.my_profile_likes;
        }


        if (!isExist) {
            if (!user.show_private_picture) {
                user.gallery = [];
                delete user.show_private_picture;
            }
        }
        if (isExist && isExist.permissions == false) {
            if (!user.show_private_picture) {
                user.gallery = [];
                // user.gallery.splice(1, 2, 3, 4, 5)
                // delete user.show_profile_picture;
                delete user.show_private_picture;
            }
            // } else {
            //     if (user.show_profile_picture) {
            //         user.gallery.splice(1, user.gallery.length - 1);
            //         // user.gallery.splice(1, 2, 3, 4, 5)
            //     }
            // }
        }
        // console.log(isExist);

        if (user.gallery.length > 0) {
            user.is_gallry = true;
        }else{
            user.is_gallry = false;
        }



        if (!user.show_profile_picture) {
            user.profile_picture_url = null;
            delete user.show_profile_picture;
        }

        if (!userApproved ) {
            user.profile_picture_url = null;
            user.is_approval = false;
        }else{
            user.is_approval = true;
        }

        if (userApproved) {
            if (user.admin_approval == "PENDING") {
                user.profile_picture_url = null;
                user.is_approval = false;
            }else{
                user.is_approval = true;
            }
        }

        if (user.user_i_block.length > 0) {
            user.is_i_block = true;
        }else{
            user.is_i_block = false;
        }
        delete user.user_i_block;

        if (user.user_blocked_me.length > 0) {
            user.is_block_me = true;
        }else{
            user.is_block_me = false;
        }
        delete user.user_blocked_me

        let isChanelExist = await getUsersChannel(id, user_id);
        if (isChanelExist) {
            user.is_chat=true;
        }else{
            user.is_chat=false;
        }

        // if (isExist) {
        const chanelMessageExist = await prisma.channelMessages.findMany({
            where: {
                users_channels_id: isChanelExist?.id,
                // channel_id: isExist.id,
                // channel_messages: {
                //     every: {
                //         from_id: id,
                //     }
                // }
            },
        })
        // console.log(user.show_private_picture==false && !isChanelExist);
        if (!user.show_private_picture && isChanelExist) {
        if (chanelMessageExist) {
            let any = chanelMessageExist.find(user => user.from_id == id)
            if (any) {
                let any1 = chanelMessageExist.find(user1=>user1.from_id == user_id)
                if (any1) {
                    user.is_chat_start = true;
                }else{
                    user.is_chat_start=false;
                }
            }else{
                user.is_chat_start=false;
            }
        }else{
            user.is_chat_start=false;
        }
    }else{
        user.is_chat_start=false;
    }
    if (isExist) {
        if (isExist.permissions == true) {
            user.is_permission = true;
            user.is_chat_start = false;
        } else {
            user.is_permission = false;
        }
    }

        const isNotifi = await prisma.notification.findFirst({
            where: {
                from_id: id,
                to_id: user_id,
                notification_type: NotificationType.VISIT,
            },
        });
        if (!isNotifi) {
            await prisma.notification.create({
                data: {
                    from_id: id,
                    to_id: user_id,
                    notification_type: NotificationType.VISIT,
                },
            });
        }
        //     await prisma.notification.update({
        //         where: {
        //             id: isNotifi.id,
        //         },
        //         data: {
        //             from_id: id,
        //             to_id: user_id,
        //             notification_type: NotificationType.VISIT,
        //             seen:false,
        //             created_at: new Date()
        //         },
        //     });
        // } else {
        //     await prisma.notification.create({
        //         data: {
        //             from_id: id,
        //             to_id: user_id,
        //             notification_type: NotificationType.VISIT,
        //         },
        //     });
        // }
        const isNotify = await prisma.users.findFirst({
            where: {
                id: user_id,
                is_registered:true,
                show_notifications: true,
            }
        })
if (isNotify) {
            const isFcmToken = await prisma.users.findFirst({
                where: {
                    id: user_id,
                },
                select: {
                    fcm_token: true,
                }
            })
            if (isFcmToken.fcm_token) {
                SendNotification(isFcmToken.fcm_token, {
                    "title": firstname + ' ' + lastname,
                    "body": "Visit your profile"
                }).then((res) => {
                    console.log(res, "done");
                }).catch((error) => {
                    console.log(error, "Error sending notification");
                })
            }
        }
        Socket.visitProfile(id,user_id,user,true)
        return res.send(getSuccess(user));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.get("/get_my_profile", async(req, res) => {
    try {
        const { id } = req.user;
        const my_profile = await prisma.users.findFirst({
            where: {
                id,
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                user_name: true,
                profile_picture_url: true,
                age: true,
                gender: true,
                body_type: true,
                description: true,
                country: true,
                religion: true,
                ziodic_sign: true,
                city: true,
                education: true,
                profession: true,
                status: true,
                height: true,
                phone: true,
                show_profile_picture: true,
                show_private_picture: true,
                show_phone_number: true,
                show_notifications: true,
                is_social_login: true,
                social_auth_provider: true,
                other_user_request: {
                    select: {
                        permissions: true,
                    },
                },
                gallery: {
                    select: {
                        id: true,
                        picture_url: true,
                    },
                    orderBy: {
                        updated_at: "desc",
                    },
                },
            },
        });
        return res.send(getSuccess(my_profile));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/user/user_profile", trimRequest.all, async(req, res) => {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    const my_id = req.user._id;
    const { user_id } = value;

    try {
        const user = await prisma.users.findFirst({
            where: {
                id: user_id,
            },
            select: {
                id: true,
                name: true,
                user_name: true,
                email: true,
                phone: true,
            },
        });

        if (!user) return res.status(400).send(getError("User do not exist."));

        // //

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

        // //

        user.followers = user.followers.filter(
            (follower) => follower.status == FollowingApproval.APPROVED
        ).length;
        user.followings = user.followings.filter(
            (following) => following.status == FollowingApproval.APPROVED
        ).length;

        ////////////////////////////////
        user.total_give_aways = 0;

        user.give_aways.forEach((post) => {
            user.total_give_aways += post.total_cost;

            const is_post_liked_by_me = post.likes.find(
                (like) => like.user_id == my_id
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
                const is_comment_liked_by_me = post_comment.likes.find(
                    (post_comment_like) => post_comment_like.user_id == my_id
                );
                if (is_comment_liked_by_me) post_comment.is_liked = true;
                else post_comment.is_liked = false;

                const post_comments_likes = post_comment.likes.length;
                post_comment.likes = 0;
                post_comment.likes = post_comments_likes;

                // give_away comments replies likes section
                post_comment.replies.forEach(
                    (post_comment_reply, post_comment_reply_index) => {
                        const is_comment_reply_liked_by_me = post_comment_reply.likes.find(
                            (post_comment_reply_like) =>
                            post_comment_reply_like.user_id == my_id
                        );
                        if (is_comment_reply_liked_by_me)
                            post_comment_reply.is_liked = true;
                        else post_comment_reply.is_liked = false;

                        const post_comments_replies_likes = post_comment_reply.likes.length;
                        post_comment_reply.likes = 0;
                        post_comment_reply.likes = post_comments_replies_likes;
                    }
                );
                // ////////////////////////////////////
            });
            // ////////////////////////////////////
        });

        return res.status(200).send(getSuccess(user));
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

router.post("/followers", trimRequest.all, async(req, res) => {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    const my_id = req.user._id;
    const { user_id } = value;

    try {
        const user = await prisma.users.findFirst({
            where: {
                id: user_id,
            },
            select: {
                id: true,
                is_public: true,
                followers: {
                    where: {
                        status: FollowingApproval.APPROVED,
                    },
                    select: {
                        following: {
                            select: {
                                id: true,
                                user_name: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) return res.status(400).send(getError("User do not exist."));

        const followers = [];
        user.followers.forEach((follower) => followers.push(follower.following));
        delete user.followers;
        user.followers = followers;

        if (user_id != my_id) {
            const iAmFollower = user.followers.find((_) => _.id == my_id);

            if (user.is_public == true && !iAmFollower)
                return res.status(400).send(getError("Users profile is private."));
        }

        delete user.is_public;

        return res.status(200).send(getSuccess(user));
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

router.post("/followings", trimRequest.all, async(req, res) => {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    const my_id = req.user._id;
    const { user_id } = value;

    try {
        const user = await prisma.users.findFirst({
            where: {
                id: user_id,
            },
            select: {
                id: true,
                is_public: true,
                followers: {
                    where: {
                        follower_id: my_id,
                        status: FollowingApproval.APPROVED,
                    },
                },
                followings: {
                    where: {
                        status: FollowingApproval.APPROVED,
                    },
                    select: {
                        follower: {
                            select: {
                                id: true,
                                user_name: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) return res.status(400).send(getError("User do not exist."));

        const followings = [];
        user.followings.forEach((following) => followings.push(following.follower));
        delete user.followings;
        user.followings = followings;

        if (user_id != my_id) {
            const iAmFollower = user.followers.length > 0;

            if (user.is_public == true && !iAmFollower)
                return res.status(400).send(getError("Users profile is private."));
        }

        delete user.is_public;
        delete user.followers;

        return res.status(200).send(getSuccess(user));
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

router.get("/get_my_preferences", async(req, res) => {
    try {
        const user_id = req.user._id;

        const my_prefrences = await prisma.userPreferences.findFirst({
            where: {
                user_id,
            },
        });

        if (!my_prefrences)
            return sendError(
                res,
                "No prefrence exist, please update your preferences to continue using this app."
            );

        my_prefrences.preferences = JSON.parse(my_prefrences.preferences);

        return sendSuccess(res, my_prefrences);
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/update_preferences", [trimRequest.body], async(req, res) => {
    try {
        const { error, value } = prefrencesValidation(req.body);
        if (error) {
            return sendError(res, error.details[0].message);
        }

        const user_id = req.user._id;

        const {
            gender: _gender,
            ziodic_sign: _ziodic_sign,
            country: _country,
            religion: _religion,
            height,
            status: _status,
            body_type: _body_type,
            profession: _profession,
            age_start,
            age_end,
        } = value;

        // console.log(value);

        // const ziodic_sign = _ziodic_sign;
        // if (!Array.isArray(_ziodic_sign))
        //   return sendError(res, "ziodic_sign should be an array.");

        // // const country = _country;
        // if (!Array.isArray(_country))
        //   return sendError(res, "country should be an array.");

        // // const religion = _religion;
        // if (!Array.isArray(_religion))
        //   return sendError(res, "religion should be an array.");

        // // const body_type = _body_type;
        // if (!Array.isArray(_body_type))
        //   return sendError(res, "body_type should be an array.");

        // // const profession = _profession;
        // if (!Array.isArray(_profession))
        //   return sendError(res, "profession should be an array.");

        // const ziodic_sign = _ziodic_sign.map((_) => _.toLowerCase());
        // const country = _country.map((_) => _.toLowerCase());
        // const religion = _religion.map((_) => _.toLowerCase());
        // const body_type = _body_type.map((_) => _.toLowerCase());
        // const profession = _profession.map((_) => _.toLowerCase());

        const ziodic_sign = _ziodic_sign.toLowerCase();
        const country = _country.toLowerCase();
        const religion = _religion.toLowerCase();
        const body_type = _body_type.toLowerCase();
        const profession = _profession.toLowerCase();

        const preferences = {
            gender: _gender.toLowerCase(),
            ziodic_sign,
            country,
            religion,
            height,
            status: _status.toLowerCase(),
            body_type,
            profession,
            age_start,
            age_end,
        };

        // console.log(preferences);
        const my_prefrences = await prisma.userPreferences.findFirst({
            where: {
                user_id,
            },
        });

        if (my_prefrences) {
            await prisma.userPreferences.update({
                where: {
                    id: my_prefrences.id,
                },
                data: {
                    preferences: JSON.stringify(preferences),
                },
            });
        } else {
            await prisma.userPreferences.create({
                data: {
                    user_id,
                    preferences: JSON.stringify(preferences),
                },
            });
        }

        return sendSuccess(res, "Prefrences Updated.");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/change_password", [trimRequest.body], async(req, res) => {
    try {
        const { error, value } = changePasswordValidation(req.body);
        if (error) {
            return sendError(res, error.details[0].message);
        }

        const my_id = req.user._id;
        const { old_password, new_password } = value;

        const user = await prisma.users.findFirst({
            where: {
                id: my_id,
            },
        });

        const isValidPassword = bcrypt.compareSync(old_password, user.password);
        if (!isValidPassword) {
            if (user.login_attempts >= 3) {
                await prisma.users.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        locked_at: new Date(),
                        login_attempts: user.login_attempts + 1,
                    },
                });
                return sendError(
                    res,
                    "You are locked for 1 minute. So try after 1 minute."
                );
            } else {
                await prisma.users.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        login_attempts: user.login_attempts + 1,
                    },
                });
            }
            return sendError(res, "old password is not valid.");
        }

        const hashPassword = bcrypt.hashSync(new_password, 10);

        await prisma.users.update({
            where: {
                id: user.id,
            },
            data: {
                locked_at: null,
                login_attempts: 0,
                password: hashPassword,
            },
        });

        return sendSuccess(res, "Password Updated.");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/feed_back", [trimRequest.body], async(req, res) => {
    try {
        const { error, value } = feedBackValidation(req.body);
        if (error) {
            return sendError(res, error.details[0].message);
        }
        const { email, firstname, lastname } = req.user;
        let person = {
            firstname,
            lastname,
            fullname: firstname + " " + lastname,
        };
        // console.log(person.fullname);
        (value.email = email), (value.name = person.fullname);
        // console.log(value);
        const isExist = await prisma.feedBack.findFirst({
            where: {
                email: value.email,
            },
        });
        // console.log(isExist);
        if (isExist) {
            await prisma.feedBack.update({
                where: {
                    id: isExist.id,
                },
                data: {
                    message: value.message,
                },
            });
        } else {
            await prisma.feedBack.create({
                data: {
                    email: value.email,
                    name: person.fullname,
                    message: value.message,
                },
            });
        }
        await Mailer.sendMail(
            email,
            "Thank You for Feedback",
            (text = `<div style="background-color: #D01BFD; color: white;text-align: center; padding:20px; font-family: 'Times New Roman', Times, serif; font-size: 18px;">
            <h4>We’re glad that you loved <strong>PAK SHADI</strong> Application.<br> We are always trying our best to make your experience memorable, and we’re glad that we’ve achieved it! </h4>
        </div>`)
        );
        return sendSuccess(res, "Feed back sent successfully");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/update_profile", [uploadUserFile, trimRequest.body], async(req, res) => {
    try {
        const { error, value } = updatProfileValidation(req.body);
        if (error) {
            deleteUploadedFiles(req);
            return sendError(res, error.details[0].message);
        }
        const { id } = req.user;
        const my_profile = await prisma.users.findFirst({
            where: {
                id,
            },
        });

        const isProfile = await prisma.users.findFirst({
            where: {
                id,
                show_profile_picture: true,
            },
        });

        const isPrivate = await prisma.users.findFirst({
            where: {
                id,
                show_private_picture: true,
            },
        });

        // const { picture_ids } = value;

        const profile = [];
        if (req.files ? req.files.file : null && req.files.file.length > 0) {
            for (const picture of req.files.file) {
                if (picture) {
                    const { Location: profile_url } = await uploadFile(picture);
                    profile.push({
                        profile_picture_url: profile_url,
                    });
                    if (fs.existsSync(picture.path)) {
                        fs.unlinkSync(picture.path);
                    }
                }
            }
            await deleteFile(my_profile.profile_picture_url);
        }

        // const gallery = [];
        // // console.log(req.files);
        if (
            req.files ? req.files.pictures : null && req.files.pictures.length > 0
        ) {
            const myPreviousGallery = await prisma.userGallery.findMany({
                where: {
                    user_id: id,
                    // id: { in: picture_ids
                    // },
                },
            });

            if (myPreviousGallery.length >= 6) {
                deleteUploadedFiles(req);
                return sendError(res, "Your Private Pictures Section is full!");
            }
            let countPic = 6 - myPreviousGallery.length;
            if (countPic < req.files.pictures.length) {
                deleteUploadedFiles(req);
                return sendError(
                    res,
                    `You can upload only ${countPic} more Pictures in Private Pictures Section.`
                );
            }
            const gallery = [];
            for await (const file of req.files.pictures) {
                const { Location } = await uploadFile(file);
                if (Location)
                    gallery.push({
                        user_id: id,
                        // user_id: newUser.id,
                        picture_url: Location,
                    });

                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
            if (gallery.length > 0) {
                await prisma.userGallery.createMany({
                    data: gallery,
                });
            }
            // const {Location} = await uploadFile(req.files.pictures)
            // const dataa = [];
            // let i = 0;
            // for await (const arr of myPreviousGallery) {
            //     // await deleteFile(arr.picture_url);
            //     // const isPictures = await prisma.userGallery.findFirst({
            //     //     where: {
            //     //         id,
            //     //     }
            //     // })
            //     if (req.files.pictures[i]) {
            //         try {
            //             const { Location } = await uploadFile(req.files.pictures[i])
            //             if (Location) {
            //                 if (fs.existsSync(req.files.pictures[i].path)) {
            //                     fs.unlinkSync(req.files.pictures[i].path)
            //                 }
            //             }
            //             const oldPic = arr.picture_url;
            //             await deleteFile(oldPic)
            //             await prisma.userGallery.update({
            //                 where: {
            //                     id: arr.id
            //                 },
            //                 data: {
            //                     picture_url: Location
            //                 }
            //             })
            //         } catch (catchError) {

            //         }
            //     } else {
            //         await prisma.userGallery.delete({
            //             where: {
            //                 id: arr.id,
            //             }
            //         })
            //     }

            //     // const splitdPath = arr.picture_url
            //     //   ? arr.picture_url.split(getEnv("APP_URL"))
            //     //   : null;
            //     // if (splitdPath.length > 1) {
            //     //   const path = "public" + splitdPath[1];
            //     //   if (fs.existsSync(path)) {
            //     //     fs.unlinkSync(path);
            //     //   }
            //     // }
            //     i++
            //     dataa.push(arr.id);
            // }

            // await prisma.userGallery.deleteMany({
            //     where: {
            //         id: { in: dataa },
            //     },
            // });
            // await prisma.$transaction([deletePreviosGallery, createNewGallery])
        }

        // console.log(value.phone);
        if (my_profile) {
            const updatedUser = await prisma.users.update({
                where: {
                    id: my_profile.id,
                },
                data: {
                    // profile: JSON.stringify(profile),
                    firstname: value.firstname,
                    lastname: value.lastname,
                    religion: value.religion,
                    height: value.height,
                    education: value.education,
                    phone: value.phone,
                    description: value.description,
                    profile_picture_url: profile.length > 0 ?
                        profile[0].profile_picture_url : my_profile.profile_picture_url,
                    age: value.age,
                    body_type: value.body_type,
                    profession: value.profession,
                    status: value.status,
                    show_profile_picture: value.show_profile_picture,
                    show_private_picture: value.show_private_picture,
                    // ? value.phone : my_profile.phone,
                    // picture_url: gallery.length > 0 ?
                    //     gallery[0].picture_url : my_profile.picture_url,
                },
                include: {
                    gallery: {
                        select: {
                            id: true,
                            picture_url: true,
                        },
                        orderBy: {
                            updated_at: "desc",
                        },
                    },
                },
            });
            // console.log(data);
            const data = {
                firstname: updatedUser.firstname,
                lastname: updatedUser.lastname,
                profile_picture_url: updatedUser.profile_picture_url,
                religion: updatedUser.religion,
                height: updatedUser.height,
                education: updatedUser.education,
                phone: updatedUser.phone,
                description: updatedUser.description,
                gallery: updatedUser.gallery,
                age: updatedUser.age,
                profession: updatedUser.profession,
                body_type: updatedUser.body_type,
                status: updatedUser.status,
                ziodic_sign: updatedUser.ziodic_sign,
                country: updatedUser.country,
                city: updatedUser.city,
                show_profile_picture: updatedUser.show_profile_picture,
                show_private_picture: updatedUser.show_private_picture,
                show_phone_number: updatedUser.show_phone_number,
                show_notifications: updatedUser.show_notifications,
            };

            if (!isProfile) {
                Socket.toggleProfilePicture(id, true);
            } else {
                Socket.toggleProfilePicture(id, false);
            }

            if (!isPrivate) {
                Socket.togglePrivatePicture(id, true);
            } else {
                Socket.togglePrivatePicture(id, false);
            }
            return sendSuccess(res, {
                token: createToken(updatedUser),
                data,
            });
        }
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/delete_picture", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = deletePictureValidation(req.body);
        if (error) {
            return sendError(res, error.details[0].message);
        }
        const { id } = req.user;
        const { picture_id } = value;
        const isPic = await prisma.userGallery.findFirst({
            where: {
                id: picture_id,
                user_id: id,
            },
        });
        if (!isPic) {
            return sendError(res, "Record does not exist");
        }

        const pic = await prisma.userGallery.delete({
            where: {
                id: isPic.id,
            },
        });
        await deleteFile(pic.picture_url);
        return sendSuccess(res, "Picture deleted successfully");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.get("/toggle_my_profile_picture", async(req, res) => {
    try {
        const { id, show_profile_picture } = req.user;
        const isProfile = await prisma.users.findFirst({
            where: {
                id,
                show_profile_picture: true,
            },
        });

        const my_profile_picture = await prisma.users.update({
            where: {
                id,
            },
            data: {
                show_profile_picture: !show_profile_picture,
            },
        });

        if (!isProfile) {
            Socket.toggleProfilePicture(id, true);
        } else {
            Socket.toggleProfilePicture(id, false);
        }
        return sendSuccess(res, "Successfully done");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.get("/toggle_my_private_picture", async(req, res) => {
    try {
        const { id, show_private_picture } = req.user;
        const isPrivate = await prisma.users.findFirst({
            where: {
                id,
                show_private_picture: true,
            },
        });
        const updatedUser = await prisma.users.update({
            where: {
                id,
            },
            data: {
                show_private_picture: !show_private_picture,
            },
        });
        if (isPrivate) {
            await prisma.requestPictures.deleteMany({
                where: {
                    second_user_id: id,
                },
            });
        }

        if (!isPrivate) {
            Socket.togglePrivatePicture(id, true);
        } else {
            Socket.togglePrivatePicture(id, false);
        }
        return sendSuccess(res, "Successfully done");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.get("/toggle_my_phone_number", async(req, res) => {
    try {
        const { id, show_phone_number } = req.user;
        const isPhone = await prisma.users.findFirst({
            where: {
                id,
                show_phone_number: true,
            },
        });
        const updatedUser = await prisma.users.update({
            where: {
                id,
            },
            data: {
                show_phone_number: !show_phone_number,
            },
        });
        if (!isPhone) {
            Socket.showPhone(id, true);
        } else {
            Socket.togglePhone(id, false);
        }
        return sendSuccess(res, "Successfully done");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/update_fcm_token", trimRequest.all, async(req, res) => {
    try {
        const { id } = req.user;
        const { error, value } = fcmTokenValidation(req.body);
        if (error) {
            return sendError(res, error.details[0].message);
        }
        const { fcm_token } = value;
        await prisma.users.update({
            where: {
                id,
            },
            data: {
                fcm_token,
            },
        });
        return sendSuccess(res, "FCM Token Updated Successfully");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.get("/delete_fcm_token", async(req, res) => {
    try {
        const { id } = req.user;
        await prisma.users.update({
            where: {
                id,
            },
            data: {
                fcm_token: null,
            },
        });
        return sendSuccess(res, "FCM Token deleted Successfully");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/block_user", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = blockProfileValidation(req.body);
        if (error) {
            return sendError(res, error.details[0].message);
        }
        const blocker_id = req.user._id;
        const { blocked_id } = value;

        const isUserBlocked = await prisma.blockProfile.findFirst({
            where: {
                // OR: [{
                        blocker_id,
                        blocked_id,
                //     },
                //     {
                //         blocker_id: blocked_id,
                //         blocked_id: blocker_id,
                //     },
                // ],
            },
        });
        if (isUserBlocked) {
            return sendError(res, "user already blocked");
        }
        if (blocked_id == blocker_id) {
            return sendError(res, "Action not perform on same ID");
        }
        await prisma.blockProfile.create({
            data: {
                blocker_id,
                blocked_id,
            },
        });
        await Socket.userBlock(blocker_id, blocked_id, true);
        return sendSuccess(res, "You blocked this user successfully");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/unblock_user", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = blockProfileValidation(req.body);
        if (error) {
            return sendError(res, error.details[0].message);
        }
        const blocker_id = req.user._id;
        const { blocked_id } = value;

        if (blocker_id == blocked_id) {
            return sendError(res, "Action not perform on same ID")
        }

        const isUserIBlocked = await prisma.blockProfile.findFirst({
            where: {
                blocker_id,
                blocked_id,
                // OR: [{
                //         blocker_id,
                //         blocked_id,
                //     },
                //     {
                //         blocker_id: blocked_id,
                //         blocked_id: blocker_id,
                //     },
                // ],
            },
        });
        if (!isUserIBlocked) {
            return sendError(res, "Record does not exist");
        }else{
        // if (isUserBlocked) {
            await prisma.blockProfile.delete({
                where: {
                    id: isUserIBlocked.id,
                },
            });
        }

        await Socket.userBlock(blocker_id, blocked_id, false);
        return sendSuccess(res, "You unblock this user successfully");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.get("/get_notifications", async(req, res) => {
    try {
        const { id } = req.user;

        const userApproved = await prisma.users.findFirst({
            where:{
                id,
                is_registered:true,
                admin_approval:LogInApproval.APPROVED
            }
        })

        const notification = await prisma.users.findFirst({
            where: {
                id,
            },
            select: {
                other_notification: {
                    select: {
                        id: true,
                        seen: true,
                        created_at: true,
                        updated_at: true,
                        notification_type: true,
                        sender: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                gender: true,
                                profile_picture_url: true,
                                show_profile_picture: true,
                                admin_approval:true,
                            },
                        },
                    },
                    orderBy: {
                        created_at: "desc",
                    },
                },
                other_user_request: {
                    select: {
                        id: true,
                        first_user_id: true,
                        second_user_id: true,
                        permissions: true,
                    },
                },
            },
        });

        const first = notification.other_notification;
        first.forEach((user)=>{
            if (!user.sender.show_profile_picture) {
                user.sender.profile_picture_url = null;
                delete user.sender.show_profile_picture;
            }
            if (!userApproved) {
                user.sender.profile_picture_url = null;
                user.sender.is_approval = false;
            }else{
                user.sender.is_approval = true;
            }
            if (userApproved) {
                const notApproved = first.filter((arr)=> arr.sender.admin_approval== "PENDING");
                notApproved.forEach((ary)=>{
                    if (ary.sender.admin_approval=="PENDING") {
                        ary.sender.profile_picture_url = null;
                        ary.sender.is_approval = false;
                    }else{
                        ary.sender.is_approval = true;
                    }
                })
            }
        })
        if (notification.other_user_request.length > 0) {
            first.forEach((arr, index) => {
                if (!arr.sender.show_profile_picture) {
                    arr.sender.profile_picture_url = null;
                    delete arr.sender.show_profile_picture;
                }
                if (!userApproved) {
                    arr.sender.profile_picture_url = null;
                    arr.sender.is_approval = false;
                }else{
                    arr.sender.is_approval = true;
                }

                if (userApproved) {
                    const notApproved = first.filter((ary)=> ary.sender.admin_approval== "PENDING");
                    notApproved.forEach((arry)=>{
                        if (arry.sender.admin_approval=="PENDING") {
                            arry.sender.profile_picture_url = null;
                            arry.sender.is_approval = false;
                        }else{
                            arry.sender.is_approval = true;
                        }
                    })
                }

                const u_id = arr.sender.id;
                const second = notification.other_user_request;

                if (arr.notification_type == NotificationType.PRIVATE) {
                    const isRequestExist = second.find((se) => se.first_user_id == u_id);
                    if (isRequestExist) {
                        first[index] = {...arr, ...isRequestExist };
                    }
                }
                if (arr.notification_type == NotificationType.ACCEPT) {
                    const isRequest = second.find((see) => see.first_user_id == u_id);
                    if (isRequest) {
                        first[index] = {...arr, ...isRequest };
                    }
                }
                // second.forEach((reqId) => {
                //     if (arr.notification_type == NotificationType.PRIVATE) {
                //         if (arr.sender.id == reqId.first_user_id) {
                //             // notification.other_notification.is_permission = true
                //             let id = arr.id;
                //             let seen = arr.seen;
                //             let created_at = arr.created_at;
                //             let notification_type = arr.notification_type;
                //             let sender = arr.sender;
                //             // let seconddata = reqId
                //             let notifi_id = reqId.id;
                //             let first_user_id = reqId.first_user_id;
                //             let second_user_id = reqId.second_user_id;
                //             let permissions = reqId.permissions;

                //             newarr.push({
                //                 id: id,
                //                 seen,
                //                 created_at,
                //                 notification_type,
                //                 notifi_id,
                //                 first_user_id,
                //                 second_user_id,
                //                 permissions,
                //                 sender,
                //                 // seconddata: seconddata,
                //             });
                //         }
                //     } else {
                //         // first.forEach((arr) => {
                //         let id = arr.id;
                //         let seen = arr.seen;
                //         let created_at = arr.created_at;
                //         let notification_type = arr.notification_type;
                //         let sender = arr.sender;
                //         newarr.push({
                //             id,
                //             seen,
                //             created_at,
                //             notification_type,
                //             sender,
                //         });
                //         // });
                //     }
                // });
            });
        }
        const sorted_notifi = _.orderBy(first, ["created_at"], ["desc"]);
        return sendSuccess(res, sorted_notifi);
        // else {
        //     return sendSuccess(res, notification.other_notification);
        // }
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.get("/seen_notifications", async(req, res) => {
    try {
        const { id } = req.user;
        const isNotifi = await prisma.notification.updateMany({
            where: {
                to_id: id,
            },
            data: {
                seen: true,
            },
        });
        if (isNotifi.count <= 0) {
            return sendError(res, "No record found");
        }
        return sendSuccess(res, "You seen the notification Successfully");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/request_private_pictures", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = requestPicturesValidation(req.body);
        if (error) {
            return sendError(res, error.details[0].message);
        }
        const { firstname, lastname } = req.user;
        const first_user_id = req.user._id;
        const { second_user_id } = value;
        if (first_user_id == second_user_id) {
            return sendSuccess(res, "Action not perform on same ID!");
        }
        const isUser = await prisma.users.findFirst({
            where: {
                id: second_user_id,
                is_registered: true,
            },
        });
        if (!isUser) {
            return sendSuccess(res, "User does not exist");
        }
        const isUserPrivate = await prisma.users.findFirst({
            where: {
                id: second_user_id,
                show_private_picture: true,
            },
        });
        if (isUserPrivate) {
            return sendSuccess(res, "Private pictures are shown publicaly!");
        }

        const isExist = await prisma.requestPictures.findFirst({
            where: {
                first_user_id,
                second_user_id,
            },
        });
        const isNotification = await prisma.notification.findFirst({
            where: {
                from_id: first_user_id,
                to_id: second_user_id,
                notification_type: NotificationType.PRIVATE,
            },
        });
        if (isExist && isNotification) {
            const updat = await prisma.requestPictures.update({
                where: {
                    id: isExist.id,
                },
                data: {
                    first_user_id,
                    second_user_id,
                },
            });
            const notify = await prisma.notification.update({
                where: {
                    id: isNotification.id,
                },
                data: {
                    from_id: first_user_id,
                    to_id: second_user_id,
                    notification_type: NotificationType.PRIVATE,
                    seen:false,
                    created_at: new Date()
                },
            });
        }

        if (!isExist) {
            let privatePictures = await prisma.requestPictures.create({
                data: {
                    first_user_id,
                    second_user_id,
                },
            });
            const notify = await prisma.notification.create({
                data: {
                    from_id: first_user_id,
                    to_id: second_user_id,
                    notification_type: NotificationType.PRIVATE,
                    private_req_id: privatePictures.id,
                },
            });
        }
        const isNotify = await prisma.users.findFirst({
            where: {
                id: second_user_id,
                show_notifications: true,
                is_registered: true,
            },
        });
        if (isNotify) {
            const isFcmToken = await prisma.users.findFirst({
                where: {
                    id: second_user_id,
                },
                select: {
                    fcm_token: true,
                },
            });
            if (isFcmToken.fcm_token) {
                SendNotification(isFcmToken.fcm_token, {
                        title: firstname + " " + lastname,
                        body: "Send you a request for show your private pictures",
                    })
                    .then((res) => {
                        console.log(res, "done");
                    })
                    .catch((error) => {
                        console.log(error, "Error sending notification");
                    });
            }
        }
        await Socket.requestPrivatePictures(
            first_user_id,
            second_user_id,
            "Request for show private pictures"
        );
        return sendSuccess(res, "Successfullly done");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.post("/show_my_private_picture", async(req, res) => {
    try {
        const { error, value } = acceptRequestPicturesValidation(req.body);
        if (error) {
            return sendError(res, error.details[0].message);
        }
        const { id, firstname, lastname } = req.user;
        const { first_user_id } = value;
        const isExist = await prisma.requestPictures.findFirst({
            where: {
                first_user_id,
                second_user_id: id,
            },
        });
        if (!isExist) {
            return sendSuccess(res, "No request found");
        }

        if (isExist && isExist.permissions == false) {
            const updatedUser = await prisma.requestPictures.update({
                where: {
                    id: isExist.id,
                },
                data: {
                    permissions: true,
                },
            });
        }
        const notify = await prisma.notification.create({
            data: {
                from_id: id,
                to_id: first_user_id,
                notification_type: NotificationType.ACCEPT,
                private_req_id: isExist.id,
            },
        });
        const isNotify = await prisma.users.findFirst({
            where: {
                id: first_user_id,
                show_notifications: true,
                is_registered: true,
            },
        });

        if (isNotify) {
            const isFcmToken = await prisma.users.findFirst({
                where: {
                    id: first_user_id,
                    is_registered: true,
                },
                select: {
                    fcm_token: true,
                },
            });
            if (isFcmToken.fcm_token) {
                SendNotification(isFcmToken.fcm_token, {
                        title: firstname + " " + lastname,
                        body: "Allow to show you private pictures",
                    })
                    .then((res) => {
                        console.log(res, "done");
                    })
                    .catch((error) => {
                        console.log(error, "Error sending notification");
                    });
            }
        }
        await Socket.requestPrivatePictures(
            id,
            first_user_id,
            "Allow to show you private pictures"
        );
        // const is
        // const isNotification
        if (isExist && isExist.permissions == true) {
            await prisma.notification.deleteMany({
                where: {
                    private_req_id: isExist.id,
                },
            });
            await prisma.requestPictures.delete({
                where: {
                    id: isExist.id,
                },
            });
            await Socket.requestPrivatePictures(
                id,
                first_user_id,
                "Request rejected"
            );
        }
        return sendSuccess(res, "Successfully done");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

router.get("/toggle_my_notifications", async(req, res) => {
    try {
        const { id } = req.user;
        const isNotify = await prisma.users.findFirst({
            where: {
                id,
                show_notifications: true,
            },
        });
        const isExist = await prisma.users.findFirst({
            where: {
                id,
            },
        });

        const updatedUser = await prisma.users.update({
            where: {
                id,
            },
            data: {
                show_notifications: !isExist.show_notifications,
            },
        });
        if (!isNotify) {
            Socket.toggleMyNotification(id, true);
        } else {
            Socket.toggleMyNotification(id, false);
        }
        return sendSuccess(res, "Successfully done");
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
});

module.exports = router;

function deleteUploadedFiles(req) {
    try {
        // req
        // //    ?
        //     req.files.pictures ?
        //     req.files.pictures.forEach((file) => {
        //         // console.log(file);
        //         fs.unlinkSync(file.path);
        //     }) :
        //     null :
        //     null;

        if (req && req.files) {
            if (req.files.pictures && req.files.pictures.length > 0) {
                req.files.pictures.forEach((picture) => {
                    if (fs.existsSync(picture.path)) fs.unlinkSync(picture.path);
                });
            }
            if (req.files.file && req.files.file.length > 0) {
                req.files.file.forEach((file) => {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                });
            }
        }
    } catch (err) {}
}