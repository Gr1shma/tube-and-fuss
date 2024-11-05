import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
import { cloudinaryConfig } from '../constant.js';

cloudinary.config(cloudinaryConfig);

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        fs.unlinkSync(localFilePath);
        return response;
    } catch (err){
        fs.unlinkSync(localFilePath)
        return null;
    }
}

export { uploadOnCloudinary }
