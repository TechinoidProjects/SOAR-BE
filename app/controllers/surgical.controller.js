const db = require("../models");
const config = require("../config/auth.config");
const SurgicalVideo = db.surgical_videos;
const SurgicalVideoDetail = db.surgical_videos_detail;
const User = db.users;
const UserInfo = db.user_info;
const VideoAnnotations = db.video_annotations;
const { successResponse, errorResponse } = require("../common/response");
const fs = require("fs");
const path = require("path");
const { s3Client } = require("../middleware/s3Client");
const { upload } = require("../middleware/uploadMiddleware");
const multer = require("multer");
const { QueryTypes } = require("sequelize");
const axios = require("axios");
const csv = require("csv-parser");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const fetchAndInsertCSV = async(csvUrl, surgicalVideoId) =>{
  return new Promise(async function(resolve, reject){
    try {
      const response = await axios.get(csvUrl, { responseType: "stream" });
      const csvStream = response.data;
  
      // Parse the CSV data
      for await (const row of csvStream.pipe(csv())) {
        try {
          // Assign surgicalVideoId to each row before insertion
          row.surgical_video_id = surgicalVideoId;
          console.log(row);
          await VideoAnnotations.create(row); // Assuming VideoAnnotations is your model
        } catch (error) {
          console.error("Error inserting row:", error);
        }
      }
      resolve(true);
      console.log("CSV file successfully processed.");
    } catch (error) {
      console.error("Error fetching CSV:", error);
    }
  })

}

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
      Bucket: "soarbackend",
      Key: `videos/${Date.now()}-${file.originalname}`, // File name you want to save as in S3
      Body: fileStream,
    };

    // Uploading files to the bucket
    try {
      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      // Construct the video URL
      const videoUrl = `https://${params.Bucket}.s3.eu-north-1.amazonaws.com/${params.Key}`;

      //  Save surgical video data
      const surgicalVideo = await SurgicalVideo.create({
        user_id: req.userId,
        date_performed: datePerformed,
        time,
        duration,
        procedure_type: typeOfProcedure,
        ml_model_type: modelType,
        video_url: videoUrl,
      });

      //  Save each surgeon's details
      if (surgeonAll && surgeonAll.length) {
        await Promise.all(
          surgeonAll.map((surgeon) =>
            SurgicalVideoDetail.create({
              surgical_video_id: surgicalVideo.id,
              surgeon_name: surgeon.nameOfSurgeon,
              surgeon_type: surgeon.typeOfSurgeon,
            })
          )
        );
      }

      // Make the first API call
      const preProcessingApi = await axios.post(
        `${process.env.PREPROCESSINGURL}`,
        {
          lovit_model_path:
            "/home/ubuntu/soarmlserver/SOAR-step-model-master/scripts/step_encoder.pth",
          video_path: videoUrl,
          features_dir:
            "/home/ubuntu/soarmlserver/SOAR-step-model-master/features",
        }
      );

      // Check if the first API call was successful
      if (preProcessingApi.status === 200) {
        // Extract the video name without extension
        const featspath = preProcessingApi.data.feats_path;
        // Make the second API call
        const segmentationApi = await axios.post(
          `${process.env.SEGMENTATIONURL}`,
          {
            checkpoint: "/path/to/step_model/checkpoint",
            feats_path: featspath,
            output_dir: "/path/to/outputs/directory",
          }
        );
        if (segmentationApi.status === 200) {
          await fetchAndInsertCSV(
            `${segmentationApi.data.csv_url}`,
            `${surgicalVideo.id}`
          );
        }
      }

      // Return successful response
      return res.json({
        success: true,
        message: "Data uploaded successfully!",
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      // Optionally, delete the file from the local file system
      fs.unlinkSync(file.path);
    }
  });
};
// API to save surgical videos
// exports.save_surgical_videos = async (req, res) => {
//   upload(req, res, async (err) => {
//     if (err) {
//       return res.status(400).json({ success: false, message: err.message });
//     }

//     const {
//       surgeons,
//       datePerformed,
//       time,
//       duration,
//       typeOfProcedure,
//       modelType,
//     } = req.body;

//     const surgeonAll = surgeons ? JSON.parse(surgeons) : [];

//     const file = req.file;

//     // Read the file from local file system
//     const fileStream = fs.readFileSync(file.path);

//     // Setting up S3 upload parameters
//     const params = {
//       Bucket: 'soarbackend',
//       Key: `videos/${Date.now()}-${file.originalname}`,  // File name you want to save as in S3
//       Body: fileStream,
//     };

//     // Uploading files to the bucket
//     try {
//       const command = new PutObjectCommand(params);
//       await s3Client.send(command);

//       // Construct the video URL
//       const videoUrl = `https://${params.Bucket}.s3.${s3Client.config.region}.amazonaws.com/${params.Key}`;

//       // Save surgical video data
//       const surgicalVideo = await SurgicalVideo.create({
//         user_id: req.userId,
//         date_performed: datePerformed,
//         time,
//         duration,
//         procedure_type: typeOfProcedure,
//         ml_model_type: modelType,
//         video_url: videoUrl,
//       });

//       // Save each surgeon's details
//       if (surgeonAll && surgeonAll.length) {
//         await Promise.all(surgeonAll.map(surgeon =>
//           SurgicalVideoDetail.create({
//             surgical_video_id: surgicalVideo.id,
//             surgeon_name: surgeon.nameOfSurgeon,
//             surgeon_type: surgeon.typeOfSurgeon,
//           })
//         ));
//       }

//       // Return successful response
//       return res.json({ success: true, message: 'Data uploaded successfully!' });
//     } catch (err) {
//       return res.status(500).json({ success: false, message: err.message });
//     } finally {
//       // Optionally, delete the file from the local file system
//       fs.unlinkSync(file.path);
//     }
//   });
// };

exports.search_surgical_videos = async (req, res) => {
  const {
    procedure_type,
    surgeon,
    years_of_experience,
    durations,
    hospital,
    datePerformed,
    time_of_surgery,
    steps,
    errors,
    criterias,
    scores,
  } = req.body;
  // Check if any filters are provided
  const isFiltered =
    procedure_type ||
    surgeon ||
    years_of_experience ||
    durations ||
    hospital ||
    datePerformed ||
    time_of_surgery ||
    steps ||
    errors ||
    criterias ||
    scores;
  if (!isFiltered) {
    // No filters provided, fetch default video list
    const surgicalVideos = await SurgicalVideo.findAll({
      include: [
        {
          model: User,
          as: "user",
          include: [
            {
              model: UserInfo,
              as: "user_infos", // Assuming 'user_infos' is correctly setup to fetch multiple or single UserInfo
              attributes: ["institution_name"],
            },
          ],
          attributes: ["username"], // Only fetch username from User
        },
        {
          model: SurgicalVideoDetail,
          as: "surgical_videos_details",
          attributes: ["surgeon_name"], // Fetch surgeon name from SurgicalVideoDetail
        },
      ],
      attributes: ["id", "duration", "time", "video_url", "procedure_type"], // Attributes from SurgicalVideo
    });

    // Enhance response with video_title and filtered attributes
    const enhancedVideos = surgicalVideos.map((video) => ({
      id: video.id,
      video_title: "Lap chole",
      institution_name: video?.user?.user_infos[0]?.institution_name, // Accessing first UserInfo
      surgeon_name: video.surgical_videos_details
        .map((detail) => detail.surgeon_name)
        .join(", "), // Joining all surgeon names
      duration: video.duration,
      time: video.time,
      video_url: video.video_url,
    }));

    return res.json(successResponse(enhancedVideos));
  } else {
    // Prepare parameters for the stored procedure call
    const params = [
      `'${procedure_type}'`,
      `'${surgeon}'`,
      `'${years_of_experience}'`,
      durations ? `'${durations}'` : "NULL",
      `'${hospital}'`,
      datePerformed ? `'${datePerformed}'` : "NULL",
      time_of_surgery ? `'${time_of_surgery}'` : "NULL",
      `'${steps}'`,
      `'${errors}'`,
      `'${criterias}'`,
      scores ? `'${scores}'` : "NULL",
    ].join(",");

    const query = `CALL get_surgical_videos(${params}, 'rs_resultone'); FETCH ALL FROM "rs_resultone";`;

    db.sequelize
      .query(query, { type: db.sequelize.QueryTypes.SELECT })
      .then((result) => {
        result.splice(0, 1);
        return res.json(successResponse(result));
      })
      .catch((error) => {
        return res.status(500).json(errorResponse(error.message));
      });
  }
};

function processAnnotations(annotations, filterLabel = null) {
  const processedAnnotations = annotations
    .map((annotation) => {
      // If label_processed is null, set it to label
      if (!annotation.label_processed) {
        annotation.label_processed = annotation.label;
      }
      
      if (!annotation.label_processed && annotation.label) {
        annotation.label_processed = annotation.label;
      }

      // Process label only if it's not null or undefined
      if (annotation.label_processed) {
        annotation.label_processed = processLabel(annotation.label_processed);
      }

      return annotation;
    })
    .filter((annotation) => annotation !== null); // Remove null values

  if (filterLabel != null) {
    processedAnnotations.forEach((annotation) => {
      // Subtract 10 seconds from start time
      annotation.start_time = subtractSecondsFromTime(
        annotation.start_time,
        10
      );
    });
  }
  return processedAnnotations;
}

function processLabel(label) {
  // Remove numeric prefix with optional decimal points
  label = label.replace(/^\d+(\.\d+)?/, '');
  // Trim any leading or trailing spaces
  label = label.trim();
  // Insert spaces before capital letters and convert to lowercase
  label = label.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  // Capitalize the first letter of each word
  label = label.replace(/\b\w/g, (c) => c.toUpperCase());
  return label;
}

function subtractSecondsFromTime(timeString, secondsToSubtract) {
  const [hours, minutes, seconds] = timeString.split(":").map(Number);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return timeString; // Invalid time format
  }

  let totalSeconds = hours * 3600 + minutes * 60 + seconds - secondsToSubtract;

  if (totalSeconds < 0) {
    totalSeconds = 0; // Prevent negative time
  }

  let newHours = Math.floor(totalSeconds / 3600) % 24;
  totalSeconds %= 3600;
  let newMinutes = Math.floor(totalSeconds / 60);
  let newSeconds = totalSeconds % 60;

  return `${newHours < 10 ? "0" + newHours : newHours}:${
    newMinutes < 10 ? "0" + newMinutes : newMinutes
  }:${newSeconds < 10 ? "0" + newSeconds : newSeconds}`;
}

exports.get_csv_data_ById = async (req, res) => {
  try {
    const videoId = req.params.id;
    const surgicalVideos = await SurgicalVideo.findAll({
      include: [
        {
          model: User,
          as: "user",
          include: [
            {
              model: UserInfo,
              as: "user_infos",
              attributes: ["institution_name"],
            },
          ],
          attributes: ["username"],
        },
        {
          model: SurgicalVideoDetail,
          as: "surgical_videos_details",
          attributes: ["surgeon_name"],
        },
        {
          model: VideoAnnotations,
          as: "video_annotations",
        },
      ],
      attributes: ["id", "duration", "time", "video_url", "procedure_type"],
      where: { id: videoId },
    });

    const [enhancedVideos] = surgicalVideos.map((video) => {
      const steps = processAnnotations(
        video.video_annotations.filter(
          (annotation) => annotation.annotation_type === "steps"
        )
      );
      const errors = processAnnotations(
        video.video_annotations.filter(
          (annotation) => annotation.annotation_type === "errors"
        ),
        "Instrument tip out of view"
      );
      const competency = processAnnotations(
        video.video_annotations.filter(
          (annotation) => annotation.annotation_type === null
        )
      );

      const csv_data = [
        { competency: competency },
        { steps: steps },
        { errors: errors },
      ];

      return {
        id: video.id,
        video_title: "Lap chole",
        institution_name: video?.user?.user_infos[0]?.institution_name,
        surgeon_name: video.surgical_videos_details
          .map((detail) => detail.surgeon_name)
          .join(", "),
        duration: video.duration,
        time: video.time,
        video_url: video.video_url,
        csv_data: csv_data,
      };
    });

    return res.json({ success: true, data: enhancedVideos });
  } catch (err) {
    console.error("Fetching surgical video data failed:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal Server Error" });
  }
};

exports.search_surgical_videos_by_userId = async (req, res) => {
  const userId = req.userId;

  const {
    procedure_type,
    surgeon,
    years_of_experience,
    durations,
    hospital,
    datePerformed,
    time_of_surgery,
    steps,
    errors,
    criterias,
    scores,
  } = req.body;
  // Check if any filters are provided
  const isFiltered =
    procedure_type ||
    surgeon ||
    years_of_experience ||
    durations ||
    hospital ||
    datePerformed ||
    time_of_surgery ||
    steps ||
    errors ||
    criterias ||
    scores;
  if (!isFiltered) {
    // No filters provided, fetch default video list
    const surgicalVideos = await SurgicalVideo.findAll({
      include: [
        {
          model: User,
          as: "user",
          include: [
            {
              model: UserInfo,
              as: "user_infos", // Assuming 'user_infos' is correctly setup to fetch multiple or single UserInfo
              attributes: ["institution_name"],
            },
          ],
          attributes: ["username"], // Only fetch username from User
        },
        {
          model: SurgicalVideoDetail,
          as: "surgical_videos_details",
          attributes: ["surgeon_name"], // Fetch surgeon name from SurgicalVideoDetail
        },
      ],
      attributes: ["id", "duration", "time", "video_url", "procedure_type"], // Attributes from SurgicalVideo
      where: { user_id: userId },
    });

    // Enhance response with video_title and filtered attributes
    const enhancedVideos = surgicalVideos.map((video) => ({
      user_id: userId,
      id: video.id,
      video_title: "Lap chole",
      institution_name: video?.user?.user_infos[0]?.institution_name, // Accessing first UserInfo
      surgeon_name: video.surgical_videos_details
        .map((detail) => detail.surgeon_name)
        .join(", "), // Joining all surgeon names
      duration: video.duration,
      time: video.time,
      video_url: video.video_url,
    }));

    return res.json(successResponse(enhancedVideos));
  } else {
    // Prepare parameters for the stored procedure call
    const params = [
      `'${userId}'`,
      `'${procedure_type}'`,
      `'${surgeon}'`,
      `'${years_of_experience}'`,
      durations ? `'${durations}'` : "NULL",
      `'${hospital}'`,
      datePerformed ? `'${datePerformed}'` : "NULL",
      time_of_surgery ? `'${time_of_surgery}'` : "NULL",
      `'${steps}'`,
      `'${errors}'`,
      `'${criterias}'`,
      scores ? `'${scores}'` : "NULL",
    ].join(",");

    const query = `CALL get_surgical_videos_by_userId(${params}, 'rs_resultone'); FETCH ALL FROM "rs_resultone";`;

    db.sequelize
      .query(query, { type: db.sequelize.QueryTypes.SELECT })
      .then((result) => {
        result.splice(0, 1);
        return res.json(successResponse(result));
      })
      .catch((error) => {
        return res.status(500).json(errorResponse(error.message));
      });
  }
};
