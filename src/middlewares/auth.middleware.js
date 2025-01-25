import { User } from "../models/user.model";
import ApiError from "../utils/ApiErrors";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
const verifyJwt = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN);
        if(!decodedToken){
            throw new ApiError(401, "Invalid token")
        }
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            //NEXT_VIDEO: to be discussed
            throw new ApiError(401, "Unauthorized request")
        }
        req.user = user;
        next();     
    } catch (error) {
        throw new ApiError(401, error?.message || "Unauthorized request" )
    }
}) 

export default verifyJwt;