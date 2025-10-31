import Redis from 'ioredis';
import { logger } from './logger';
import { config } from './env';

export const createRedisConnection = (): Redis => {
  const connection = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
  });

  connection.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  connection.on('error', (err) => {
    logger.error('Redis connection error', { error: err });
  });

  return connection;
};
