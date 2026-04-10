import { RuntimeEventMap } from '@/domain/observability/EventMap';
import { RunSnapshot } from '@/domain/simulation/RunSnapshopt';
import { ContainerManagerPort } from '@/ports/ContainerManagerPort';
import { EventBusPort } from '@/ports/EventBusPort';
import { Logger } from '@/ports/Logger';
import { RunStore } from '@/ports/RunStore';

export default class StopSimulation{
    constructor(
        private readonly runStore: RunStore,
        private readonly containerManager: ContainerManagerPort,
        private readonly eventBus: EventBusPort<RuntimeEventMap>,
        private readonly logger: Logger
    ){}

    async execute(runId: string, force: boolean): Promise<RunSnapshot>{
        const run = await this.runStore.get(runId);

        if(!run){
            throw new Error(`Run "${runId}" was not found.`);
        }

        if(!run.containerId){
            throw new Error(`Run "${runId}" has no container attached.`);
        }

        run.requestStop();
        await this.runStore.update(run);

        this.eventBus.emit('simulation:state', {
            runId: run.id,
            state: run.state,
            snapshot: run.snapshot()
        });

        const container = this.containerManager.get(run.containerId);

        if(force){
            this.logger.warn(`Killing container for run ${run.id}`);
            await this.containerManager.kill(container);
        }else{
            this.logger.info(`Stopping container for run ${run.id}`);
            await this.containerManager.stop(container, 10);   
        }

        return run.snapshot();
    }
};
