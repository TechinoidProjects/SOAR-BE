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

  app.get(
    "/api/surgical/get",
    [
       authJwt.verifyToken
    ],
    controller.get
  );
};