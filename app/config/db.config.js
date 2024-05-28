require('dotenv').config();

const config = {
  development: {
    HOST: process.env.DEVELOPMENT_HOST,
    USER: process.env.DEVELOPMENT_DB_USERNAME,
    PASSWORD: process.env.DEVELOPMENT_DB_PASSWORD,
    DB: process.env.DEVELOPMENT_DB_NAME,
    Port:process.env.DEVELOPMENT_DB_PORT,
    dialect: "postgres",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    HOST: process.env.CLIENT_DB_HOST,
    USER: process.env.CLIENT_DB_USERNAME,
    PASSWORD: process.env.CLIENT_DB_PASSWORD,
    DB: process.env.CLIENT_DB_NAME,
    Port:process.env.CLIENT_DB_PORT,
    dialect: "postgres",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
}

module.exports = config[process.env.NODE_ENV];
