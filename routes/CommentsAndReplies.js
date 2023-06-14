const router = require("express").Router();
const date = require("date-and-time");
const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");

const {
    postCommentValidation,
    postCommentRepliesValidation,
    postCommentLikesValidation,
    postCommentReplyLikesValidation,
} = require("./validate");
const { getError, getSuccess } = require("../helpers");
const {
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
} = require("../database_queries/CommentsAndReplies");
//

router.post("/comment", trimRequest.all, async(req, res) => {
    const { error, value } = postCommentValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    try {
        const user_id = req.user._id;
        const { post_id, comment } = value;

        const post = await getPostFromId(post_id);
        if (!post) return res.status(400).send(getError("Post does not exist."));

        await makeCommentOnPost(post, user_id, comment);

        return res.send(getSuccess("Successfully Commented"));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/comment_reply", trimRequest.all, async(req, res) => {
    const { error, value } = postCommentRepliesValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    try {
        const user_id = req.user._id;
        const { post_id, comment_id, reply } = value;

        const post = await getPostAndItsComment(post_id, comment_id);
        if (!post) return res.status(400).send(getError("Post does not exist."));

        const comment = post.comments[0];
        if (!comment)
            return res
                .status(400)
                .send(getError("Comment do not exist or already deleted."));

        await makeCommentReply(user_id, comment_id, reply);

        return res.send(getSuccess("Successfully replied."));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/comment_like", trimRequest.all, async(req, res) => {
    const { error, value } = postCommentLikesValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    try {
        const user_id = req.user._id;
        const { post_id, comment_id } = value;

        const post = await getPostCommentandItsLikes(post_id, comment_id, user_id);
        if (!post) return res.status(400).send(getError("Post does not exist."));

        const comment = post.comments[0];
        if (!comment)
            return res
                .status(400)
                .send(getError("Comment do not exist or already deleted."));

        const comment_like = post.comments[0].likes[0];
        if (comment_like)
            return res
                .status(400)
                .send(getError("You have already liked this comment."));

        await likeTheComment(user_id, comment_id);

        return res.send(getSuccess("Comment Successfully Liked."));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/comment_dislike", trimRequest.all, async(req, res) => {
    const { error, value } = postCommentLikesValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    try {
        const user_id = req.user._id;
        const { post_id, comment_id } = value;

        const post = await getPostCommentandItsLikes(post_id, comment_id, user_id);

        if (!post) return res.status(400).send(getError("Post does not exist."));

        const comment = post.comments[0];
        if (!comment)
            return res
                .status(400)
                .send(getError("Comment do not exist or already deleted."));

        const comment_like = post.comments[0].likes[0];
        if (!comment_like)
            return res
                .status(400)
                .send(
                    getError("You haven't liked this comment. So you cannot dislike it.")
                );

        await dislikeTheComment(comment_like);

        return res.send(getSuccess("Comment Successfully disliked."));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/comment_reply_like", trimRequest.all, async(req, res) => {
    const { error, value } = postCommentReplyLikesValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    try {
        const user_id = req.user._id;
        const { post_id, comment_id, reply_id } = value;

        const post = await getPostandItsCommentItsRepliesAndReplyLike(
            post_id,
            comment_id,
            reply_id,
            user_id
        );
        if (!post) return res.status(400).send(getError("Post does not exist."));

        const comment = post.comments[0];
        if (!comment)
            return res
                .status(400)
                .send(getError("Comment do not exist or already deleted."));

        const comment_reply = post.comments[0].replies[0];
        if (!comment_reply)
            return res
                .status(400)
                .send(getError("Comment Reply do not exist or already deleted."));

        const comment_reply_like = post.comments[0].replies[0].likes[0];
        if (comment_reply_like)
            return res
                .status(400)
                .send(getError("You have already liked this comment reply."));

        await likeTheCommentReply(user_id, reply_id);

        return res.send(getSuccess("Comment Reply Successfully Liked."));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

router.post("/comment_reply_dislike", trimRequest.all, async(req, res) => {
    const { error, value } = postCommentReplyLikesValidation(req.body);
    if (error) return res.status(400).send(getError(error.details[0].message));

    try {
        const user_id = req.user._id;
        const { post_id, comment_id, reply_id } = value;

        const post = await getPostandItsCommentItsRepliesAndReplyLike(
            post_id,
            comment_id,
            reply_id,
            user_id
        );

        if (!post) return res.status(400).send(getError("Post does not exist."));

        const comment = post.comments[0];
        if (!comment)
            return res
                .status(400)
                .send(getError("Comment do not exist or already deleted."));

        const comment_reply = post.comments[0].replies[0];
        if (!comment_reply)
            return res
                .status(400)
                .send(getError("Comment Reply do not exist or already deleted."));

        const comment_reply_like = post.comments[0].replies[0].likes[0];
        if (!comment_reply_like)
            return res
                .status(400)
                .send(
                    getError(
                        "You haven't liked this comment reply. So you cannot dislike it."
                    )
                );

        await dislikeTheCommentReply(comment_reply_like);

        return res.send(getSuccess("Comment Reply Successfully disLiked."));
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

module.exports = router;