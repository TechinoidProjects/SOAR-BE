const db = require("../models");
const config = require("../config/auth.config");
const User = db.users;
const Role = db.roles;
const UserRole = db.user_role;
const UserInfo = db.user_info;
const {successResponse,errorResponse} = require('../common/response');
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { saveUserValidations} = require('../validations/validation');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const userId = req.userId;
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${userId}${ext}`);
  }
});

const upload = multer({ storage });


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
            photoURL: user?.image_url || 'default-avatar-url', // Set a default or provided photo URL
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
          photoURL: user?.image_url || 'default-avatar-url', // Set a default or provided photo URL
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
  try {

    // Retrieve user information
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json(errorResponse("User not found"));

    // Retrieve user role
    const userRole = await UserRole.findOne({ where: { user_id: user.id } });
    let rolename = '';
    if (userRole.role_id === 1) {
      rolename = ['admin'];
    } else if (userRole.role_id === 2) {
      rolename = ['user'];
    }

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
          photoURL: user?.image_url || 'default-avatar-url', // Set a default or provided photo URL
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


exports.updateProfile = async (req, res) => {
  try {
      const userId  = req.userId;
      const { email, mobileNumber, institutionName, surgicalExperienceLevel, yearOfClinicalResidency, yearsOfClinicalExperience, surgicalSubSpeciality } = req.body;

      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
          return res.status(400).json(errorResponse("User not found"));
      }

      // Update user's email and phone
      user.email = email || user?.email;
      user.phone_no = mobileNumber || user?.mobileNumber;
      await user.save();

      // Check if the user's additional info already exists
      let userInfo = await UserInfo.findOne({ where: { user_id : userId } });

      if (!userInfo) {
          // Create new user_info if not existing
          userInfo = await UserInfo.create({
              user_id: userId,
              institution_name: institutionName,
              surgical_experience_level: surgicalExperienceLevel,
              year_of_clinical_residency: yearOfClinicalResidency,
              years_of_clinical_experience: yearsOfClinicalExperience,
              surgical_sub_speciality: surgicalSubSpeciality
          });
      } else {
          // Update existing user_info fields
          userInfo.institution_name = institutionName;
          userInfo.surgical_experience_level = surgicalExperienceLevel;
          userInfo.year_of_clinical_residency = yearOfClinicalResidency;
          userInfo.years_of_clinical_experience = yearsOfClinicalExperience;
          userInfo.surgical_sub_speciality = surgicalSubSpeciality;
          await userInfo.save();
      }

      // Return a success response with updated profile details
      return res.json(successResponse({
          user: {
              email: user?.email,
              phone: user?.phone
          },
          userInfo: {
              institutionName: userInfo?.institution_name,
              surgicalExperienceLevel: userInfo?.surgical_experience_level,
              yearOfClinicalResidency: userInfo?.year_of_clinical_residency,
              yearsOfClinicalExperience: userInfo?.years_of_clinical_experience,
              surgicalSubSpeciality: userInfo?.surgical_sub_speciality
          }
      }));

  } catch (err) {
      // Handle errors using the errorResponse function
      return res.status(500).json(errorResponse(err.message));
  }
};

exports.getProfileDetails = async (req, res) => {
  try {
    const userId = req.userId;

    // Check if user exists
    const user = await User.findByPk(userId, {
      attributes: ['email', 'phone_no'],
      include: [
        {
          model: UserInfo,
          as: 'user_info',
          attributes: [
            'institution_name',
            'surgical_experience_level',
            'year_of_clinical_residency',
            'years_of_clinical_experience',
            'surgical_sub_speciality',
          ],
        },
      ],
    });

    if (!user) {
      return res.status(400).json(errorResponse('User not found'));
    }

    // Return a success response with user details
    return res.json(
      successResponse({
        user: {
          email: user.email,
          phone: user.phone_no,
        },
        userInfo: {
          institutionName: user.user_info[0]?.institution_name,
          surgicalExperienceLevel: user.user_info[0]?.surgical_experience_level,
          yearOfClinicalResidency: user.user_info[0]?.year_of_clinical_residency,
          yearsOfClinicalExperience: user.user_info[0]?.years_of_clinical_experience,
          surgicalSubSpeciality: user.user_info[0]?.surgical_sub_speciality,
        },
      })
    );
  } catch (err) {
    return res.status(500).json(errorResponse(err.message));
  }
};

const removeOldAvatar = (avatarPath) => {
  if (avatarPath && fs.existsSync(avatarPath)) {
    fs.unlinkSync(avatarPath);
  }
};

exports.uploadAvatar = [
  upload.single('avatar'),
  async (req, res) => {
    try {
      const userId = req.userId;
      const avatarPath = req.file ? `uploads/${req.file.filename}` : '';

      // Update the user record in the database
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json(errorResponse('User not found.'));
      }

      const avatarFilePath = path.join(__dirname, '..', avatarPath);
      const base64Data = fs.readFileSync(avatarFilePath, { encoding: 'base64' });

      // Save the file path and base64 data in the database
      user.avatar = avatarPath;
      user.image_url = `data:image/${path.extname(req.file.originalname).replace('.', '')};base64,${base64Data}`;
      await user.save();

      const oldAvatarPath = path.join(__dirname, '..', avatarPath);
      removeOldAvatar(oldAvatarPath);

      return res.json(successResponse({ avatar: user?.image_url }));
    } catch (err) {
      console.error(err);
      return res.status(500).json(errorResponse('Error uploading avatar.'));
    }
  }
];

