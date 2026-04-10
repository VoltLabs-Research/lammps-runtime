import type { ScalarValue } from '@/domain/shared/types';

export interface InterpretedThermoEvent{
    type: 'thermo';
    step: number | null;
    values: Record<string, ScalarValue>;
    raw: string;
};

export interface InterpretedTimestepEvent{
    type: 'timestep';
    step: number;
    source: 'thermo';
};

export type InterpretedOutputEvent = InterpretedThermoEvent | InterpretedTimestepEvent;

export default class LammpsOutputInterpreter{
    private readonly numberPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eEdD][+-]?\d+)?$/;
    private thermoHeader: string[] | null = null;

    consume(line: string): InterpretedOutputEvent[]{
        const trimmed = line.trim();

        if(trimmed.length === 0) return [];

        const tokens = this.tokenize(line);
        if(tokens[0] === 'Step' && tokens.length > 1){
            this.thermoHeader = tokens;
            return [];
        }

        if(trimmed.startsWith('Loop time of')){
            this.thermoHeader = null;
            return [];
        }

        const firstToken = tokens[0];
        if(
            !this.thermoHeader || 
            !firstToken ||
            tokens.length !== this.thermoHeader.length ||
            !this.numberPattern.test(firstToken)
        ){
            return [];
        }

        const values = Object.fromEntries(this.thermoHeader.map((key, index) => [key, this.parseScalar(tokens[index] ?? '')]));
        const stepValue = values.Step;
        const step = typeof stepValue === 'number' ? stepValue : null;

        const events: InterpretedOutputEvent[] = [{
            type: 'thermo',
            step,
            values,
            raw: line
        }];

        if(typeof step === 'number'){
            events.push({
                type: 'timestep',
                step,
                source: 'thermo'
            });
        }

        return events;
    }

    private tokenize(line: string): string[]{
        return line
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    }

    private parseScalar(value: string): ScalarValue{
        if(!this.numberPattern.test(value)){
            return value;
        }

        return Number(value.replace(/[dD]/g, 'e'));
    }
};
