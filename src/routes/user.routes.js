import { Router } from "express";
import {
  loginUser,
  logOutUser,
  registerUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAvatar,
  updateCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJwt from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/refreshToken").post(refreshAccessToken);

//secure routes

router.route("/logout").post(verifyJwt, logOutUser);
router.route("/changePassword").post(verifyJwt, changePassword);
router.route("/getCurrentUser").post(verifyJwt, getCurrentUser);
router.route("/updateAvatar").post(upload.fields({ name: "avatar", maxCount: 1}), verifyJwt, updateAvatar);
router.route("/updateCoverImage").post(upload.fields({ name: "coverImage", maxCount: 1}), verifyJwt, updateCoverImage);

export default router;
