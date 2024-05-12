const db = require("../models");
const config = require("../config/auth.config");
const SurgicalVideo = db.surgical_videos;
const SurgicalVideoDetail = db.surgical_videos_detail;
const {successResponse,errorResponse} = require('../common/response');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const multer = require('multer');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
  secretAccessKey: 'XtDRyqTSNrVg+WK8gCUA9sJYnXEd1AZim8kAHFp7',
  accessKeyId: 'AKIAXYKJRUCMUTWCJSHZ',
  region: 'eu-north-1'  // example: 'us-west-2'
});

const s3 = new AWS.S3();

// Configure multer to use S3 for storage
const upload = multer({
  storage: multerS3({
      s3: s3,
      bucket: 'soarbackend',
      acl: 'public-read',
      metadata: function (req, file, cb) {
          cb(null, {fieldName: file.fieldname});
      },
      key: function (req, file, cb) {
          cb(null, Date.now().toString() + '-' + file.originalname)
      }
  })
}).single('video');
  
  // API to save surgical videos
  exports.save_surgical_videos = async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      const {
        surgeons,
        datePerformed,
        time,
        duration,
        typeOfProcedure,
        modelType,
      } = req.body;
  
      const video_url = req.file ? req.file.location : null;
  
      try {
        
       // Save surgical video data
        const surgicalVideo = await SurgicalVideo.create({
          user_id : req.userId,  
          date_performed : datePerformed,
          time : time,
          duration : duration,
          procedure_type : typeOfProcedure,
          ml_model_type : modelType,
          video_url : video_url,
        });

         // Save each surgeon's details
         if (surgeons && surgeons.length) {
          await Promise.all(surgeons.map(surgeon =>
              SurgicalVideoDetail.create({
                  surgical_video_id: surgicalVideo.id,
                  surgeon_name: surgeon.nameOfSurgeon,
                  surgeon_type: surgeon.typeOfSurgeon
              })
          ));
      }

    // Return successful response
    return res.json(successResponse('Data uploaded successfully!'));
      } catch (err) {
        return res.status(500).json(errorResponse(err.message));
      }
    });
  };

  // API to get surgical videos
  exports.get_surgical_videos = async (req, res) => {
    try {
        const surgicalVideos = await SurgicalVideo.findAll({
          where: { user_id: req.userId }
        });
        return res.json(successResponse(surgicalVideos));
      } catch (err) {
        return res.status(500).json(errorResponse(err.message));
      }
  };