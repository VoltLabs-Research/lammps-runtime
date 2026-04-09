import { EventPublisher } from '@/ports/EventPublisher';

export default class Subscribe{
    constructor(private events: EventPublisher){}

    on(event: string, handler: (data: unknown) => void){
        this.events.on(event, handler);
    }
};