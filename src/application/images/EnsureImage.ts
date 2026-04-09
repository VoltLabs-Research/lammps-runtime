import Build from '@/domain/build/Build';
import { ContainerRuntime } from '@/ports/ContainerRuntime';
import { ImageStore } from '@/ports/ImageStore';
import { Logger } from '@/ports/Logger';

export default class EnsureImage{
    constructor(
        private runtime: ContainerRuntime,
        private store: ImageStore,
        private logger: Logger
    ){}

    async execute(build: Build): Promise<string>{
        const tag = build.imageTag();

        const exists = await this.runtime.imageExists(tag);
        if(exists){
            this.logger.info(`Image exists: ${tag}`);
            return tag;
        }

        this.logger.info(`Building image: ${tag}`);

        await this.runtime.buildImage(tag, build.spec);
        await this.store.save(tag, build.spec);

        return tag;
    }
};