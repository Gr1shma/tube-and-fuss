import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {username} = req.params
    if(!username){
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.findOne({
        username,
    });
    
    if(!channel){
        throw new ApiError(400, "Invalid channel username");
    }
    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channel?._id,
    })

    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res.
            status(200).
            json(new ApiResponse(200, {isSubscribed: false}, "Unsubscribed channel sucessfully" ));
    }

    await Subscription.create({
        subscriber: req.user?._id,
        channel: channel?._id,
    })

    return res.
        status(200).
        json(new ApiResponse(200, {isSubscribed: true}, "Subscribed channel sucessfully" ));

})

const getSubscribedChannels = asyncHandler(async (req, res) => {
    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "Invalid userid");
    }
    console.log(req.user?._id);
    const subscriptions = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos",
                        }
                    },
                    {
                        $addFields: {
                            latestVideos: {
                                $last: "$videos",
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channelDetails"
        },
        {
            $project: {
                _id: 0,
                channelDetails: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                    latestVideos: {
                        _id: 1,
                        videoFile: 1,
                        thumbnail: 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1,
                    }
                }
            }
        }
    ]);

    if(!subscriptions){
        throw new ApiError(500, "Error while fetching the subscriptions");
    }

    return res.
        status(200).
        json(new ApiResponse(200, subscriptions, "subscriptions fetched sucessfully"));

})

export {
    toggleSubscription,
    getSubscribedChannels
}
