const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info', // Nivel mínimo de log a registrar
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }), // Incluir stack trace
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'macs-legacy-api' },
  transports: [
    //
    // - Escribir todos los logs con nivel 'error' o menos en `error.log`
    // - Escribir todos los logs con nivel 'info' o menos en la consola
    //
    new winston.transports.File({ 
      filename: path.join(__dirname, '..', 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
