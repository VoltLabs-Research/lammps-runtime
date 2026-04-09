import EnsureImage from '@/application/images/EnsureImage';
import StartSimulation from '@/application/simulations/StartSimulation';
import Build from '@/domain/build/Build';
import DockerodeRuntime from '@/infrastructure/docker/DockerodeRuntime';
import EventEmitterBus from '@/infrastructure/events/EventEmitterBus';
import InMemoryRunStore from '@/infrastructure/fs/InMemoryRunStore';
import PinoLogger from '@/infrastructure/logging/PinoLogger';
import InMemoryImageStore from '@/infrastructure/persistence/InMemoryStore';

export default class LammpsRuntime{
    private runtime = new DockerodeRuntime();
    private runs = new InMemoryRunStore();
    private images = new InMemoryImageStore();
    private logger = new PinoLogger();
    private events = new EventEmitterBus();

    async build(spec: any){
        const build = new Build(spec);
        return new EnsureImage(this.runtime, this.images, this.logger).execute(build);
    }

    async run(spec: any){
        return new StartSimulation(this.runtime, this.runs, this.events).execute(spec);
    }

    on(event: string, handler: (data: unknown) => void){
        this.events.on(event, handler);
    }
};