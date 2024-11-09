import { Router } from 'express';
import {
    getSubscribedChannels,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(verifyJwt);

router.route("/c/:username").post(toggleSubscription);

router.route("/").get(getSubscribedChannels);

export default router
