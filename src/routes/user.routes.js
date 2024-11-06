import { Router } from "express";

import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(upload.fields([
    {name: 'avatar', maxCount: 1},
    {name: 'coverImage', maxCount: 1}
]), registerUser );
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

router.route("/logout").post(verifyJwt,logoutUser);

router.route("/current-user").get(verifyJwt, getCurrentUser);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/update-account").patch(verifyJwt, updateAccountDetails);

router.route("/change-avatar").patch(verifyJwt, upload.single("avatar"), updateUserAvatar);
router.route("/change-cover-image").patch(verifyJwt, upload.single("coverImage"), updateUserCoverImage);

router.route("/u/:username").get(verifyJwt, getUserChannelProfile);
router.route("/watch-history").get(verifyJwt, getWatchHistory);

export default router;
