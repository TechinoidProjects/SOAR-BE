const db = require("../models");
const config = require("../config/auth.config");
const SurgicalVideo = db.surgical_videos;
const SurgicalVideoDetail = db.surgical_videos_detail;
const User = db.users;
const UserInfo = db.user_info;
const VideoAnnotations = db.video_annotations;
const { successResponse, errorResponse } = require('../common/response');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const multer = require('multer');
const { QueryTypes } = require('sequelize');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
  secretAccessKey: 'XtDRyqTSNrVg+WK8gCUA9sJYnXEd1AZim8kAHFp7',
  accessKeyId: 'AKIAXYKJRUCMUTWCJSHZ',
  region: 'eu-north-1'  // example: 'us-west-2'
});

const s3 = new AWS.S3();

// Multer setup for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Remove spaces and replace them with hyphens
    const fileName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video.mov', 'video/mkv', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
}).single('video_file');

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

    const surgeonAll = surgeons ? JSON.parse(surgeons) : [];

    const file = req.file;

    // Read the file from local file system
    const fileStream = fs.readFileSync(file.path);

    // Setting up S3 upload parameters
    const params = {
      Bucket: 'soarbackend',
      Key: `videos/${Date.now()}-${file.originalname}`,  // File name you want to save as in S3
      Body: fileStream,
      // ACL: 'public-read'
    };

    // Uploading files to the bucket

    try {
      const uploadVideo = await s3.upload(params).promise();
      if (uploadVideo) {
        // Save surgical video data
        const surgicalVideo = await SurgicalVideo.create({
          user_id: req.userId,
          date_performed: datePerformed,
          time: time,
          duration: duration,
          procedure_type: typeOfProcedure,
          ml_model_type: modelType,
          video_url: uploadVideo?.Location,
        });

        // Save each surgeon's details
        if (surgeonAll && surgeonAll.length) {
          await Promise.all(surgeonAll?.map(surgeon =>
            SurgicalVideoDetail.create({
              surgical_video_id: surgicalVideo.id,
              surgeon_name: surgeon.nameOfSurgeon,
              surgeon_type: surgeon.typeOfSurgeon
            })
          ));
        }

        // Return successful response
        return res.json(successResponse('Data uploaded successfully!'));
      } else {
        return res.status(400).json(errorResponse("Video is not uploaded."));
      }
    } catch (err) {
      return res.status(500).json(errorResponse(err.message));
    }
  });
};

exports.search_surgical_videos = async (req, res) => {
  const { procedure_type, surgeon, years_of_experience, durations, hospital, datePerformed, time_of_surgery,steps,errors,criterias,scores } = req.body;
  // Check if any filters are provided
  const isFiltered = procedure_type || surgeon || years_of_experience || durations || hospital || datePerformed || time_of_surgery || steps || errors || criterias || scores;
  if (!isFiltered) {
    // No filters provided, fetch default video list
    const surgicalVideos = await SurgicalVideo.findAll({
      include: [
        {
          model: User,
          as: 'user',
          include: [{
            model: UserInfo,
            as: 'user_infos', // Assuming 'user_infos' is correctly setup to fetch multiple or single UserInfo
            attributes: ['institution_name']
          }],
          attributes: ['username'] // Only fetch username from User
        },
        {
          model: SurgicalVideoDetail,
          as: 'surgical_videos_details',
          attributes: ['surgeon_name'] // Fetch surgeon name from SurgicalVideoDetail
        }
      ],
      attributes: ['id','duration', 'time', 'video_url','procedure_type'], // Attributes from SurgicalVideo
    });

    // Enhance response with video_title and filtered attributes
    const enhancedVideos = surgicalVideos.map(video => ({
      id: video.id,
      video_title: video?.procedure_type,
      institution_name: video?.user?.user_infos[0]?.institution_name, // Accessing first UserInfo
      surgeon_name: video.surgical_videos_details.map(detail => detail.surgeon_name).join(', '), // Joining all surgeon names
      duration: video.duration,
      time: video.time,
      video_url: video.video_url
    }));

    return res.json(successResponse(enhancedVideos));
  }
  else {
    // Prepare parameters for the stored procedure call
    const params = [
      `'${procedure_type}'`,
      `'${surgeon}'`,
      `'${years_of_experience}'`,
      durations ? `'${durations}'` : 'NULL',
      `'${hospital}'`,
      datePerformed ? `'${datePerformed}'` : 'NULL',
      time_of_surgery ? `'${time_of_surgery}'` : 'NULL',
      `'${steps}'`,
      `'${errors}'`,
      `'${criterias}'`,
      scores ? `'${scores}'` : 'NULL',
    ].join(',');

    const query = `CALL get_surgical_videos(${params}, 'rs_resultone'); FETCH ALL FROM "rs_resultone";`;

    db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT })
      .then(result => {
        result.splice(0, 1);
        return res.json(successResponse(result));
      })
      .catch(error => {
        return res.status(500).json(errorResponse(error.message));
      });
  }
};


function processAnnotations(annotations, filterLabel = null) {
  const uniqueAnnotations = new Map();

  annotations.forEach(annotation => {
    // If label_processed is null, set it to label
    if (!annotation.label_processed) {
      annotation.label_processed = annotation.label;
    }
    // Check if we should filter this label and if it matches the filter criteria
    if (filterLabel && annotation.label_processed === filterLabel) {
      return; // Skip this annotation
    }
    if (!uniqueAnnotations.has(annotation.label)) {
      uniqueAnnotations.set(annotation.label, annotation);
    }
  });

  // Convert the map values back to an array
  return Array.from(uniqueAnnotations.values());
}


exports.get_csv_data_ById = async (req, res) => {
  try {
    const videoId = req.params.id;
    const surgicalVideos = await SurgicalVideo.findAll({
      include: [
        {
          model: User,
          as: 'user',
          include: [{
            model: UserInfo,
            as: 'user_infos',
            attributes: ['institution_name']
          }],
          attributes: ['username']
        },
        {
          model: SurgicalVideoDetail,
          as: 'surgical_videos_details',
          attributes: ['surgeon_name']
        },
        {
          model: VideoAnnotations,
          as: 'video_annotations',
        }
      ],
      attributes: ['id', 'duration', 'time', 'video_url'],
      where: { id: videoId }
    });

    const [enhancedVideos] = surgicalVideos.map(video => {
      const steps = processAnnotations(video.video_annotations.filter(annotation => annotation.annotation_type === 'steps'));
      const errors = processAnnotations(video.video_annotations.filter(annotation => annotation.annotation_type === 'errors'), "Instrument tip out of view");
      const competency = processAnnotations(video.video_annotations.filter(annotation => annotation.annotation_type === null));

      const csv_data = [{competency: competency}, { steps: steps }, {errors: errors}];

      return {
        id: video.id,
        video_title: 'Cystoscopy Video',
        institution_name: video?.user?.user_infos[0]?.institution_name,
        surgeon_name: video.surgical_videos_details.map(detail => detail.surgeon_name).join(', '),
        duration: video.duration,
        time: video.time,
        video_url: video.video_url,
        csv_data: csv_data
      };
    });

    return res.json({ success: true, data: enhancedVideos });

  } catch (err) {
    console.error("Fetching surgical video data failed:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

// function mergeErrors(errors) {
//   const errorMap = new Map();

//   errors.forEach(error => {
//     if (errorMap.has(error.label)) {
//       const existing = errorMap.get(error.label);
//       existing.start_time = minTime(existing.start_time, error.start_time);
//       existing.end_time = maxTime(existing.end_time, error.end_time);
//     } else {
//       errorMap.set(error.label, {
//         ...error,
//         start_time: error.start_time,
//         end_time: error.end_time
//       });
//     }
//   });

//   return Array.from(errorMap.values());
// }

// function minTime(time1, time2) {
//   return time1 < time2 ? time1 : time2;
// }

// function maxTime(time1, time2) {
//   return time1 > time2 ? time1 : time2;
// }