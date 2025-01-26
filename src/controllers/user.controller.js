import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

//  helper functions

const genereteAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {}
};

// controller functions
// register user

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
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // check for images, check for avatar

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

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
    username: username.toLowerCase(),
    fullName,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // remove password and refresh token field from response

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user.");
  }
  // return res

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});
// login user

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Email or username is required");
  }

  // check is any user is registered with that username or email

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  // verify the password

  const isValidPassword = await user.isPasswordCorrect(password);

  if (!isValidPassword) {
    throw new ApiError(401, "Wrong password");
  }

  // generate access and refresh tokens

  const { accessToken, refreshToken } = await genereteAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // update them to res and cookies

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "Logged in successfully"
      )
    );
});
// logout user

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  //remove cookies

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});
// refresh access token

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Invalid Token");
  }
  const docodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN
  );

  const user = await User.findById(docodedToken?._id);

  if (!user) {
    throw new ApiError(401, "Unauthorized request");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const { accessToken, newRefreshToken } = await genereteAccessAndRefreshTokens(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        "Access token refreshed"
      )
    );
});
// change current password

const changePassword = asyncHandler(async (req, res) => {
  const { newPassword, oldPassword } = req.body;
  const user = await User.findById(req.user?._id);

  if (!(await user.isPasswordCorrect(oldPassword))) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;

  user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
// get current user

const getCurrentUser = asyncHandler(async (req, res) => [
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully")),
]);
// update account details
  //TODO: to be done when necesary


// update user avatar

const updateAvatar = asyncHandler( async (req, res) => {

  const avatarLocalUrl = req.file?.path

  if (!avatarLocalUrl) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalUrl)

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id, 
    {
      $set: {
        avatar: avatar.url
      }
    },{
      new: true
    }
  )

  res
  .status(200)
  .json(200,
    user,
    "Avatar updated successfully"
  )
})
// update user coverImage

const updateCoverImage = asyncHandler( async (req, res) => {

  const coverImageLocalUrl = req.file?.path

  if (!coverImageLocalUrl) {
    throw new ApiError(400, "Cover Image file is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalUrl)

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id, 
    {
      $set: {
        coverImage: coverImage.url
      }
    },{
      new: true
    }
  )

  res
  .status(200)
  .json(200,
    user,
    "Cover Image updated successfully"
  )
})

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAvatar,
  updateCoverImage,
};
