export interface EventPublisher<Events extends object = Record<string, unknown>>{
    emit<K extends keyof Events & string>(event: K, payload: Events[K]): void;
    on<K extends keyof Events & string>(event: K, handler: (payload: Events[K]) => void): () => void;
    once<K extends keyof Events & string>(event: K, handler: (payload: Events[K]) => void): () => void;
    off<K extends keyof Events & string>(event: K, handler: (payload: Events[K]) => void): void;
};
