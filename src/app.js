import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { apiRootUrl, corsOptions, expressJsonOption, expressStaticRoot, expressUrlEncodedOptions } from "./constant.js";

const app = express();

app.use(cors(corsOptions));

app.use(express.json(expressJsonOption))
app.use(express.urlencoded(expressUrlEncodedOptions))
app.use(express.static(expressStaticRoot))

app.use(cookieParser())

import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import likeRouter from "./routes/like.routes.js";
import tweetRouter from "./routes/tweet.routes.js";

app.use(`${apiRootUrl}/users`, userRouter);
app.use(`${apiRootUrl}/videos`, videoRouter);
app.use(`${apiRootUrl}/likes`, likeRouter);
app.use(`${apiRootUrl}/tweets`, tweetRouter);

export { app };
