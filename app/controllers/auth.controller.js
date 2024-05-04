const db = require("../models");
const config = require("../config/auth.config");
const User = db.users;
const Role = db.roles;
const UserRole = db.user_role;

const {
  successResponse,
  errorResponse
} = require('../common/response');
const Op = db.Sequelize.Op;

var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const logger = require("../../logs/logger.js");
const nodemailer = require("nodemailer");
require('dotenv').config();
const {
  saveUserValidations,
} = require('../validations/validation');

exports.signup = async (req, res) => {
  // Validate incoming request
  const { error } = saveUserValidations(req.body);
  if (error) return res.status(400).send(errorResponse(error.details[0].message, {}));

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: req.body.email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Encrypt password
    const hashedPassword = bcrypt.hashSync(req.body.password, 8);

    // Create new user with role
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
    });

    if (user) {


      // Save role to user_role table
      const userRole = await UserRole.create({
        user_id: user.id,
        role_id: 2
      });

      // Assign role name based on role ID
      let rolename = "";
      if (userRole.role_id === 1) {
        rolename = 'Admin';
      } else if (userRole.role_id === 2) {
        rolename = 'User';
      }

      // Generate JWT token
      const accessToken = jwt.sign(
        { id: user.id, role: rolename },
        '72ce6cd3-e9a8-4fb5-b49b-55e3744ae677', // Use a secure, environment-specific key
        { expiresIn: '24h' } // Token expiration time
      );

      // Return successful response with relevant user details
      return res.status(201).json({
        data: {
          user: {
            data: {
              displayName: user.username,
              email: user.email,
              photoURL: req.body.photoUrl || '', // Set a default or provided photo URL
              role: rolename,
              uid: user.id
            },
          },
          access_token: accessToken // You'll need to generate this token as per your auth specifications
        }
      });
    } else {
      throw new Error("Failed to create user.");
    }
  } catch (err) {
    // Handle potential errors
    return res.status(500).json({ message: err.message });
  }
};