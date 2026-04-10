import Build from '@/domain/build/Build';
import type { BuildResult } from '@/domain/build/Build';
import { BuildSpec } from '@/domain/build/BuildSpec';
import { RuntimeEventMap } from '@/domain/observability/EventMap';
import { EventBusPort } from '@/ports/EventBusPort';
import { ImageBuilderPort } from '@/ports/ImageBuilderPort';
import { ImageStore } from '@/ports/ImageStore';
import { Logger } from '@/ports/Logger';

export default class EnsureImage{
    constructor(
        private readonly imageBuilder: ImageBuilderPort,
        private readonly imageStore: ImageStore,
        private readonly eventBus: EventBusPort<RuntimeEventMap>,
        private readonly logger: Logger
    ){}

    async execute(input: BuildSpec): Promise<BuildResult>{
        const build = new Build(input);
        const tag = build.imageTag();
        const hash = build.hash();
        const spec = build.resolvedSpec();

        this.eventBus.emit('build:start', { tag, hash, spec });

        try{
            const exists = await this.imageBuilder.exists(tag);
            if(exists){
                const result: BuildResult = {
                    tag,
                    hash,
                    created: false,
                    spec
                };

                await this.imageStore.save({
                    tag,
                    hash,
                    spec: build.spec,
                    createdAt: new Date().toISOString()
                });

                this.eventBus.emit('build:end', { result });
                this.logger.info(`Image already exists: ${tag}`);

                return result;
            }

            const result = await this.imageBuilder.build(build, (message) => {
                this.eventBus.emit('build:log', { tag, hash, message });
            });

            await this.imageStore.save({
                tag: result.tag,
                hash: result.hash,
                spec: build.spec,
                createdAt: new Date().toISOString(),
                imageId: result.imageId
            });

            this.eventBus.emit('build:end', { result });
            this.logger.info(`Image built: ${tag}`);

            return result;
        }catch(error){
            const message = error instanceof Error ? error.message : String(error);
            this.eventBus.emit('build:error', { tag, hash, error: message });
            this.logger.error(`Failed to ensure image ${tag}`, { error: message });
            throw error;
        }
    }
};
