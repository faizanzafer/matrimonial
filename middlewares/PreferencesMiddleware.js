const { getError, sendError } = require("../helpers");
const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

module.exports = async function(req, res, next) {
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

        req.user.my_prefrences = my_prefrences;
        next();
    } catch (catchError) {
        if (catchError && catchError.message) {
            return sendError(res, catchError.message);
        }
        return sendError(res, catchError);
    }
};