import { inspect } from 'util';
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';

const logDir = 'logs';
const errorLogDir = 'logs/error';
const { combine, timestamp, printf } = winston.format;

export const logger = winston.createLogger({
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    printf(info => `${info.timestamp} ${info.level} ${info.message} ${inspect(info.metadata)}`),
  ),
  transports: [
    new winstonDaily({
      level: 'info',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir,
      filename: `%DATE%.log`,
      maxFiles: 30,
      zippedArchive: true,
    }),
    new winstonDaily({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: errorLogDir,
      filename: `%DATE%.error.log`,
      maxFiles: 30,
      zippedArchive: true,
    }),
  ]
});

logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  )
}));