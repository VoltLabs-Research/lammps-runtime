import { ID, RunState, nowISO } from '@/domain/shared/types';

export default class Run{
    state: RunState = 'created'
    startedAt?: string
    endedAt?: string

    constructor(
        public readonly id: ID,
        public readonly image: string
    ){}

    start(){
        this.state = 'running';
        this.startedAt = nowISO();
    }

    complete(){
        this.state = 'completed';
        this.endedAt = nowISO();
    }

    fail(){
        this.state = 'failed';
        this.endedAt = nowISO();
    }
};