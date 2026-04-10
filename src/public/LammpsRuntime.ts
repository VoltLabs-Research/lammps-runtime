import Docker from 'dockerode';
import { BuildResult } from '@/domain/build/Build';
import { BuildSpec } from '@/domain/build/BuildSpec';
import { RuntimeEventMap } from '@/domain/observability/EventMap';
import RunHandle from '@/domain/simulation/RunHandle';
import { RunSnapshot } from '@/domain/simulation/RunSnapshopt';
import { SimulationSpec } from '@/domain/simulation/SimulationSpec';
import EnsureImage from '@/application/images/EnsureImage';
import StartSimulation from '@/application/simulations/StartSimulation';
import StopSimulation from '@/application/simulations/StopSimulation';
import type { Logger as PinoBaseLogger } from 'pino';
import { EventBusPort } from '@/ports/EventBusPort';
import { Logger } from '@/ports/Logger';
import InMemoryImageStore from '@/infrastructure/persistence/InMemoryStore';
import InMemoryRunStore from '@/infrastructure/fs/InMemoryRunStore';
import PinoLogger from '@/infrastructure/logging/PinoLogger';
import EventEmitterBus from '@/infrastructure/events/EventEmitterBus';
import DockerImageBuilder from '@/infrastructure/docker/DockerImageBuilder';
import DockerContainerManager from '@/infrastructure/docker/DockerContainerManager';
import DockerLogStreamer from '@/infrastructure/docker/DockerLogStreamer';
import ChokidarFileWatcher from '@/infrastructure/fs/ChokidarFileWatcher';
import NodeWorkspacePreparer from '@/infrastructure/fs/NodeWorkspacePreparer';

export interface LammpsRuntimeOptions{
    docker?: Docker;
    logger?: PinoBaseLogger;
};

export default class LammpsRuntime{
    private readonly eventBus: EventBusPort<RuntimeEventMap>;
    private readonly logger: Logger;
    private readonly imageStore = new InMemoryImageStore();
    private readonly runStore = new InMemoryRunStore();

    private readonly ensureImage: EnsureImage;
    private readonly startSimulation: StartSimulation;
    private readonly stopSimulation: StopSimulation;

    constructor(options: LammpsRuntimeOptions = {}){
        const docker = options.docker ?? new Docker();
        
        this.logger = new PinoLogger(options.logger);
        this.eventBus = new EventEmitterBus<RuntimeEventMap>();

        const imageBuilder = new DockerImageBuilder(docker, this.logger.child({ scope: 'image-builder' }));
        const containerManager = new DockerContainerManager(docker, this.logger.child({ scope: 'container-manager' }));
        const logStreamer = new DockerLogStreamer(docker, this.logger.child({ scope: 'log-streamer' }));
        const fileWatcher = new ChokidarFileWatcher(this.logger.child({ scope: 'file-watcher' }));
        const workspacePreparer = new NodeWorkspacePreparer(this.logger.child({ scope: 'workspace-preparer' }));

        this.ensureImage = new EnsureImage(
            imageBuilder,
            this.imageStore,
            this.eventBus,
            this.logger.child({ scope: 'ensure-image' })
        );

        this.stopSimulation = new StopSimulation(
            this.runStore,
            containerManager,
            this.eventBus,
            this.logger.child({ scope: 'stop-simulation' })
        );

        this.startSimulation = new StartSimulation(
            this.ensureImage,
            workspacePreparer,
            containerManager,
            logStreamer,
            fileWatcher,
            this.runStore,
            this.eventBus,
            this.stopSimulation,
            this.logger.child({ scope: 'start-simulation' })
        );
    }

    async build(spec: BuildSpec): Promise<BuildResult>{
        return await this.ensureImage.execute(spec);
    }

    async run(spec: SimulationSpec): Promise<RunHandle>{
        return await this.startSimulation.execute(spec);
    }

    async stop(runId: string): Promise<RunSnapshot>{
        return await this.stopSimulation.execute(runId, false);
    }

    async kill(runId: string): Promise<RunSnapshot>{
        return await this.stopSimulation.execute(runId, true);
    }

    async getRun(runId: string): Promise<RunSnapshot | null>{
        const run = await this.runStore.get(runId);
        return run ? run.snapshot() : null;
    }

    async listRuns(): Promise<RunSnapshot[]>{
        const runs = await this.runStore.list();
        return runs.map((run) => run.snapshot());
    }

    on<K extends keyof RuntimeEventMap & string>(
        event: K,
        handler: (payload: RuntimeEventMap[K]) => void
    ): () => void{
        return this.eventBus.on(event, handler);
    }

    off<K extends keyof RuntimeEventMap & string>(
        event: K,
        handler: (payload: RuntimeEventMap[K]) => void
    ): void{
        this.eventBus.off(event, handler);
    }

    once<K extends keyof RuntimeEventMap & string>(
        event: K,
        handler: (payload: RuntimeEventMap[K]) => void
    ): () => void{
        return this.eventBus.once(event, handler);
    }
};
