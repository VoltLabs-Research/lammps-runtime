export interface ImageStore{
    save(tag: string, spec: unknown): Promise<void>;
};
