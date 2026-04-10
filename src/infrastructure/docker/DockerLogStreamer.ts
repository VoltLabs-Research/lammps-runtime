import { PassThrough } from 'node:stream';
import Docker from 'dockerode';
import { ContainerHandle } from '@/ports/ContainerManagerPort';
import type { Logger } from '@/ports/Logger';
import { LogStreamHandle, LogStreamHandlers, LogStreamerPort } from '@/ports/LogStreamerPort';
import DockerContainerResolver from './DockerContainerResolver';

export default class DockerLogStreamer implements LogStreamerPort{
    constructor(
        private readonly docker: Docker,
        private readonly containerResolver: DockerContainerResolver,
        private readonly logger: Logger
    ){}

    async stream(container: ContainerHandle, handlers: LogStreamHandlers): Promise<LogStreamHandle>{
        const attached = await this.containerResolver.resolve(container).attach({
            stream: true,
            stdout: true,
            stderr: true,
            logs: true
        });

        const stdout = new PassThrough();
        const stderr = new PassThrough();

        this.docker.modem.demuxStream(attached, stdout, stderr);

        this.pipe(stdout, handlers.onStdout, handlers.onError);
        this.pipe(stderr, handlers.onStderr, handlers.onError);

        attached.on('error', (error) => {
            this.logger.error(`Log stream error for container ${container.id}`, { error: String(error) });
            Promise.resolve(handlers.onError(error instanceof Error ? error : new Error(String(error))));
        });

        return {
            close: async () => {
                (attached as NodeJS.ReadWriteStream & { destroy(): void }).destroy();
                stdout.destroy();
                stderr.destroy();
            }
        };
    }

    private pipe(
        stream: NodeJS.ReadableStream,
        handler: (line: string) => void | Promise<void>,
        onError: (error: Error) => void | Promise<void>
    ): void{
        let buffer = '';

        stream.on('data', (chunk) => {
            buffer += chunk.toString();

            const parts = buffer.split(/\r?\n/);
            buffer = parts.pop() ?? '';

            for(const line of parts){
                if(line.length === 0) continue;

                Promise.resolve(handler(line)).catch((error) => {
                    Promise.resolve(onError(error instanceof Error ? error : new Error(String(error))));
                });
            }
        });

        stream.on('end', () => {
            if(buffer.length === 0) return;

            Promise.resolve(handler(buffer)).catch((error) => {
                Promise.resolve(onError(error instanceof Error ? error : new Error(String(error))));
            });
        });

        stream.on('error', (error) => {
            Promise.resolve(onError(error instanceof Error ? error : new Error(String(error))));
        });
    }
};
