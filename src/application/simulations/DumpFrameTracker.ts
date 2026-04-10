import { readFile } from 'node:fs/promises';

export default class DumpFrameTracker{
    private readonly lastStepsByFile = new Map<string, number>();

    async readNewSteps(filePath: string): Promise<number[]>{
        const content = await this.readText(filePath);
        const steps = [...content.matchAll(/ITEM:\s+TIMESTEP\s*\n\s*(\d+)/g)]
            .map((match) => Number(match[1]))
            .filter((step) => Number.isFinite(step));

        if(steps.length === 0) return [];

        const lastSeenStep = this.lastStepsByFile.get(filePath);
        const newestStep = steps[steps.length - 1];

        if(newestStep !== undefined){
            this.lastStepsByFile.set(filePath, newestStep);
        }

        if(lastSeenStep === undefined){
            return steps;
        }

        return steps.filter((step) => step > lastSeenStep);
    }

    private async readText(filePath: string): Promise<string>{
        try{
            return await readFile(filePath, 'utf8');
        }catch{
            return '';
        }
    }
};