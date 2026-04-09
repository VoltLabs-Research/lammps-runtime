import { SimulationSpec } from '@/domain/simulation/SimulationSpec';
import { ContainerRuntime } from '@/ports/ContainerRuntime';
import { RunStore } from '@/ports/RunStore';
import { EventPublisher } from '@/ports/EventPublisher';
import Run from '@/domain/simulation/Run';
import crypto from 'node:crypto';

export default class StartSimulation{
    constructor(
        private runtime: ContainerRuntime,
        private store: RunStore,
        private events: EventPublisher
    ){}

    async execute(spec: SimulationSpec): Promise<Run>{
        const run = new Run(crypto.randomUUID(), spec.image);

        await this.store.save(run);

        const container = await this.runtime.createContainer(spec);

        this.events.emit('simulation:start', { runId: run.id });

        this.runtime.streamLogs(container, (line) => {
            this.events.emit('simulation:stdout', { line });
        });

        await this.runtime.startContainer(container);

        run.start();
        await this.store.update(run);

        return run;
    }
};