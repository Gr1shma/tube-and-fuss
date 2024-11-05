import connectDb from "./db/index.js";
import { app } from "./app.js";
import { defaultPort } from "./constant.js";

import dotenv from "dotenv";

dotenv.config({
    path:"./.env",
})

const port = process.env.PORT || defaultPort;

connectDb().
then(() => {
        app.listen(port, () => {
            console.log(`Database connected sucessfully \n And server is listening in port: ${port}`);
        })
    }).
catch((err) => {
        console.log(`Error occured while connecting to the server`, err);
    })
