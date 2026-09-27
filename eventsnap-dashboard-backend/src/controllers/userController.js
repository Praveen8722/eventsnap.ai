// import { use } from "react";

// import User from "../models/User.js";
// export const create = async (req, res) => {
//   try {
//     const userData = new User(req.body);
//     const { email } = userData;

//     const userExists = await User.findOne({ email });
//     if (userExists) {
//       return res.status(400).json({ message: "User Already Exists" });
//     }
//     const savedUser = await userData.save();
//     res.status(200).json(savedUser);
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// export const axios = async (req, res) => {
//   try {
//     const users = await User.find();
//     if (users.length === 0) {
//       return res.status(404).json({ message: "User Not Found" });
//     }
//     res.status(200).json(users);
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// export const update = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const userExists = await User.findOne({ _id: id });
//     if (!userExists) {
//       return res.status(404).json({ message: "User Not Found" });
//     }
//     const updatedUser = await User.findByIdAndUpdate(id, req.body, {
//       new: true,
//     });
//     res.status(200).json(updatedUser);
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// export const deleteUser = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const userExists = await User.findOne({ _id: id });
//     if (!userExists) {
//       return res.status(404).json({ message: "User Not Found" });
//     }
//     await User.findByIdAndDelete(id);
//     res.status(201).json({ message: "User Deleted Successfully" });
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };


