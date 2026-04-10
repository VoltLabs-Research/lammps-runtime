import type { ImageTag, ISODateString, RunID, RunState } from '@/domain/shared/types';

export interface RunSnapshot{
    id: RunID;
    imageTag: ImageTag;
    state: RunState;
    outputDir: string;
    createdAt: ISODateString;
    startedAt?: ISODateString;
    endedAt?: ISODateString;
    containerId?: string;
    exitCode?: number | null;
    errorMessage?: string;
    lastStep?: number;
};

