import { ImageStore } from '@/ports/ImageStore';

export default class InMemoryImageStore implements ImageStore{
    private images = new Map<string, unknown>()

    async save(tag: string, spec: unknown){
        this.images.set(tag, spec);
    }
};