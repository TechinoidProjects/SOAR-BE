const global_time = new Date();
const SimpleNodeLogger = require('simple-node-logger');
const  opts = {
    logFilePath:'logs/'+global_time.getDate()+'-'+global_time.getMonth()+'-'+global_time.getYear()+'-PrimeLab.log',
    timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
};

const log = SimpleNodeLogger.createSimpleLogger(opts);

module.exports = log;