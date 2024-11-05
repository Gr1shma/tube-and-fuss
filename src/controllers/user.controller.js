import { cookiesOptions } from "../constant.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


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

export {
    registerUser,
    loginUser,
    logoutUser,
}
