const express = require("express");
const router = express.Router();

const { register, login, logout } = require("../controller/auth");
const authathuntcate = require("../middleware/midauth");

// Registration and login
router.post("/register", register);
router.post("/login", login);

// Protected profile route
router.get("/profile", authathuntcate, (req, res) => {
  res.json({ message: `Welcome user! ${req.user.userId}` });
});

// Logout routes (both POST and DELETE supported)
router.post("/logout", authathuntcate, logout); // POST /api/logout
router.delete("/logout", authathuntcate, logout); // DELETE /api/logout

module.exports = router;
