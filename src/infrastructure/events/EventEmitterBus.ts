import EventEmitter from 'eventemitter3';
import { EventPublisher } from '@/ports/EventPublisher';

export default class EventEmitterBus implements EventPublisher{
    private emitter = new EventEmitter()

    emit(event: string, payload: unknown){
        this.emitter.emit(event, payload);
    }

    on(event: string, handler: (payload: unknown) => void){
        this.emitter.on(event, handler);
    }
};