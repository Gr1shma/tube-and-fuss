import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body;

    if(!name || !description){
        throw new ApiError(400, "Playlist name and description is required");
    }

    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "Invalid user id");
    }

    const playlist = await Playlist.create({
        owner: req.user?._id,
        name,
        description,
    });

    if(!playlist){
        throw new ApiError(500, "Error while creating the playlist");
    }
    return res.
        status(200).
        json(new ApiResponse(200, playlist, "Playlist created successfully"));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { username } = req.params
    if(username.trim() === ""){
        throw new ApiError(400, "username is invalid");
    }

    const user = await User.findOne({
        username,
    })

    if(!user){
        throw new ApiError(500, "Error while fetching the user");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user?._id),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1,
            }
        }
    ]);

    return res.
        status(200).
        json(new ApiResponse(200, playlists, "Users playlists fetched successfully"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(400, "Playlist not found");
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $match: {
                "videos.isPublished": true,
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            }
        },
        {
            $addFields: {
                totalVideos : {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
                owner: {
                    $first: "$owner",
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1,
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                }
            }
        }
    ])

    if(!playlistVideos){
        throw new ApiError(500, "Error while fetching playlist videos");
    }

    return res.
        status(200).
        json(new ApiResponse(200, playlistVideos[0], "Playlist videos fetched successfully"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid playlistId or videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if(!playlist){
        throw new ApiError(404, "Playlist not found");
    }

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    const playlistOwner = playlist.owner?.toString();
    const videoOwner = video.owner?.toString();

    if(playlistOwner && videoOwner !== req.user?._id.toString()){
        throw new ApiError(400, "Only owner can add video to playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                videos: videoId,
            },
        },
        {
            new: true,
        }
    );
    
    if(!updatedPlaylist){
        throw new ApiError(500, "Error while adding the videos to playlist");
    }

    return res.
        status(200).
        json(new ApiResponse(200, updatedPlaylist, "Added video to playlist successfully"));

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid playlistId or videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if(!playlist){
        throw new ApiError(404, "Playlist not found");
    }

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    const playlistOwner = playlist.owner?.toString();
    const videoOwner = video.owner?.toString();

    if(playlistOwner && videoOwner !== req.user?._id.toString()){
        throw new ApiError(400, "Only owner can remove video to playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId,
            },
        },
        {
            new: true,
        }
    )

    if(!updatedPlaylist){
        throw new ApiError(500, "Error while removing the video from the playlist");
    }

    return res.
        status(200).
        json(new ApiResponse(200, updatedPlaylist, "Removed video from the playlist successfully"));
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist = await Playlist.findById(playlistId);

    const playlistOwner = playlist.owner?.toString();
    if(playlistOwner !== req.user?._id.toString()){
        throw new ApiError(400, "Playlist owner can delete the playlist");
    }
    
    await Playlist.findByIdAndDelete(playlist?._id);

    return res.
        status(200).
        json(new ApiResponse(200, {}, "Playlist deleted successfully"));
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    if(name.toString() === "" || description.toString() === ""){
        throw new ApiError(400, "name and description both are required");
    }
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlistId");
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist){
        throw new ApiError(404, "Playlist not found");
    }

    const playlistOwner = playlist.owner?.toString();
    if(playlistOwner !== req.user?._id.toString()){
        throw new ApiError(400, "Only owner can updated playlist details");
    }

    playlist.name = name;
    playlist.description = description;

    const updatedPlaylist = await playlist.save({validateBeforeSave: true});

    return res.
        status(200).
        json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"));
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
