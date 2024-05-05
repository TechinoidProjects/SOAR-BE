var DataTypes = require("sequelize").DataTypes;
var _roles = require("./roles");
var _surgical_videos = require("./surgical_videos");
var _user_info = require("./user_info");
var _user_role = require("./user_role");
var _users = require("./users");

function initModels(sequelize) {
  var roles = _roles(sequelize, DataTypes);
  var surgical_videos = _surgical_videos(sequelize, DataTypes);
  var user_info = _user_info(sequelize, DataTypes);
  var user_role = _user_role(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  roles.belongsToMany(users, { as: 'user_id_users', through: user_role, foreignKey: "role_id", otherKey: "user_id" });
  users.belongsToMany(roles, { as: 'role_id_roles', through: user_role, foreignKey: "user_id", otherKey: "role_id" });
  user_role.belongsTo(roles, { as: "role", foreignKey: "role_id"});
  roles.hasMany(user_role, { as: "user_roles", foreignKey: "role_id"});
  user_info.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(user_info, { as: "user_infos", foreignKey: "user_id"});
  user_role.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(user_role, { as: "user_roles", foreignKey: "user_id"});

  return {
    roles,
    surgical_videos,
    user_info,
    user_role,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
