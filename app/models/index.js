const config = require("../config/db.config.js");

var DataTypes = require("sequelize").DataTypes;
const Sequelize = require("sequelize");
const sequelize = new Sequelize(
  config.DB,
  config.USER,
  config.PASSWORD, {
    host: config.HOST,
    dialect: config.dialect,
    operatorsAliases: 0,
    pool: {
      max: config.pool.max,
      min: config.pool.min,
      acquire: config.pool.acquire,
      idle: config.pool.idle
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require("../models/users")(sequelize, Sequelize);
db.user_info = require("../models/user_info.js")(sequelize, Sequelize);
db.roles = require("../models/roles")(sequelize, DataTypes);
db.user_role = require("../models/user_role")(sequelize, DataTypes);
db.surgical_videos = require("../models/surgical_videos")(sequelize, DataTypes);
db.surgical_videos_detail = require("../models/surgical_videos_detail")(sequelize, DataTypes);
db.video_annotations = require("../models/video_annotations")(sequelize, DataTypes);

db.roles.belongsToMany(db.users, { as: 'user_id_users', through: db.user_role, foreignKey: "role_id", otherKey: "user_id" });
db.users.belongsToMany(db.roles, { as: 'role_id_roles', through: db.user_role, foreignKey: "user_id", otherKey: "role_id" });
db.user_role.belongsTo(db.roles, { as: "role", foreignKey: "role_id"});
db.roles.hasMany(db.user_role, { as: "user_roles", foreignKey: "role_id"});
db.surgical_videos_detail.belongsTo(db.surgical_videos, { as: "surgical_video", foreignKey: "surgical_video_id"});
db.surgical_videos.hasMany(db.surgical_videos_detail, { as: "surgical_videos_details", foreignKey: "surgical_video_id"});
db.video_annotations.belongsTo(db.surgical_videos, { as: "surgical_video", foreignKey: "surgical_video_id"});
db.surgical_videos.hasMany(db.video_annotations, { as: "video_annotations", foreignKey: "surgical_video_id"});
db.surgical_videos.belongsTo(db.users, { as: "user", foreignKey: "user_id"});
db.users.hasMany(db.surgical_videos, { as: "surgical_videos", foreignKey: "user_id"});
db.user_info.belongsTo(db.users, { as: "user", foreignKey: "user_id"});
db.users.hasMany(db.user_info, { as: "user_infos", foreignKey: "user_id"});
db.user_role.belongsTo(db.users, { as: "user", foreignKey: "user_id"});
db.users.hasMany(db.user_role, { as: "user_roles", foreignKey: "user_id"});


module.exports = db;