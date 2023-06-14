const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

function dislikeTheCommentReply(comment_reply_like) {
    return prisma.giveAwayCommentRepliesLikes.delete({
        where: {
            id: comment_reply_like.id,
        },
    });
}

function likeTheCommentReply(user_id, reply_id) {
    return prisma.giveAwayCommentRepliesLikes.create({
        data: {
            user_id,
            reply_id,
        },
    });
}

function getPostandItsCommentItsRepliesAndReplyLike(
    post_id,
    comment_id,
    reply_id,
    user_id
) {
    return prisma.giveAways.findUnique({
        where: {
            id: post_id,
        },
        include: {
            comments: {
                where: {
                    id: comment_id,
                },
                include: {
                    replies: {
                        where: {
                            id: reply_id,
                        },
                        include: {
                            likes: {
                                where: {
                                    user_id,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}

function dislikeTheComment(comment_like) {
    return prisma.giveAwayCommentLikes.delete({
        where: {
            id: comment_like.id,
        },
    });
}

function likeTheComment(user_id, comment_id) {
    return prisma.giveAwayCommentLikes.create({
        data: {
            user_id,
            comment_id,
        },
    });
}

function getPostCommentandItsLikes(post_id, comment_id, user_id) {
    return prisma.giveAways.findUnique({
        where: {
            id: post_id,
        },
        include: {
            comments: {
                where: {
                    id: comment_id,
                },
                include: {
                    likes: {
                        where: {
                            user_id,
                        },
                    },
                },
            },
        },
    });
}

function makeCommentReply(user_id, comment_id, reply) {
    return prisma.giveAwayCommentReplies.create({
        data: {
            user_id,
            comment_id,
            reply,
        },
    });
}

function getPostAndItsComment(post_id, comment_id) {
    return prisma.giveAways.findUnique({
        where: {
            id: post_id,
        },
        include: {
            comments: {
                where: {
                    id: comment_id,
                },
            },
        },
    });
}

function makeCommentOnPost(post, user_id, comment) {
    return prisma.giveAwayComments.create({
        data: {
            give_away_id: post.id,
            user_id,
            comment,
        },
    });
}

function getPostFromId(post_id) {
    return prisma.giveAways.findUnique({
        where: {
            id: post_id,
        },
    });
}

module.exports = {
    dislikeTheCommentReply,
    likeTheCommentReply,
    getPostandItsCommentItsRepliesAndReplyLike,
    dislikeTheComment,
    likeTheComment,
    getPostCommentandItsLikes,
    makeCommentReply,
    getPostAndItsComment,
    makeCommentOnPost,
    getPostFromId,
};