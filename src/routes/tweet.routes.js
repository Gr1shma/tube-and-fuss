import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJwt);

router.route("/").post(createTweet);
router.route("/user/:username").get(getUserTweets);
router.route("/:tweetId")
    .patch(updateTweet)
    .delete(deleteTweet);

export default router;
