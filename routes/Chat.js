const router = require("express").Router();
const trimRequest = require("trim-request");
const fs = require("fs");
const _ = require("lodash");

const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

const Socket = require("../Socket/Socket");

const sendMedia = require("../middlewares/SendMedia");
const { uploadFile, deleteFile } = require("../S3_BUCKET/S3-bucket");

const {
    messageValidation,
    fetchMessageValidation,
    deleteMessagesValidation,
    deleteChatValidation,
    seenMessagesValidation,
} = require("./validate");
const { getError, getSuccess } = require("../helpers");
const { getEnv } = require("../config");
const { getUserfromId } = require("../database_queries/Auth");
const { SendNotification } = require("../Notfications/notfication");

const {
    updateUsersChannel,
    getUsersChannel,
    createUsersChannel,
    sendMessageToUsersChannel,
} = require("../database_queries/Chat");
const { MessageType, LogInApproval } = require("@prisma/client");
const { constants } = require("buffer");
// const path = require("path/posix");

//
router.post("/fetch_messages", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = fetchMessageValidation(req.body);
        if (error) {
            return res.status(400).send(getError(error.details[0].message));
        }
        const { id } = req.user;
        const { to_id, page } = value;

        if (id == to_id) {
            return res.status(400).send(getError("Action not perform on same id"));
        }
        const second_user = await getUserfromId(to_id);
        if (!second_user) {
            return res.status(400).send(getError("Sorry! user dose not exist"));
        }
        const offset = page >= 1 ? parseInt(page) - 1 : 0;

        const usersChannel = await getUsersChannel(
            to_id,
            id,
            true,
            parseInt(offset)
        );
        return res.status(200).send(getSuccess(usersChannel));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/send_message", [trimRequest.body, sendMedia], async(req, res) => {
    try {
        const { error, value } = messageValidation(req.body);
        if (error) {
            return res.status(400).send(getError(error.details[0].message));
        }

        const { id, firstname, lastname } = req.user;
        const { to_id, message_type, attachments, media_type, message_body } =
        value;

        const isBlocked = await prisma.blockProfile.findFirst({
            where: {
                blocker_id: id,
                blocked_id: to_id,
            },
        });

        if (isBlocked) {
            return res.status(400).send(getError("You block this user. You can not send the message. Please unblock this user before send the message."));
        }

        const isBlockedMe = await prisma.blockProfile.findFirst({
            where: {
                blocker_id: to_id,
                blocked_id: id,
            }
        })

        if (isBlockedMe) {
            return res.status(400).send(getError("You are blocked from this user! You can not send the message to this user."));
        }
        if (to_id == id) {
            return res.status(400).send(getError("You cannot send message to yourself"));
        }

        if (req.file_error) {
            return res.status(400).send(getError(req.file_error));
        }

        if (message_type == MessageType.MEDIA && !req.file) {
            return res.status(400).send(getError("Error uploading file."));
        }
        let { Location } = await uploadFile(req.file);

        if (message_type == MessageType.TEXT && req.file) {
            Location = null;
            if (req.file) {
                const path = req.file.path
                if (fs.existsSync(path)) {
                    fs.unlinkSync(path)
                }
            }
        }

        if (req.file) {
            const path = req.file.path;
            if (fs.existsSync(path)) {
                fs.unlinkSync(path);
            }
        }

        let isExist = await getUsersChannel(id, to_id);
        if (!isExist) {
            isExist = await createUsersChannel({
                from_id: id,
                to_id,
            });
        }

        const autoBlock = await prisma.channelMessages.findMany({
            where: {
                users_channels_id: isExist.id,
                // channel_id: isExist.id,
                // channel_messages: {
                //     every: {
                //         from_id: id,
                //     }
                // }
            },
        })

        const isChatBlock = await prisma.chatBlock.findFirst({
            where:{
                blocker_id: to_id,
                blocked_id: id,
            }
        })

        if (isChatBlock) {
            return res.status(400).send(getError("Please wait for a reply to send further messages."));
        }

        if (autoBlock.length >= 5) {
            let any = autoBlock.filter(user => user.from_id == id)
            if (any.length == autoBlock.length) {
                var block = await prisma.chatBlock.create({
                    data: {
                        blocker_id: to_id,
                        blocked_id: id,
                    }
                })

                await Socket.autoBlockUser(id, to_id)
                return res.status(400).send(getError("Please wait for a reply to send further messages."));
            }

            const isChatBlockBy = await prisma.chatBlock.findFirst({
                where:{
                    blocker_id: id,
                    blocked_id: to_id,
                }
            })

            if (isChatBlockBy && isChatBlockBy.blocker_id == id) {
                await prisma.chatBlock.delete({
                    where:{
                        id: isChatBlockBy.id,
                    }
                })
            }
        }

        const message = await sendMessageToUsersChannel({
            to_id,
            from_id: id,
            users_channels_id: isExist ? isExist.id : isExist.id,
            message_body,
            message_type,
            attachments: Location ? Location : null,
        });

        await Socket.sendMessageToSecondaryUser(id, to_id, message);

        const isNotify = await prisma.users.findFirst({
            where: {
                id: to_id,
                show_notifications: true,
            },
        });

        if (isNotify) {
            const isFcmToken = await prisma.users.findFirst({
                where: {
                    id: to_id,
                },
                select: {
                    fcm_token: true,
                },
            });
            if (isFcmToken.fcm_token) {
                SendNotification(isFcmToken.fcm_token, {
                        title: firstname + " " + lastname,
                        body: "Send you a message",
                    })
                    .then((res) => {
                        console.log(res, "done");
                    })
                    .catch((error) => {
                        console.log(error, "Error sending notification");
                    });
            }
        }

        return res.status(200).send(getSuccess(message));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(catchError);
    }
});

router.get("/get_message_contacts", async(req, res) => {
    try {
        const { id } = req.user;
        // let { offset } = req.query;
        // offset = !offset ? 0 : parseInt(offset);

        const userApproved = await prisma.users.findFirst({
            where:{
                id,
                is_registered:true,
                admin_approval:LogInApproval.APPROVED
            }
        })

        const contacts = await prisma.users.findFirst({
            where: {
                id,
            },
            select: {
                primary_user_channels: {
                    select: {
                        secondary_user: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                gender: true,
                                profile_picture_url: true,
                                show_profile_picture: true,
                                online_status: true,
                                online_status_updated_at: true,
                                admin_approval: true,
                                user_i_block: {
                                    where: {
                                        OR:[{
                                            blocker_id: id,
                                        },
                                            {
                                                blocked_id: id,
                                        }]
                                    }
                                },
                                user_blocked_me: {
                                    where: {
                                        OR:[
                                            {
                                                blocked_id: id,
                                            },
                                            {
                                                blocker_id: id,
                                            }
                                        ]
                                    }
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
                            },
                        },
                        channel_messages: {
                            orderBy: {
                                created_at: "desc",
                            },
                            // take: 1
                        },
                    },
                },
                secondary_user_channels: {
                    select: {
                        primary_user: {
                            select: {
                                id: true,
                                firstname: true,
                                lastname: true,
                                gender: true,
                                profile_picture_url: true,
                                show_profile_picture: true,
                                online_status: true,
                                online_status_updated_at: true,
                                admin_approval: true,
                                user_i_block: {
                                    where: {
                                        OR:[
                                            {
                                                blocker_id:id,
                                            },
                                                {
                                                    blocked_id: id,
                                            }
                                        ]
                                    }
                                },
                                user_blocked_me: {
                                    where: {
                                        OR:[{
                                            blocked_id:id,
                                        },
                                            {
                                                blocker_id: id,
                                        }]
                                    }
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
                            },
                        },
                        channel_messages: {
                            orderBy: {
                                created_at: "desc",
                            },
                        },
                    },
                    // skip: offset,
                    // take: 25,
                },
                // user_i_block: {
                //     select: {
                //         blocker_id: true,
                //     },
                // },
                // user_blocked_me: {
                //     select: {
                //         blocked_id: true,
                //     },
                // },
            },
        });
        // const IblockedUsers = contacts.user_i_block.map(user => user.blocker_id);
        // const usersBlockedMe = contacts.user_blocked_me.map(user => user.blocked_id);

        // const blockedIds = [...IblockedUsers, ...usersBlockedMe];
        // console.log(blockedIds);

        const first = contacts.primary_user_channels;
        const sender = first.map((arr) => {
            if (!arr.secondary_user.show_profile_picture) {
                arr.secondary_user.profile_picture_url = null;
                delete arr.secondary_user.show_profile_picture;
            }
            if (!userApproved) {
                arr.secondary_user.profile_picture_url = null;
                arr.secondary_user.is_approval = false;
            }else{
                arr.secondary_user.is_approval = true;
            }

            if (userApproved) {
                const notApproved = first.filter((ary)=> ary.secondary_user.admin_approval == "PENDING");
                notApproved.forEach((arry)=>{
                    if (arry.secondary_user.admin_approval=="PENDING") {
                        arry.secondary_user.profile_picture_url = null;
                        arry.secondary_user.is_approval = false;
                    }else{
                        arry.secondary_user.is_approval = true;
                    }
                })
            }
            // const isBlockedId = blockedIds.find(id => id == arr.secondary_user.id);

            // if (isBlockedId) {
            //     obj.online_status = null;
            //     obj.picture_url = null;
            //     obj.online_status_updated_at = null
            // }
            if (arr.secondary_user.user_i_block.length > 0) {
                arr.secondary_user.is_i_block = true;
            } else {
                arr.secondary_user.is_i_block = false;
            }
            delete arr.secondary_user.user_i_block;

            if (arr.secondary_user.user_blocked_me.length > 0) {
                arr.secondary_user.is_block_me = true;
            } else {
                arr.secondary_user.is_block_me = false;
            }
            delete arr.secondary_user.user_blocked_me;

            if (arr.secondary_user.senders_messages.length > 0 && arr.secondary_user.receivers_messages.length > 0) {
                arr.secondary_user.is_chat_start = true;
            }else{
                arr.secondary_user.is_chat_start = false;
            }
            delete arr.secondary_user.senders_messages;
            delete arr.secondary_user.receivers_messages;
            // console.log(isBlockedId);
            const obj = arr.secondary_user;
            obj.last_message = arr.channel_messages.length > 0 ? arr.channel_messages[0].message_body : null;
            obj.last_message_time = arr.channel_messages.length > 0 ? arr.channel_messages[0].created_at : null;
            obj.un_seen_messages_counter = arr.channel_messages.filter((message) => message.seen == false && message.to_id == id).length;

            return obj;
        });
        const second = contacts.secondary_user_channels;
        const reciever = second.map((arr) => {
            if (!arr.primary_user.show_profile_picture) {
                arr.primary_user.profile_picture_url = null;
                delete arr.primary_user.show_profile_picture;
            }

            if (!userApproved) {
                arr.primary_user.profile_picture_url = null;
                arr.primary_user.is_approval = false;
            }else{
                arr.primary_user.is_approval = true;
            }

            if (userApproved) {
                const notApproved = second.filter((ary)=> ary.primary_user.admin_approval == "PENDING");
                notApproved.forEach((arry)=>{
                    if (arry.primary_user.admin_approval=="PENDING") {
                        arry.primary_user.profile_picture_url = null;
                        arry.primary_user.is_approval = false;
                    }else{
                        arry.primary_user.is_approval = true;
                    }
                })
            }
            // const isBlockerId = blockedIds.find(id => id == arr.primary_user.id)

            // if (isBlockerId) {
            //     objt.picture_url = null;
            //     objt.online_status = null;
            //     objt.online_status_updated_at = null
            // }
            if (arr.primary_user.user_i_block.length > 0) {
                arr.primary_user.is_i_block = true;
                 delete arr.primary_user.user_i_block;
                } else {
                    arr.primary_user.is_i_block = false;
                }
                if (arr.primary_user.user_blocked_me.length > 0) {
                    arr.primary_user.is_block_me = true;
                    delete arr.primary_user.user_blocked_me;
            } else {
                arr.primary_user.is_block_me = false;
            }

            const objt = arr.primary_user;
            if (objt.senders_messages.length > 0 && objt.receivers_messages.length > 0) {
                objt.is_chat_start = true;
            }else{
                objt.is_chat_start = false;
            }
            delete objt.senders_messages;
            delete objt.receivers_messages;

            objt.last_message = arr.channel_messages.length > 0 ? arr.channel_messages[0].message_body : null;
            objt.last_message_time =
                arr.channel_messages.length > 0 ?
                arr.channel_messages[0].created_at :
                null;
            objt.un_seen_messages_counter = arr.channel_messages.filter(
                (message) => message.seen == false && message.to_id == id
            ).length;

            return objt;
        });
        const friends = [...sender, ...reciever];

        const sorted = _.orderBy(friends, ["last_message_time"], ["desc"]);

        return res.status(200).send(getSuccess(sorted));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/delete_chat", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = deleteChatValidation(req.body);
        if (error) {
            return res.status(400).send(getError(error.details[0].message));
        }
        const { id } = req.user;
        const { to_id } = value;
        if (to_id == id) {
            return res.status(400).send(getError("Action not perform on same id"));
        }
        const userChannel = await getUsersChannel(id, to_id);
        if (!userChannel) {
            return res.status(400).send(getError("No conversation exist"));
        }
        const messages = await prisma.channelMessages.findMany({
            where: {
                users_channels_id: userChannel.id,
                message_type: MessageType.MEDIA,
            },
        });
        for await (const media of messages) {
            await deleteFile(media.attachments)
        }
        // messages.forEach((message) => {
        //     if (message.attachments) {
        //         const filePath =
        //             "public" + message.attachments.replace(getEnv("APP_URL"), "");
        //         if (fs.existsSync(filePath)) {
        //             fs.unlinkSync(filePath);
        //         }
        //     }
        // });
        const isChatBlock = await prisma.chatBlock.findFirst({
            where:{
                OR:[{
                    blocker_id:to_id,
                    blocked_id:id,
                },{
                    blocker_id:id,
                    blocked_id:to_id,
                }]
            }
        });
        if (isChatBlock) {
        await prisma.chatBlock.delete({
            where:{
                id: isChatBlock.id,
            }
        })
    }
        await prisma.channelMessages.deleteMany({
            where: {
                users_channels_id: userChannel.id,
            },
        });
        await prisma.userChannel.delete({
            where: {
                id: userChannel.id,
            },
        });

        return res.status(200).send(getSuccess("Chat successfully deleted"));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/seen_messages", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = seenMessagesValidation(req.body);
        if (error) {
            return res.status(400).send(getError(error.details[0].message));
        }
        const { id } = req.user;
        const { from_id } = value;
        const message_id = await prisma.channelMessages.findMany({
            where: {
                from_id,
                to_id: id,
                seen: false,
            },
            select: {
                id: true,
            }
        })
        const is_seen = await prisma.channelMessages.updateMany({
            where: {
                from_id,
                to_id: id,
            },
            data: {
                seen: true,
            },
        });
        if (is_seen.count <= 0) {
            return res.status(400).send(getError("No data found"));
        }
        Socket.seenMessages(id, from_id, message_id, true)
        return res.status(200).send(getSuccess("Successfully done"));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/send_media", sendMedia, async(req, res) => {
    try {
        if (req.file_error) return res.status(400).send(getError(req.file_error));

        const file = req.file;
        console.log(file.path);
        const file_url = file ?
            file.path ?
            `${getEnv("APP_URL")}${file.path.split("//public")[1]}` :
            null :
            null;

        if (file_url == null)
            return res.status(400).send(getError("Error uploading file."));

        return res.send(getSuccess(file_url));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/userfetch_messages", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = fetchMessageValidation(req.body);
        if (error) return res.status(400).send(getError(error.details[0].message));

        const user_id = req.user._id;
        const { to_id, page } = value;

        if (user_id == to_id)
            return res.status(400).send(getError("to_id should not be your id"));

        const other_user = await getUserfromId(to_id);
        if (!other_user)
            return res
                .status(400)
                .send(getError("Sorry, Other user is not available in out records"));

        const offset = page >= 1 ? parseInt(page) - 1 : 0;

        const usersChannel = await getUsersChannel(
            to_id,
            user_id,
            true,
            parseInt(offset)
        );

        if (!usersChannel) {
            return res.status(200).send(getSuccess([]));
        }

        if (isUsersChannelAllowedForMe(usersChannel, user_id, true)) {
            return res.send(getSuccess([]));
        }

        const channelMessage = [];

        usersChannel.channel_messages.forEach((channel_message) => {
            const message = {
                id: channel_message.id,
                from_id: channel_message.from_id,
                to_id: channel_message.to_id,
                message_body: channel_message.message_body,
                message_type: channel_message.message_type,
                attachments: channel_message.attachments ?
                    JSON.parse(channel_message.attachments) : null,
                // seen: channel_message.seen,
                last_message_time: channel_message.created_at,
            };
            channelMessage.push(message);
        });

        return res.send(getSuccess(channelMessage));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/usersend_message", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = messageValidation(req.body);
        if (error) return res.status(400).send(getError(error.details[0].message));

        const user_id = req.user._id;
        const { to_id, message_type, attachment, media_type, message_body } = value;

        if (user_id == to_id)
            return res
                .status(400)
                .send(getError("you cannot send message to yourself"));

        const other_user = await getUserfromId(to_id);
        if (!other_user)
            return res
                .status(400)
                .send(getError("Sorry, Other user is not available in out records"));

        let data_attachments = null;
        if (message_type == "media") {
            data_attachments = {
                attachment,
                media_type,
            };
        }

        let data = {
            to_id,
            from_id: user_id,
            message_body,
            message_type,
            attachments: data_attachments ? JSON.stringify(data_attachments) : null,
        };

        const is_users_channel_already_created = await getUsersChannel(
            to_id,
            user_id
        );

        if (!is_users_channel_already_created) {
            users_channel = await createUsersChannel(data);

            data.channel_id = users_channel.id;

            const users_channel_message = await sendMessageToUsersChannel(data);
            users_channel_message.attachments = users_channel_message.attachments ?
                JSON.parse(users_channel_message.attachments) :
                null;

            return res.send(getSuccess(users_channel_message));
        }
        data.channel_id = is_users_channel_already_created.id;

        /// Updating users channel again visible for the user
        /// who deleted chat from his side.
        await updateUsersChannel(is_users_channel_already_created);

        const users_channel_message = await sendMessageToUsersChannel(data);
        users_channel_message.attachments = users_channel_message.attachments ?
            JSON.parse(users_channel_message.attachments) :
            null;

        return res.send(getSuccess(users_channel_message));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.get("/userget_message_contact", async(req, res) => {
    try {
        const { _id: user_id } = req.user;
        let { offset } = req.query;
        offset = !offset ? 0 : parseInt(offset);

        const usersChannels = await getUserChannels(user_id, offset);

        const contacts = getMessageContacts(usersChannels, user_id);
        const sortedContacts = _.orderBy(contacts, ["last_message_time"], ["desc"]);

        return res.send(getSuccess(sortedContacts));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/seen", trimRequest.all, async(req, res) => {
    try {
        const { to_id } = req.body.to_id;
        if (!to_id) return res.status(400).send(getError("to_id is required."));

        const user_id = req.user._id;

        if (user_id == to_id)
            return res.status(400).send(getError("to_id should not be your id"));

        const other_user = await getUserfromId(to_id);
        if (!other_user)
            return res
                .status(400)
                .send(getError("Sorry, Other user is not available in out records"));

        const usersChannel = await getUsersChannel(to_id, user_id);

        if (!usersChannel)
            return res.status(400).send(getError("No conversation started yet."));

        if (!isUsersChannelAllowedForMe(usersChannel, user_id))
            return res.status(400).send(getError("You have deleted this chat"));

        await makeMessagesSeen(usersChannel, user_id);

        return res.send(getSuccess("All messages seen"));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/delete_messages", trimRequest.all, async(req, res) => {
    try {
        const { error, value } = deleteMessagesValidation(req.body);
        if (error) return res.status(400).send(getError(error.details[0].message));

        const user_id = req.user._id;
        const { to_id, message_ids } = value;

        const decoded_ids = JSON.parse(message_ids);

        if (!Array.isArray(decoded_ids))
            return res
                .status(400)
                .send(getError("message_ids are not in valid format"));

        if (user_id == to_id)
            return res.status(400).send(getError("to_id should not be your id"));

        const other_user = await getUserfromId(to_id);
        if (!other_user)
            return res
                .status(400)
                .send(getError("Sorry, Other user is not available in out records"));

        const usersChannel = await getUsersChannel(to_id, user_id);

        if (!usersChannel)
            return res.status(400).send(getError("No conversation started yet."));

        if (!isUsersChannelAllowedForMe(usersChannel, user_id))
            return res.status(400).send(getError("You have deleted this chat"));

        await deleteMessages(usersChannel, user_id, message_ids);

        return res.send(getSuccess("Messages successfully deleted"));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/delete_conversation", trimRequest.all, async(req, res) => {
    try {
        const { to_id } = req.body.to_id;
        if (!to_id) return res.status(400).send(getError("to_id is required."));

        const user_id = req.user._id;

        if (user_id == to_id)
            return res.status(400).send(getError("to_id should not be your id"));

        const other_user = await getUserfromId(to_id);
        if (!other_user)
            return res
                .status(400)
                .send(getError("Sorry, Other user is not available in out records"));

        const usersChannel = await getUsersChannel(to_id, user_id);

        if (!usersChannel)
            return res.status(400).send(getError("No conversation started yet."));

        if (!isUsersChannelAllowedForMe(usersChannel, user_id))
            return res.status(400).send(getError("You have deleted this chat"));

        if (
            usersChannel.delete_conversation_for_from_id == true ||
            usersChannel.delete_conversation_for_to_id == true
        ) {
            await deleteWholeConversation(usersChannel);

            return res.send(getSuccess("Conversation deleted."));
        } else {
            await deleteSingleUserConversation(usersChannel, user_id);

            return res.send(getSuccess("Conversation deleted for single user."));
        }
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

module.exports = router;

function makeMessagesSeen(usersChannel, user_id) {
    return prisma.channelMessages.updateMany({
        where: {
            users_channels_id: usersChannel.id,
            to_id: user_id,
        },
        data: {
            seen: true,
        },
    });
}

function deleteMessages(usersChannel, user_id, message_ids) {
    return prisma.channelMessages.deleteMany({
        where: {
            users_channels_id: usersChannel.id,
            to_id: user_id,
            id: { in: message_ids },
        },
    });
}

function deleteWholeConversation(usersChannel) {
    const deleteConversation = prisma.channelMessages.deleteMany({
        where: {
            users_channels_id: usersChannel.id,
        },
    });
    const deleteUsersChannel = prisma.userChannel.delete({
        where: {
            id: usersChannel.id,
        },
    });
    return prisma.$transaction([deleteConversation, deleteUsersChannel]);
}

function deleteSingleUserConversation(usersChannel, user_id) {
    const deleteConversationForMe = prisma.userChannel.update({
        where: {
            id: usersChannel.id,
        },
        data: {
            delete_conversation_for_to_id: user_id == usersChannel.to_id ?
                true : usersChannel.delete_conversation_for_to_id,
            delete_conversation_for_from_id: user_id == usersChannel.from_id ?
                true : usersChannel.delete_conversation_for_from_id,
        },
    });
    const deleteChannelMessagesForSingleUser = prisma.channelMessages.deleteMany({
        where: {
            users_channels_id: usersChannel.id,
            to_id: user_id,
        },
    });
    return prisma.$transaction([
        deleteConversationForMe,
        deleteChannelMessagesForSingleUser,
    ]);
}

function getMessageContacts(usersChannels, user_id) {
    const contacts = [];

    usersChannels.forEach((usersChannel) => {
        if (isUsersChannelAllowedForMe(usersChannel, user_id, false)) {
            const primaryUser = usersChannel.primary_user;
            const secondaryUser = usersChannel.secondary_user;
            const channelMessages = usersChannel.channel_messages;

            const user =
                primaryUser && primaryUser.id == user_id ?
                secondaryUser :
                secondaryUser && secondaryUser.id == user_id ?
                primaryUser :
                null;

            if (user) {
                const lastMessage =
                    channelMessages.length > 0 ? channelMessages[0] : null;

                const unSeenMessagesCounter = channelMessages.filter(
                    (channelMessage) => channelMessage.seen == false
                ).length;

                const messageContact = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    last_message: lastMessage ? lastMessage.message_body : null,
                    last_message_time: lastMessage ? lastMessage.created_at : null,
                    un_seen_messages_counter: unSeenMessagesCounter,
                };
                contacts.push(messageContact);
            }
        }
    });
    return contacts;
}

function isUsersChannelAllowedForMe(usersChannel, user_id, status = false) {
    return (
        (usersChannel.from_id == user_id &&
            usersChannel.delete_conversation_for_from_id == status) ||
        (usersChannel.to_id == user_id &&
            usersChannel.delete_conversation_for_to_id == status)
    );
}

function getUserChannels(user_id, offset) {
    return prisma.userChannel.findMany({
        where: {
            OR: [{
                    to_id: user_id,
                },
                {
                    from_id: user_id,
                },
            ],
        },
        select: {
            id: true,
            to_id: true,
            from_id: true,
            delete_conversation_for_to_id: true,
            delete_conversation_for_from_id: true,
            primary_user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                },
            },
            secondary_user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                },
            },
            channel_messages: {
                where: {
                    to_id: user_id,
                },
                orderBy: { created_at: "desc" },
                take: 1,
            },
        },
        skip: offset,
        take: 25,
    });
}