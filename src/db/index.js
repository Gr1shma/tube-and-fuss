import mongoose from "mongoose";
import { databaseName } from "../constant.js";

const mongodbUrl = `${process.env.MONGODB_URI}/${databaseName}`;

const connectDb = async() => {
    try {
        const connectionInstance = await mongoose.connect(mongodbUrl);
        console.log(`Database connected sucessfully ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("Error while connecting the database"); 
        process.exit(1);
    }
}

export default connectDb;
