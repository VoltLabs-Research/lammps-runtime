import type { ImageTag, ISODateString, RunID, RunState } from '@/domain/shared/types';
import type { RunSnapshot } from '@/domain/simulation/RunSnapshopt';

export default class Run{
    state: RunState = 'created';
    startedAt?: ISODateString;
    endedAt?: ISODateString;
    containerId?: string;
    exitCode?: number | null;
    errorMessage?: string;
    lastStep?: number;

    readonly createdAt: ISODateString = this.now();

    constructor(
        public readonly id: RunID,
        public readonly imageTag: ImageTag,
        public readonly outputDir: string
    ){}

    markPreparing(): void{
        this.state = 'preparing';
    }

    attachContainer(containerId: string): void{
        this.containerId = containerId;
    }

    markStarting(): void{
        this.state = 'starting';
    }

    markRunning(): void{
        this.state = 'running';
        this.startedAt ??= this.now();
    }

    requestStop(): void{
        this.state = 'stopping';
    }

    markCompleted(exitCode: number | null): void{
        this.state = 'completed';
        this.exitCode = exitCode;
        this.endedAt = this.now();
    }

    markFailed(message: string, exitCode: number | null = null): void{
        this.state = 'failed';
        this.errorMessage = message;
        this.exitCode = exitCode;
        this.endedAt = this.now();
    }

    markCancelled(): void{
        this.state = 'cancelled';
        this.endedAt = this.now();
    }

    recordStep(step: number): void{
        if(this.lastStep === undefined || step > this.lastStep){
            this.lastStep = step;
        }
    }

    isStopping(): boolean{
        return this.state === 'stopping';
    }

    snapshot(): RunSnapshot {
        return {
            id: this.id,
            imageTag: this.imageTag,
            state: this.state,
            outputDir: this.outputDir,
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            endedAt: this.endedAt,
            containerId: this.containerId,
            exitCode: this.exitCode,
            errorMessage: this.errorMessage,
            lastStep: this.lastStep
        }
    }

    private now(): ISODateString{
        return new Date().toISOString();
    }
};