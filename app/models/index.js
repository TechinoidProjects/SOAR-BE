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

db.roles.belongsToMany(db.users, { as: 'user_id_users', through: db.user_role, foreignKey: "role_id", otherKey: "user_id" });
db.users.belongsToMany(db.roles, { as: 'role_id_roles', through: db.user_role, foreignKey: "user_id", otherKey: "role_id" });
db.user_role.belongsTo(db.roles, { as: "role", foreignKey: "role_id"});
db.roles.hasMany(db.user_role, { as: "user_roles", foreignKey: "role_id"});
db.user_info.belongsTo(db.users, { as: "user", foreignKey: "user_id"});
db.users.hasMany(db.user_info, { as: "user_infos", foreignKey: "user_id"});
db.user_role.belongsTo(db.users, { as: "user", foreignKey: "user_id"});
db.users.hasMany(db.user_role, { as: "user_roles", foreignKey: "user_id"});

module.exports = db;