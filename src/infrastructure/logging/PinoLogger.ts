import pino from 'pino';
import { Logger } from '@/ports/Logger';

export default class PinoLogger implements Logger{
    private logger = pino()

    info(msg: string){
        this.logger.info(msg);
    }

    error(msg: string){
        this.logger.error(msg);
    }
};