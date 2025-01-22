import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    //upload on cloudinary
    const response =  await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(filePath)
    return response;
  } catch (error) {
    fs.unlinkSync(filePath)
    return null;
  }
};

export { uploadOnCloudinary }