import mongoose, {isValidObjectId} from "mongoose"

import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Like } from "../models/like.model.js"
import { Comment } from "../models/comment.model.js"

import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    const pipeline = [];

    if(query){
        pipeline.push({
            $search: {
                index: "search-video",
                text: {
                    query: query,
                    path: ["title", "description"]
                }
            }
        });
    }
    if(userId){
        if(!isValidObjectId(userId)){
            throw new ApiError(400, "Invalid User Id"); } pipeline.push({
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }
    pipeline.push({
        $match: {
            isPublished: true,
        }
    })

    if(sortBy && sortType){
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        })
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1,
            }
        })
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = await Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);
    return res.
        status(200).
        json(new ApiResponse(200, video, "Video fetched sucessfully"));
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    if([title, description].some(x => x?.trim() === "")){
        throw new ApiError(400, "Title and Description are required");
    }

    const localVideoFilePath = req.files?.videoFile[0].path;
    const localThumbnailFilePath = req.files?.thumbnail[0].path;
    
    if(!localVideoFilePath){
        throw new ApiError(400, "Video are required");
    }
    if(!localThumbnailFilePath){
        throw new ApiError(400, "Thumbnail is required")
    }
        
    const videoCloudinary = await uploadOnCloudinary(localVideoFilePath);
    const thumbnailCloudinary = await uploadOnCloudinary(localThumbnailFilePath);
    if(!videoCloudinary || !thumbnailCloudinary){
        throw new ApiError(500, "Error while uploading file in cloudinary");
    }

    const video = await Video.create({
        title,
        description,
        videoFile : videoCloudinary.url,
        thumbnail : thumbnailCloudinary.url,
        owner: req.user?._id,
        duration: videoCloudinary.duration,
        isPublished: false,
    });

    if(!video){
        await deleteFromCloudinary(videoCloudinary.url, false);
        await deleteFromCloudinary(thumbnailCloudinary.url, true);
        throw new ApiError(500, "Error while uploading file in database");
    }

    return res.
        status(200).
        json(new ApiResponse(200, video, "Video Uploaded Sucesfully"));
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }
    if (!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "Invalid User Id");
    }
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers",
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [req.user?._id, "$subscribers.subscriber"] 
                                    },
                                    then: true,
                                    else: false,
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username:1,
                            avatar:1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false,
                    }
                }
            }
        }
    ])

    if(!video[0]){
        throw new ApiError(500, "Error while fetching video from database");
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1,
        }
    });

    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId,
        }
    });

    return res.
        status(200).
        json(new ApiResponse(200, video[0], "Video fetched sucessfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(400, "Video Id is requiredred");
    }        
    let video = await Video.findById(videoId);

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Requested user is not video owner");
    }

    const {title , description} = req.body;
    
    const thumbnail = req.file?.path;

    if(!(title && description)){
        throw new apierror(400, "all field is required");
    }

    if (!thumbnail) {
        throw new ApiError(400, "thumbnail is required");
    }


    const thumbnailCloudinary = await uploadOnCloudinary(thumbnail);

    const oldThumbnailURL = video.thumbnail;

    video.thumbnail = thumbnailCloudinary.url;
    video.title = title;
    video.description = description;

    await video.save({validateBeforeSave: false}).then(await deleteFromCloudinary(oldThumbnailURL, true)).catch(err => {
        throw new ApiError(500, `Error while updating the video details \nError: ${err}`);
    })

    return res.
        status(200).
        json(new ApiResponse(200, video, "Video details updated sucessfully"));
})
// TODO: Dont make all fields required

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(400, "Video Id is requiredred");
    }        
    let video = await Video.findById(videoId);
    
    console.log(video)
    console.log(req.user?._id.toString())

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Requested user is not video owner");
    }
    const deletedVideo = await Video.findByIdAndDelete(video?._id)

    if(!deletedVideo){
        throw new ApiError("Error while deleting video");
    }

    await Like.deleteMany({
        video: videoId
    }) 
    await Comment.deleteMany({
        video: videoId
    })

    await deleteFromCloudinary(video?.videoFile, false)
    await deleteFromCloudinary(video?.thumbnail, true)

    return res.
        status(200).
        json(new ApiResponse(200, {} , "Video deleted sucessfully"));

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId){
        throw new ApiError(400, "Video Id is requiredred");
    }        
    let video = await Video.findById(videoId);

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(401, "Requested user is not video owner");
    }
    const oldIsPublished = video.isPublished;
    video.isPublished = !oldIsPublished;

    const newVideo = await video.save({ validateBeforeSave: false });
    if(!newVideo){
        throw new ApiError(500, "Error while updating details from database");
    }
    
    return res.
        status(200).
        json(new ApiResponse(200, newVideo, "Publish status toggled sucessfully"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
}
