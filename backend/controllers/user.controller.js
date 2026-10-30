const User = require("../models/user.model.js");
const generateToken = require("../utils/generateToken.js");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("name email role team isActive createdAt")
      .populate("team", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: { users },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch users",
    });
  }
};

// const register = async (req, res) => {
//   const { name, email, password } = req.body;
//   try {
//     const userExists = await User.findOne({ email });
//     if (userExists) {
//       return res.status(400).json({
//         message: "email is alredy exists",
//       });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashPassword = await bcrypt.hash(password, salt);

//     const newUser = new User({
//       name,
//       email,
//       password: hashPassword,
//     });
//     await newUser.save();
//     return res.status(201).json({
//       success: true,
//       message: "User Successfully Registerd",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Unable to register user",
//       error: error.message,
//     });
//   }
// };

const login = async (req,res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 2. Find user and explicitly include password
    const user = await User.findOne({email});
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email ",
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Contact the admin.",
      });
    }

    const token = generateToken(user._id);
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          team: user.team,
        },
      },
    });
  } catch (error) {
   console.error("Login failed :", error.message);
   return res.status(500).json({
    message:"Internal Server Error"
   })
      
  }
};


const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

const getMe = async (req, res) => {
  try {
   
    const user = await User.findById(req.user.id)
      .populate("team", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {login, logout, getMe, getAllUsers};
