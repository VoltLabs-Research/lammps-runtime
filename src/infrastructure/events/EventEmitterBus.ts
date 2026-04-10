import EventEmitter from 'eventemitter3';
import { EventBusPort } from '@/ports/EventBusPort';

export default class EventEmitterBus<Events extends object> implements EventBusPort<Events>{
    private readonly emitter = new EventEmitter();

    emit<K extends keyof Events & string>(event: K, payload: Events[K]): void{
        this.emitter.emit(event, payload);
    }

    on<K extends keyof Events & string>(event: K, handler: (payload: Events[K]) => void): () => void{
        this.emitter.on(event, handler as (payload: unknown) => void);
        return () => this.off(event, handler);
    }

    once<K extends keyof Events & string>(event: K, handler: (payload: Events[K]) => void): () => void{
        const unsubscribe = this.on(event, (payload) => {
            unsubscribe();
            handler(payload);
        });

        return unsubscribe;
    }

    off<K extends keyof Events & string>(event: K, handler: (payload: Events[K]) => void): void{
        this.emitter.off(event, handler as (payload: unknown) => void);
    }
};
