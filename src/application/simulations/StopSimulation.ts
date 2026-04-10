import { RunSnapshot } from '@/domain/simulation/RunSnapshopt';
import { ContainerManagerPort } from '@/ports/ContainerManagerPort';
import { Logger } from '@/ports/Logger';
import { RunStore } from '@/ports/RunStore';
import SimulationLifecycleManager from './SimulationLifecycleManager';

export default class StopSimulation{
    constructor(
        private readonly runStore: RunStore,
        private readonly containerManager: ContainerManagerPort,
        private readonly lifecycleManager: SimulationLifecycleManager,
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

        await this.lifecycleManager.requestStop(run);

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
