import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { savePhoto, removePhoto } from "../services/accountPhotoStorage.js";

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

// ================= FORGOT PASSWORD =================
// Self-service reset with no OTP / email link (by request): the user supplies
// their registered email and a new password, and if that email exists its
// password hash is replaced. No session is issued — the user then logs in
// with the new password through the unchanged login flow.
export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    // Plain strings only — an object like {"$gt": ""} would otherwise be run
    // as a MongoDB query and match an arbitrary account (same guard as login).
    if (typeof email !== "string" || typeof newPassword !== "string") {
      return res
        .status(400)
        .json({ message: "Email and new password are required" });
    }
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No account found with that email" });
    }

    // Same hashing as signup / change-password (bcrypt, cost 12).
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ================= DISMISS NOTIFICATIONS (delete) =================
// Notifications have no rows of their own — they're derived from the user's
// bookings/galleries/inquiries/profile (see dashboard-ui lib/notifications.js).
// "Deleting" one records its id here, on the signed-in user's own record, so
// the feed filters it out permanently. The underlying booking/gallery/inquiry
// is never touched. Owner is always req.userId from the JWT.
const MAX_DISMISSED = 5000;
export const dismissNotifications = async (req, res) => {
  try {
    const { ids } = req.body;
    // Plain string ids only — nothing else goes into the set.
    const clean = Array.isArray(ids)
      ? [...new Set(ids.filter((id) => typeof id === "string" && id.trim()))]
      : null;
    if (!clean || clean.length === 0) {
      return res
        .status(400)
        .json({ message: "ids must be a non-empty list of notification ids" });
    }

    // timestamps:false — deleting a notification must not bump updatedAt, or
    // the feed would raise a spurious "Profile Updated" notification.
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $addToSet: { dismissedNotifications: { $each: clean } } },
      { new: true, timestamps: false }
    ).select("dismissedNotifications");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Keep the set bounded — drop the oldest ids if it ever grows too large.
    if (user.dismissedNotifications.length > MAX_DISMISSED) {
      user.dismissedNotifications = user.dismissedNotifications.slice(-MAX_DISMISSED);
      await user.save();
    }

    res.status(200).json({
      message: "Notifications deleted",
      dismissedNotifications: user.dismissedNotifications,
    });
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
    await removePhoto(deleted?.profilePhoto, { userId });
    await removePhoto(deleted?.businessPhoto, { userId });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

// ================= ACCOUNT PHOTOS (profile / business) =================
// The photo is stored in MongoDB (services/accountPhotoStorage.js) so it
// survives server restarts; only its URL is saved, in `field` of the
// authenticated user's own record — the owner is always req.userId from the
// JWT, never anything the client sends.
const photoUpdater = (field, label) => async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "Please select a photo to upload" });
  }
  if (!file.size) {
    return res.status(400).json({ message: "The selected photo is empty" });
  }
  let url;
  try {
    url = await savePhoto(file.buffer, {
      contentType: file.mimetype,
      filename: file.originalname,
      userId: req.userId,
    });
    const previous = await User.findByIdAndUpdate(
      req.userId,
      { [field]: url },
      { new: false }
    ).select(field);
    if (!previous) {
      await removePhoto(url);
      return res.status(404).json({ message: "User not found" });
    }
    // Replaced — delete this user's old photo from storage.
    if (previous[field] !== url) await removePhoto(previous[field], { userId: req.userId });

    const user = await User.findById(req.userId).select("-password");
    res.status(200).json({ message: `${label} updated`, user });
  } catch {
    if (url) await removePhoto(url);
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
    await removePhoto(previous[field], { userId: req.userId });

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
