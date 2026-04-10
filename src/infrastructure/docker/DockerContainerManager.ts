import Docker from 'dockerode';
import {
    ContainerCreateRequest,
    ContainerHandle,
    ContainerManagerPort,
    ContainerWaitResult
} from '@/ports/ContainerManagerPort';
import type { Logger } from '@/ports/Logger';

export default class DockerContainerManager implements ContainerManagerPort{
    constructor(
        private readonly docker: Docker,
        private readonly logger: Logger
    ){}

    async create(request: ContainerCreateRequest): Promise<ContainerHandle>{
        const container = await this.docker.createContainer({
            Image: request.imageTag,
            name: request.name,
            WorkingDir: request.workingDir,
            Env: Object.entries(request.env).map(([key, value]) => `${key}=${value}`),
            Labels: request.labels,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            Entrypoint: [request.shell, '-lc'],
            Cmd: [request.command],
            HostConfig: {
                Binds: request.binds,
                ...(request.cpus !== undefined ? { NanoCpus: Math.floor(request.cpus * 1_000_000_000) } : {}),
                ...(request.memory ? { Memory: this.parseMemory(request.memory) } : {}),
                ...(request.gpus !== undefined ? {
                    DeviceRequests: [{
                        Driver: 'nvidia',
                        Count: request.gpus === 'all' ? -1 : request.gpus,
                        Capabilities: [['gpu']]
                    }]
                } : {})
            }
        });

        this.logger.info(`Container created: ${container.id}`, {
            imageTag: request.imageTag,
            containerName: request.name
        });

        return {
            id: container.id,
            raw: container
        };
    }

    get(id: string): ContainerHandle{
        return {
            id,
            raw: this.docker.getContainer(id)
        };
    }

    async start(container: ContainerHandle): Promise<void>{
        await this.resolveContainer(container).start();
    }

    async wait(container: ContainerHandle): Promise<ContainerWaitResult>{
        const result = await this.resolveContainer(container).wait();
        return {
            exitCode: typeof result?.StatusCode === 'number' ? result.StatusCode : null
        };
    }

    async stop(container: ContainerHandle, timeoutSeconds = 10): Promise<void>{
        await this.resolveContainer(container).stop({ t: timeoutSeconds });
    }

    async kill(container: ContainerHandle): Promise<void>{
        await this.resolveContainer(container).kill();
    }

    async remove(container: ContainerHandle, force = true): Promise<void>{
        try{
            await this.resolveContainer(container).remove({ force });
        }catch{
            this.logger.warn(`Container removal skipped: ${container.id}`);
        }
    }

    private resolveContainer(container: ContainerHandle): Docker.Container{
        if(container.raw){
            return container.raw as Docker.Container;
        }

        return this.docker.getContainer(container.id);
    }

    private parseMemory(value: string): number{
        const normalized = value.trim().toLowerCase();
        const match = normalized.match(/^(\d+(?:\.\d+)?)([kmgt]?b?)$/);

        if(!match){
            throw new Error(`Invalid memory string "${value}".`);
        }

        const amount = Number(match[1]);
        const unit = match[2] || 'b';
        const multipliers: Record<string, number> = {
            b: 1,
            k: 1024,
            kb: 1024,
            m: 1024 ** 2,
            mb: 1024 ** 2,
            g: 1024 ** 3,
            gb: 1024 ** 3,
            t: 1024 ** 4,
            tb: 1024 ** 4
        };

        const multiplier = multipliers[unit];

        if(!multiplier){
            throw new Error(`Unsupported memory unit "${unit}".`);
        }

        return Math.floor(amount * multiplier);
    }
};
