import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiErrors.js";
import User from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";



const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { username, email, fullName, password } = req.body;

  // validation - not empty

  if (
    [username, email, fullName, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required");
  }
  // check if user already exists: username, email
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // check for images, check for avatar

  const avatarLocalPath = req.files.avatar[0].path;
  const coverImageLocalPath = req.files.coverImage[0].path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // upload them to cloudinary, avatar

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Error uploading avatar");
  }

  // create user object - create entry in db

  const user = await User.create({
    username :username.toLowerCase(),
    fullName,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  })

  
  // remove password and refresh token field from response

  const createdUser = User.findOne(user._id).select("-password -refreshToken");

  // check for user creation

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user.");
  } 
  // return res

  return res.status(200).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  )
});

export { registerUser };
