const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require('dotenv').config();
const setupSwaggerDocs = require('./swaggerConfig');
const path = require('path');

// Use '0.0.0.0' to listen on all network interfaces
const hostname = '0.0.0.0';
const httpPort = process.env.HTTP_PORT;
const httpsPort = process.env.HTTPS_PORT;

// SSL Configuration
// const httpsOptions = {
//   cert: fs.readFileSync('./ssl/falcon_messagepoint_tv.crt'),
//   ca: fs.readFileSync('./ssl/falcon_messagepoint_tv.ca-bundle'),
//   key: fs.readFileSync('./ssl/falcon_messagepoint_tv.key')
// };

const app = express();

const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200
}
app.use('/uploads', express.static(path.join(__dirname, 'app/uploads')));

app.use(cors(corsOptions));
app.use(bodyParser.json());
setupSwaggerDocs(app, httpPort);
app.use(bodyParser.urlencoded({ extended: true }));

// database
const db = require("./app/models");
const Role = db.roles;

Role.findAll().then(function (res) {
  console.log('Role Exist')
}).catch(err => {
  // db.sequelize.sync({ force: true }).then(() => {
  //   console.log('Drop and Resync Database with { force: true }');
  // });
});

// routes
require('./app/routes/auth.routes')(app);
require('./app/routes/surgical.routes')(app);
require('./app/routes/lookup.routes')(app);

const httpServer = http.createServer(app);
// const httpsServer = https.createServer(httpsOptions, app);

const server1 = httpServer.listen(httpPort, hostname, function () {
  let host = server1.address().address;
  let port = server1.address().port;
  console.log("App listening at http://%s:%s", host, port);
});

// const server = httpsServer.listen(httpsPort, hostname, function () {
//    let host = server.address().address;
//    let port = server.address().port;
//    console.log("App listening at http://%s:%s", host, port);
// });
