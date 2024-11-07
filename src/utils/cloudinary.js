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

const deleteFromCloudinary = async(fileUrl, isImage) => {
    try{
        if(!fileUrl) return null
        let resourceType = "";

        if(isImage){
            resourceType = "image";
        } else {
            resourceType = "video";
        }

        const public_id = fileUrl.split("/").pop().split(".")[0];
        console.log(fileUrl);
        await cloudinary.uploader.destroy(public_id, {
            resource_type: resourceType 
        })

    } catch (err){
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary }
