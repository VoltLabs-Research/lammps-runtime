import type { RunID } from '@/domain/shared/types';
import type { RuntimeEventMap } from '@/domain/observability/EventMap';
import type { RunSnapshot } from '@/domain/simulation/RunSnapshopt';
import type { EventBusPort } from '@/ports/EventBusPort';

export default class RunHandle{
    constructor(
        public readonly runId: RunID,
        private readonly eventBus: EventBusPort<RuntimeEventMap>,
        private readonly snapshotProvider: () => Promise<RunSnapshot | null>,
        private readonly stopCommand: () => Promise<void>,
        private readonly killCommand: () => Promise<void>
    ){}

    on<K extends keyof RuntimeEventMap & string>(
        event: K,
        handler: (payload: RuntimeEventMap[K]) => void,
    ): () => void {
        return this.eventBus.on(event, (payload) => {
            if(this.belongsToThisRun(payload)){
                handler(payload);
            }
        });
    }

    once<K extends keyof RuntimeEventMap & string>(
        event: K,
        handler: (payload: RuntimeEventMap[K]) => void,
    ): () => void {
        const unsubscribe = this.on(event, (payload) => {
            unsubscribe();
            handler(payload);
        });

        return unsubscribe;
    }

    async snapshot(): Promise<RunSnapshot | null>{
        return await this.snapshotProvider();
    }

    async stop(): Promise<void>{
        await this.stopCommand();
    }

    async kill(): Promise<void>{
        await this.killCommand();
    }

    async waitForEnd(timeoutMs?: number): Promise<RunSnapshot| null>{
        return await new Promise<RunSnapshot | null>((resolve, reject) => {
            let timeoutHandle: NodeJS.Timeout | undefined;

            const unsubscribeEnd = this.on('simulation:end', async () => {
                cleanup();
                resolve(await this.snapshot());
            });

            const unsubscribeError = this.on('simulation:error', async () => {
                cleanup();
                resolve(await this.snapshot());
            });

            const cleanup = () => {
                unsubscribeEnd();
                unsubscribeError();
            
                if(timeoutHandle){
                    clearTimeout(timeoutHandle);
                }
            };

            if(timeoutMs !== undefined){
                timeoutHandle = setTimeout(() => {
                    cleanup();
                    reject(new Error(`Timed out waiting for run "${this.runId}".`));
                }, timeoutMs);
            }
        });
    }

    private belongsToThisRun(payload: unknown): boolean{
        if(typeof payload !== 'object' || payload === null){
            return false;
        }

        if(!('runId' in payload)){
            return false;
        }

        const candidate = payload as { runId?: string };
        return candidate.runId === this.runId;
    }
};
