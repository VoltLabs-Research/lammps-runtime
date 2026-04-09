import { SimulationSpec } from '@/domain/simulation/SimulationSpec';

export interface ContainerRuntime{
    imageExists(tag: string): Promise<boolean>;
    buildImage(tag: string, spec: unknown): Promise<void>;

    createContainer(spec: SimulationSpec): Promise<any>;
    startContainer(container: any): Promise<void>;
    streamLogs(container: any, onData: (line: string) => void): void;
};