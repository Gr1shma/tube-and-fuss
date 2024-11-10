import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1
                },
                isLiked: 1
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res.
        status(200).
        json(new ApiResponse(200, comments, "Comments fetched successfully"));
})


const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const { content } = req.body;
    if(!content){
        throw new ApiError(400, "Content is required for comment");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "Invalid user id");
    }
    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id,
    });
    if(!comment){
        throw new ApiError(500, "Error while creating comment");
    }
    return res.
        status(200).
        json(new ApiResponse(200, comment, "Comment created sucessfully"));
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id");
    }
    const { content } = req.body;
    if(!content){
        throw new ApiError(400, "Content is required for updating comment");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "Invalid user id");
    }

    const comment = await Comment.findById(commentId);

    if(comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Requested user is not comment owner");
    }

    comment.content = content;
    const newComment = await comment.save({validateBeforeSave: true});

    return res.
        status(200).
        json(new ApiResponse(200, newComment, "Comment updated sucessfully"));
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment id");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "Invalid user id");
    }

    const comment = await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(500, "Error while fetching comment")
    }

    if(comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Requested user is not comment owner");
    }

    const deleteComment = await Comment.findByIdAndDelete(comment?._id);

    if(!deleteComment){
        throw new ApiError(500, "Error while deleting comment");
    }
    
    await Like.deleteMany({
        comment: comment?._id,
    })

    return res.
        status(200).
        json(new ApiResponse(200, {}, "Comment deleted sucessfully"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}
