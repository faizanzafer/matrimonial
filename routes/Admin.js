const router = require("express").Router();
const trimRequest = require("trim-request");

const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

const Mailer = require('../Mailer');
const {
    updateApprovalValidation,
    adminFilterValidation
} = require("./validate");
const {
    getError,
    getSuccess,
} = require("../helpers");
const { LogInApproval } = require(".prisma/client");
const { deleteFile } = require("../S3_BUCKET/S3-bucket");
const Socket = require("../Socket/Socket");

router.get("/admin_get_approved_users", async(req, res) => {
    try {
        const users = await prisma.users.findMany({
            where: {
                admin_approval: LogInApproval.APPROVED
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                gender: true,
                profile_picture_url: true,
                gallery: {
                    select: {
                        picture_url: true,
                    }
                }
            }
        })

        const maleUser = users.filter(user => user.gender == "male")
        const femaleUser = users.filter(user => user.gender == "female")

        return res.status(200).send(getSuccess({ Users_Counter: users.length, Male_Users: maleUser.length, Female_Users: femaleUser.length, users }))
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(404).send(getError(catchError.message))
        }
        return res.status(404).send(getError(catchError))
    }
})

router.get("/admin_get_male_users", async(req, res) => {
    try {
        // const { value, error } = adminFilterValidation(req.body)
        // if (error) {
        //     return res.status(400).send(getError(error.details[0].message))
        // }
        // const { gender } = value;
        const gender = "male"
        const users = await prisma.users.findMany({
            where: {
                admin_approval: LogInApproval.APPROVED,
                gender,
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                gender: true,
                profile_picture_url: true,
                gallery: {
                    select: {
                        picture_url: true,
                    }
                }
            }
        })
        return res.status(200).send(getSuccess({ Users_Counter: users.length, users }))
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(404).send(getError(catchError.message))
        }
        return res.status(404).send(getError(catchError))
    }
})

router.get("/admin_get_female_users", async(req, res) => {
    try {
        // const { value, error } = adminFilterValidation(req.body)
        // if (error) {
        //     return res.status(400).send(getError(error.details[0].message))
        // }
        // const { gender } = value;
        const gender = "female"
        const users = await prisma.users.findMany({
            where: {
                admin_approval: LogInApproval.APPROVED,
                gender,
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                gender: true,
                profile_picture_url: true,
                gallery: {
                    select: {
                        picture_url: true,
                    }
                }
            }
        })
        return res.status(200).send(getSuccess({ Users_Counter: users.length, users }))
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(404).send(getError(catchError.message))
        }
        return res.status(404).send(getError(catchError))
    }
})

router.get("/admin_get_disaproved_users", async(req, res) => {
    try {
        const users = await prisma.users.findMany({
            where: {
                admin_approval: LogInApproval.PENDING
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                gender: true,
                profile_picture_url: true,
                gallery: {
                    select: {
                        picture_url: true,
                    }
                }
            }
        })
        return res.status(200).send(getSuccess({ Users_Counter: users.length, users }))
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(404).send(getError(catchError.message))
        }
        return res.status(404).send(getError(catchError))
    }
})

router.post("/admin_update_approval", trimRequest.body, async(req, res) => {
    try {
        const { value, error } = updateApprovalValidation(req.body)
        if (error) {
            return res.status(400).send(getError(error.details[0].message))
        }
        const { email: _email } = value;
        const email = _email.toLowerCase()
        const isExist = await prisma.users.findFirst({
            where: {
                email,
            }
        })
        if (!isExist) {
            return res.status(400).send(getError("User does not exist"))
        }

        if (isExist.admin_approval == LogInApproval.APPROVED) {
            return res.status(400).send(getError("User already approved"))
        }

        await prisma.users.update({
            where: {
                id: isExist.id,
            },
            data: {
                admin_approval: LogInApproval.APPROVED
            }
        })
        await Mailer.sendMail(
            email,
            "Admin Approval",
            text = `<div style="background-color: #dc4fff; color: white;text-align: center; padding:20px; font-family: 'Times New Roman', Times, serif; font-size: 18px;">
            <h4>Welcome to <strong>PAK SHADI</strong> your Profile have been approved you can view and send messages to the other users, However your profile and private pictures are under review ones one of our team member approves them, Then other user can view your pictures it make take 8 to 12 hours in some cases it could take lot less time.<br>
            We wish you good luck in finding you future life partner and thank you for choosing Pakshaddi.
            </h4>
        </div>`
        )
        return res.status(200).send(getSuccess("Successfully Send Email & Approved"))
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(404).send(getError(catchError.message))
        }
        return res.status(404).send(getError(catchError))
    }
})

router.post("/admin_delete_approval", trimRequest.body, async(req, res) => {
    try {
        const { value, error } = updateApprovalValidation(req.body)
        if (error) {
            return res.status(400).send(getError(error.details[0].message))
        }
        const { email: _email } = value;
        const email = _email.toLowerCase()
        const isExist = await prisma.users.findFirst({
            where: {
                email,
            }
        })
        if (!isExist) {
            return res.status(400).send(getError("User does not exist"))
        }
        await Mailer.sendMail(
            email,
            "Admin Approval",
            text = `<div>
                <div style="background-color: #dc4fff; color: white;text-align: center; padding:20px; font-family: 'Times New Roman', Times, serif; font-size: 18px; border-radius:20px">
            <h4>You are <strong>Not APPROVED</strong> for <strong>PAK SHADI</strong> Application.<br> Please Sign Up Again & Provide Correct Information and Provide Your Original Picture! </h4>
        </div>
        </div>`
        )
        const gallery = await prisma.userGallery.findMany({
            where: {
                user_id: isExist.id,
            }
        })

        for await (const pictures of gallery) {
            await deleteFile(pictures.picture_url)
        }

        await prisma.userGallery.deleteMany({
            where: {
                user_id: isExist.id,
            }
        })

        const prefrences = await prisma.userPreferences.findFirst({
            where: {
                user_id: isExist.id
            }
        })

        if (prefrences) {
            await prisma.userPreferences.delete({
                where: {
                    id: prefrences.id,
                }
            })
        }

        const like = await prisma.likeProfile.findMany({
            where: {
                OR: [{
                        liker_id: isExist.id,
                    },
                    {
                        liked_id: isExist.id,
                    },
                ]
            }
        })

        if (like.length > 0) {
            const ids = like.map(l => l.id)
            await prisma.likeProfile.deleteMany({
                where: {
                    id: { in: ids, }
                }
            })
        }

        const req_pic = await prisma.requestPictures.findMany({
            where: {
                OR: [{
                        first_user_id: isExist.id,
                    },
                    {
                        second_user_id: isExist.id,
                    },
                ]
            }
        })

        if (req_pic.length > 0) {
            const req_ids = req_pic.map(a => a.id);
            await prisma.requestPictures.deleteMany({
                where: {
                    id: { in: req_ids, }
                }
            })
        }

        const notify = await prisma.notification.findMany({
            where: {
                OR: [{
                        from_id: isExist.id,
                    },
                    { to_id: isExist.id, }
                ]
            }
        })

        if (notify.length > 0) {
            const not_ids = notify.map(b => b.id);
            await prisma.notification.deleteMany({
                where: {
                    id: { in: not_ids, }
                }
            })
        }

        const block = await prisma.blockProfile.findMany({
            where: {
                OR: [{
                        blocker_id: isExist.id,
                    },
                    {
                        blocked_id: isExist.id,
                    }
                ]
            }
        })

        if (block.length > 0) {
            const blo_ids = block.map(c => c.id);
            await prisma.blockProfile.deleteMany({
                where: {
                    id: { in: blo_ids, }
                }
            })
        }

        const messages = await prisma.channelMessages.findMany({
            where: {
                OR: [{
                        from_id: isExist.id,
                    },
                    {
                        to_id: isExist.id,
                    }
                ]
            }
        })

        if (messages.length > 0) {
            const msg_ids = messages.map(d => d.id);
            await prisma.channelMessages.deleteMany({
                where: {
                    id: { in: msg_ids, }
                }
            })
        }

        const channel = await prisma.userChannel.findMany({
            where: {
                OR: [{
                        from_id: isExist.id,
                    },
                    {
                        to_id: isExist.id,
                    }
                ]
            }
        })

        if (channel.length > 0) {
            const chan_ids = channel.map(e => e.id);
            await prisma.userChannel.deleteMany({
                where: {
                    id: { in: chan_ids, }
                }
            })
        }

        const deleteUser = await prisma.users.delete({
            where: {
                id: isExist.id,
            },
        })

        await deleteFile(deleteUser.profile_picture_url)

        await Socket.adminDisapproveUser("Dissapproved")
        return res.status(200).send(getSuccess("Email Send Successfully"))
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(404).send(getError(catchError.message))
        }
        return res.status(404).send(getError(catchError))
    }
})

module.exports = router;