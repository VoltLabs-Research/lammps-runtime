import pino, { Logger as PinoBaseLogger } from 'pino';
import { Logger } from '@/ports/Logger';

export default class PinoLogger implements Logger{
    private readonly logger: PinoBaseLogger;

    constructor(logger?: PinoBaseLogger){
        this.logger = logger ?? pino({ name: 'lammps-sdk' });
    }

    debug(message: string, context?: Record<string, unknown>): void{
        this.logger.debug(context ?? {}, message);
    }

    info(message: string, context?: Record<string, unknown>): void{
        this.logger.info(context ?? {}, message);
    }

    warn(message: string, context?: Record<string, unknown>): void{
        this.logger.warn(context ?? {}, message);
    }

    error(message: string, context?: Record<string, unknown>): void{
        this.logger.error(context ?? {}, message);
    }

    child(context: Record<string, unknown>): Logger{
        return new PinoLogger(this.logger.child(context));
    }
};
