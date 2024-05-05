const db = require("../models");
const config = require("../config/auth.config");
const User = db.users;
const Role = db.roles;
const UserRole = db.user_role;
const {successResponse,errorResponse} = require('../common/response');
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require('dotenv').config();
const { saveUserValidations} = require('../validations/validation');

exports.signup = async (req, res) => {
  // Validate incoming request
  const { error } = saveUserValidations(req.body);
  if (error) return res.status(400).send(errorResponse(error.details[0].message));

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: req.body.email } });
    if (existingUser) {
      return res.status(400).json(errorResponse("User already exists"));
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
        rolename = ['admin'];
      } else if (userRole.role_id === 2) {
        rolename = ['user'];
      }

      // Generate JWT token
      const accessToken = jwt.sign(
        { id: user.id, role: rolename },
        '72ce6cd3-e9a8-4fb5-b49b-55e3744ae677', // Use a secure, environment-specific key
        { expiresIn: '24h' } // Token expiration time
      );

      // Format the response using the successResponse function
      const responseData = {
        user: {
          data: {
            displayName: user.username,
            email: user.email,
            photoURL: req.body.photoUrl || 'default-avatar-url', // Set a default or provided photo URL
          },
          role: rolename,
          uid: user.id
        },
        access_token: accessToken
      };
      // Return successful response with relevant user details
      return res.json(successResponse(responseData));
    } else {
      throw new Error("Failed to create user.");
    }
  } catch (err) {
    // Handle potential errors
    return res.status(500).json(errorResponse(err.message));
  }
};

exports.signin = async (req, res) => {
  // Validate incoming request
  // const { error } = signinValidations(req.body);
  // if (error) return res.status(400).json(errorResponse(error.details[0].message));

  try {
    // Check if user exists
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) {
      return res.status(400).json(errorResponse("User not found"));
    }

    // Compare passwords
    const validPassword = bcrypt.compareSync(req.body.password, user.password);
    if (!validPassword) {
      return res.status(401).json(errorResponse("Invalid password"));
    }
    // Fetch user role
    const userRole = await UserRole.findOne({ where: { user_id: user.id } });
    let rolename = '';
    if (userRole.role_id === 1) {
      rolename = ['admin'];
    } else if (userRole.role_id === 2) {
      rolename = ['user'];
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { id: user.id, role: rolename },
      '72ce6cd3-e9a8-4fb5-b49b-55e3744ae677', // Use a secure, environment-specific key
      { expiresIn: '24h' } // Token expiration time
    );

    // Format the response using the successResponse function
    const responseData = {
      user: {
        data: {
          displayName: user.username,
          email: user.email,
          photoURL: req.body.photoUrl || 'default-avatar-url', // Set a default or provided photo URL
        },
        role: rolename,
        uid: user.id
      },
      access_token: accessToken
    };

    // Return successful response
    return res.json(successResponse(responseData));
  } catch (err) {
    // Handle potential errors
    return res.status(500).json(errorResponse(err.message));
  }
};

exports.signinWithToken = async (req, res) => {
  // Retrieve the token from request headers
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json(errorResponse("No token provided"));

  try {
    // Verify the token
    const tokenFinal = token.split(' ')[1];
    const decoded = jwt.verify(tokenFinal, '72ce6cd3-e9a8-4fb5-b49b-55e3744ae677');

    // Retrieve user information
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(404).json(errorResponse("User not found"));

    // Retrieve user role
    const userRole = await UserRole.findOne({ where: { user_id: user.id } });
    let rolename = '';
    if (userRole.role_id === 1) {
      rolename = ['admin'];
    } else if (userRole.role_id === 2) {
      rolename = ['user'];
    }

    // Format the response using the successResponse function
    const responseData = {
      user: {
        data: {
          displayName: user.username,
          email: user.email,
          photoURL: user.photoUrl || 'default-avatar-url', // Set a default or provided photo URL
        },
        role: rolename,
        uid: user.id
      }
    };

    // Return successful response
    return res.json(successResponse(responseData));
  } catch (err) {
    // Handle potential errors
    return res.status(500).json(errorResponse(err.message));
  }
};