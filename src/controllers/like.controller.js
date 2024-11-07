import mongoose, { isValidObjectId } from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    })

    if(video){
        await Like.findByIdAndDelete(video?._id);
        return res.
            status(200).
            json(new ApiResponse(200, {isLiked: false}));
    }
    await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    })

    return res.
        status(200).
        json(new ApiResponse(200, { isLiked: true }));
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid video id");
    }

    const comment = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    })

    if(video){
        await Like.findByIdAndDelete(comment?._id);
        return res.
            status(200).
            json(new ApiResponse(200, {isLiked: false}));
    }
    await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    })

    return res.
        status(200).
        json(new ApiResponse(200, { isLiked: true }));

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid video id");
    }

    const tweet = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    })

    if(video){
        await Like.findByIdAndDelete(tweet?._id);
        return res.
            status(200).
            json(new ApiResponse(200, {isLiked: false}));
    }
    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    })

    return res.
        status(200).
        json(new ApiResponse(200, { isLiked: true }));

})

// TODO: make function to reduce this redundant code which work for all video, comment, tweet


const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos =  await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $match: {
                            isPublished: true,
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        }
                    },
                    {
                        $unwind: "$ownerDetails",
                    }
                ]
            }
        },
        {
            $unwind: "$likedVideo"
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id:1,
                    videoFile: 1,
                    thumbnail: 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        avatar: 1,
                    }
                }
            }
        }
    ]);

    if(!likedVideos){
        throw new ApiError(500, "Error while fetching liked videos");
    }

    return res.
        status(200).
        json(new ApiResponse(200, likedVideos, "Liked Video fetched sucessuflly"));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
