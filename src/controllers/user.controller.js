import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { cookiesOptions } from "../constant.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";


const generateAccessAndRefreshToken = async(userId) => {
    try{
        const user = await User.findOne(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken}
    } catch(error){
            throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

const registerUser = asyncHandler( async(req, res) => {
    const {fullName, username, email, password} = req.body;
    if([email, username, fullName, password].some((field) => field.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser){
        throw new ApiError(409, "Same username or email");
    }
    const localAvatarFile = req.files?.avatar[0].path;
    if(!localAvatarFile){
        throw new ApiError(404, "Avatar file not found");
    }
    let avatar = await uploadOnCloudinary(localAvatarFile);
    const localCoverImage = req.files?.coverImage[0].path;
    let cover = await uploadOnCloudinary(localCoverImage);
    
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        avatar: avatar.url,
        coverImage: cover?.url || "",
        password,
    })
    const userInDb = await User.findOne(user?._id).select("-password -refreshtoken");
    if(!userInDb){
        throw new ApiError(500, "Error while creating user");
    }
    return res.status(201).json( new ApiResponse(201, userInDb, "User Created Sucessfully"));
});

const loginUser = asyncHandler( async(req, res) => {
    const { email, username, password } = req.body;
    if(!username && !email){
        throw new ApiError(400, "Email or username is required");
    }
    if(!password) {
        throw new ApiError(400, "Password is required");
    }
    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    if(!user){
        throw new ApiError(404, "User now exist");
    }
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if(!isPasswordCorrect){
        throw new ApiError(400, "Given Password is incorrect");
    }
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    return res.
        status(200).
        cookie("accessToken", accessToken, cookiesOptions).
        cookie("refreshToken", refreshToken, cookiesOptions).
        json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "Usser logged in sucessfully"
            )
        )
})

const logoutUser = asyncHandler( async(req, res) => {
    await User.findOneAndUpdate(req.user._id, {
        $unset: {
            refreshToken: 1,
        }
    }, {
            new: true
        });
    return res.
        status(200).
        clearCookie("accesToken", cookiesOptions).
        clearCookie("refreshToken", cookiesOptions).
        json(new ApiResponse(200, {}, "User logged out sucessfully"));
})


const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token");
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const {accessToken , refreshToken } = await generateAccessAndRefreshToken(user._id);
        return res.
            status(200).
            cookie("accessToken", accessToken, cookiesOptions).
            cookie("refreshToken", refreshToken, cookiesOptions).
            json(new ApiResponse(
                200,
                {accessToken, refreshToken},
                "Access token refresed"
            ))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token"); 
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(400, "Wrong Old Password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})
    return res.
        status(200).
        json(new ApiResponse(200, {}, "Password changed Sucessfully"));
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.
        status(200).
        json(new ApiResponse(200, req.user, "Current user fetched sucessfully"));
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body;
    if(!fullName || !email){
        throw new ApiError(400, "All fields are required");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
            }
        },{
            new: true // get updated data i.e changed data
        }
    ).select("-password")
    return res.
        status(200).
        json(new ApiResponse(200, user, "Account details Updated Sucessfully"));
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(404, "Avatar file not found");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar){
        new ApiError(400, "Error while uploading on avatar");
    }

    const user = await User.findById(req.user?._id).select("-password");
    if(!user){
        throw new ApiError(400 ,"Unauthorized request");
    }

    const oldUserAvatarURL = user.avatar;

    user.avatar = avatar.url;
    user.save({validateBeforeSave: false}).then(await deleteFromCloudinary(oldUserAvatarURL, true)).catch(err => {
        throw new ApiError(500, `Error while updating avatar\n${err}`);
    })
    

    return res.
        status(200).
        json(new ApiResponse(200, user, "Avatar updated Sucessfully"));
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(404, "Cover image file not found");
    }
    const cover = await uploadOnCloudinary(coverImageLocalPath);
    if(!cover){
        new ApiError(400, "Error while uploading on avatar");
    }

    const user = await User.findById(req.user?._id).select("-password");
    if(!user){
        throw new ApiError(400, "Unauthorized Request");
    }

    const oldUserCoverImageUrl = user.coverImage;

    user.coverImage = cover.url; 
    await user.save({validateBeforeSave: false}).then(await deleteFromCloudinary(oldUserCoverImageUrl)).catch(err => {
        throw new ApiError(`Error while updating cover image\n ${err}`);
    });

    return res.
        status(200).
        json(new ApiResponse(200, user, "Avatar updated Sucessfully"));
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const { username } = req.params
    if(!username?.trim()){
        throw new ApiError(404, "username not found");
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            }
        },{
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"  // whom subscribed me
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo" // whom i subscribed to
            }
        },{
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false,
                    }
                }
            }
        },{
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    ])
    if(!channel.length){
        throw new ApiError(404, "Channel does no exists");
    }
    return res.
        status(200).
        json(new ApiResponse(200, channel[0], "user channel fetched"));
})

const getWatchHistory = asyncHandler(async(req, res)=> {
    const user = await User.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1,
                                        }
                                    }
                                ]
                            },
                        }, {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            },
        ]);

    return res.
        status(200).
        json(new ApiResponse(200, user[0].watchHistory, "Watch History fetched sucessfully"));
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}
