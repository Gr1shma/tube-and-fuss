import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { expressJsonOption, expressStaticRoot, expressUrlEncodedOptions } from "./constant";

const app = express();

app.use(cors(corsOptions));

app.use(express.json(expressJsonOption))
app.use(express.urlencoded(expressUrlEncodedOptions))
app.use(express.static(expressStaticRoot))

app.use(cookieParser())

app.get("/" , (req, res) => {
    res.send("Hello world");
});

export { app };
