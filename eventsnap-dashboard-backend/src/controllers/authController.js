import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ================= SIGNUP =================
export const signup = async (req, res) => { 
  try {
    const { name, businessName, email, phone, password, confirmPassword } =
      req.body;

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
    );

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

    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted successfully" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};
