const router = require("express").Router();
const trimRequest = require("trim-request");

const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

const AnonomousUser = require("../middlewares/AnonomousUser");

const {
    getError,
    getSuccess,
} = require("../helpers");
const { LogInApproval } = require(".prisma/client");

router.get("/guest_discover_people", async(req, res) => {
    try {
        const discover = await prisma.users.findMany({
            where: {
                is_registered: true,
                admin_approval: LogInApproval.APPROVED,
            },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                age: true,
                description: true,
                user_name: true,
                profile_picture_url: true,
                show_profile_picture: true,
                online_status: true,
                online_status_updated_at: true,
                // longitude: true,
                // latitude: true,
                // my_profile_likes: {
                //     where: {
                //         liker_id: my_id,
                //     },
                // },
            },
            orderBy: [{
                    online_status: "asc",
                },
                {
                    online_status_updated_at: "desc",
                },
            ],
        })

        if (!discover.show_profile_picture) {
            discover.profile_picture_url = null;
            delete discover.show_profile_picture
        }
        return res.status(200).send(getSuccess(discover))

    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
})

module.exports = router