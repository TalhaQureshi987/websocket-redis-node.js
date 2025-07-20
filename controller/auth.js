const { User } = require("../model/authmodel");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { redisClient, publisher } = require("../config/redisClient");
const jwt = require("jsonwebtoken");

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Email, password, and username are required" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: name,
      email: email,
      password: hashedPassword,
    });

    return res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ error: "Email and password are required." });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid credentials." });

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "2h" });
    await redisClient.set(user.id.toString(), token);

    // ✅ Publish login event
    await publisher.publish(
      "user_notifications",
      `${user.username} (${user.email}) has logged in`
    );

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get Profile
exports.profile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findByPk(userId, {
      attributes: ["username", "email"],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findByPk(userId);

    await redisClient.del(userId.toString());

    if (user) {
      console.log(`${user.username} (${user.email}) has logged out`);
    }

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Failed to logout" });
  }
};

