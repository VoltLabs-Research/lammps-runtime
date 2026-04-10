import { ResolvedSimulationSpec } from '@/domain/simulation/SimulationSpec';

export default class LammpsCommandBuilder{
    build(spec: ResolvedSimulationSpec, mainInputContainerPath: string): string{
        const command: string[] = [];
        
        if(spec.execution.mpiRanks > 1){
            command.push('mpirun', '--allow-run-as-root', '-np', String(spec.execution.mpiRanks));
        }

        command.push(spec.execution.binary, '-in', mainInputContainerPath);

        for(const [key, value] of Object.entries(spec.variables)){
            command.push('-var', key, String(value));
        }
        
        command.push(...spec.execution.extraArgs);

        return command.map((entry) => this.shellEscape(entry)).join(' ');
    }

    private shellEscape(value: string): string{
        if(value.length === 0){
            return "''";
        }

        return `'${value.replace(/'/g, `'\\''`)}'`;
    }
};
