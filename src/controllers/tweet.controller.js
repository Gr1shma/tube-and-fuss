import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Like } from "../models/like.model.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if(!content){
        throw new ApiError(400, "Content is required to tweet");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(401, "Invalid request");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
    });

    if(!tweet){
        throw new ApiError(500, "Error while creating tweet");
    }
    return res.
        status(200).
        json(new ApiResponse(200, tweet, "Tweet created sucessfully"))

})

const getUserTweets = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if(username.trim() === ""){
        throw new ApiError(401, "Username is required");
    }
    const user = await User.findOne({
        username,
    })
    if(!user){
        throw new ApiError(500, "Error while fetching user data");
    }
    const aggregateTweet = await Tweet.aggregate([
        {
            $match: {
                owner : new mongoose.Types.ObjectId(user?._id),
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount : {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy" ]},
                        then: true,
                        else: false,
                    },
                }
            }
        },
        {
            $project: {
                "ownerDetails": {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                },
                "likes": {
                    likedBy: 1,
                },
                createdAt: 1,
                likesCount: 1,
                isLiked: 1,
                content: 1,
            }
        }
    ]); 
    if(!aggregateTweet){
        throw new ApiError(500, "Error while fetching tweet");
    }
    
    return res.
        status(200).
        json(new ApiResponse(200, aggregateTweet, "Tweet fetched sucessfully"));

})

const updateTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { tweetId } = req.params;

    if(!content){
        throw new ApiError(400, "Content is required for updating tweet");
    }
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }    

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(500, "Error while fetching tweet");
    }

    if(tweet?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Requested user is not tweet owner");
    }

    tweet.content = content;

    const newTweet = await tweet.save({validateBeforeSave: false});
    if(!newTweet){
        throw new ApiError(500, "Error while updating tweet");
    }

    return res.
        status(200).
        json(new ApiResponse(200, newTweet, "Tweet updated sucessfully"));

})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweet id")
    }    

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(500, "Error while fetching tweet");
    }

    if(tweet?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Requested user is not tweet owner");
    }

    const deletedTweet = Tweet.findByIdAndDelete(tweet?._id); 
    if(!deletedTweet){
        throw new ApiError(500, "Error while deleting tweet");
    }
    await Like.deleteMany({
        tweet: tweet?._id,
    })
    return res.
        status(200).
        json(new ApiResponse(200, {}, "Tweet deleted sucessfully"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
