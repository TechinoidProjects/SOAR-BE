const {authJwt} = require("../middleware");
const controller = require("../controllers/surgical.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/api/surgical/save_surgical_videos",
    [
       authJwt.verifyToken
    ],
    controller.save_surgical_videos
  );

  app.post(
    "/api/surgical/search_surgical_videos",
    [
       authJwt.verifyToken
    ],
    controller.search_surgical_videos
  );

  app.post(
    "/api/surgical/search_surgical_videos_by_userId",
    [
       authJwt.verifyToken
    ],
    controller.search_surgical_videos_by_userId
  );

  app.get(
    "/api/surgical/get_csv_data_ById/:id",
    [
       authJwt.verifyToken
    ],
    controller.get_csv_data_ById
  );
};