import fs from "fs";
import path from "path";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PROFILE_UPLOAD_DIR } from "../middleware/uploadProfile.js";

const PROFILE_URL_PREFIX = "/uploads/profile/";

// Only ever removes a file this feature created — never an arbitrary path.
const removeProfileFile = (url) => {
  if (!url || !url.startsWith(PROFILE_URL_PREFIX)) return;
  fs.promises
    .unlink(path.join(PROFILE_UPLOAD_DIR, path.basename(url)))
    .catch(() => {});
};

// ================= SIGNUP =================
export const signup = async (req, res) => { 
  try {
    const { name, businessName, email, phone, password, confirmPassword } =
      req.body;

    // Plain strings only — an object like {"$ne": null} would otherwise be
    // run as a MongoDB query operator.
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 1.  Validate password
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password do not match" });
    }
    // 2. Check existing user
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User Already Exists" });
    }
    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Save user
    const newUser = new User({
      name,
      businessName,
      email,
      phone,
      password: hashedPassword,
    });
    await newUser.save();

    // 5. Generate JWT Token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({ message: "Signup successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Plain strings only — an object like {"$regex": "^lalitha"} would
    // otherwise be run as a MongoDB query and could log into someone else's
    // account with just a guessed password.
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 1. Check user existence
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Validate/Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // 3. Generate JWT Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ================= DASHBOARD (resolve signed-in user) =================
// Login/signup responses carry only { message, token } — no user object —
// so the frontend calls this right after to resolve the photographer's own
// record (name, businessName, etc.) for its session/localStorage. See
// eventsnap-dashboard-ui/src/lib/session.js's establishSession().
export const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "Welcome to the dashboard!", userId: req.userId, user });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ================= EDIT PROFILE =================
export const editProfile = async (req, res) => {
  try {
    const userId = req.userId; // from token
    const { name, businessName, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, businessName, phone },
      { new: true }
    ).select("-password"); // never send the password hash to the browser

    res
      .status(200)
      .json({ messsage: "Profile updated successfully", user: updatedUser });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

// ================= CHANGE PASSWORD =================
export const changePassword = async (req, res) => {
  try {
    const userId = req.userId; // from token
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // 1.  Get user
    const user = await User.findById(userId);

    // 2. Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // 3.  Check new password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 4. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 5. Save new password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

// ================= DELETE ACCOUNT =================
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId; // from token

    const deleted = await User.findByIdAndDelete(userId);
    removeProfileFile(deleted?.profilePhoto);
    removeProfileFile(deleted?.businessPhoto);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

// ================= ACCOUNT PHOTOS (profile / business) =================
// The file is already on disk (middleware/uploadProfile.js); only its URL is
// saved, in `field` of the authenticated user's own record — the owner is
// always req.userId from the JWT, never anything the client sends.
const photoUpdater = (field, label) => async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "Please select a photo to upload" });
  }
  const url = `${PROFILE_URL_PREFIX}${file.filename}`;
  if (!file.size) {
    removeProfileFile(url);
    return res.status(400).json({ message: "The selected photo is empty" });
  }
  try {
    const previous = await User.findByIdAndUpdate(
      req.userId,
      { [field]: url },
      { new: false }
    ).select(field);
    if (!previous) {
      removeProfileFile(url);
      return res.status(404).json({ message: "User not found" });
    }
    // Replaced — remove this user's old file.
    if (previous[field] !== url) removeProfileFile(previous[field]);

    const user = await User.findById(req.userId).select("-password");
    res.status(200).json({ message: `${label} updated`, user });
  } catch {
    removeProfileFile(url);
    res.status(500).json({ message: "Server Error" });
  }
};

const photoRemover = (field, label) => async (req, res) => {
  try {
    const previous = await User.findByIdAndUpdate(
      req.userId,
      { [field]: "" },
      { new: false }
    ).select(field);
    if (!previous) {
      return res.status(404).json({ message: "User not found" });
    }
    removeProfileFile(previous[field]);

    const user = await User.findById(req.userId).select("-password");
    res.status(200).json({ message: `${label} removed`, user });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateProfilePhoto = photoUpdater("profilePhoto", "Profile photo");
export const deleteProfilePhoto = photoRemover("profilePhoto", "Profile photo");
export const updateBusinessPhoto = photoUpdater("businessPhoto", "Business photo");
export const deleteBusinessPhoto = photoRemover("businessPhoto", "Business photo");
