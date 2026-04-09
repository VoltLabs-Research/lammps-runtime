import crypto from 'node:crypto';
import { BuildSpec } from '@/domain/build/BuildSpec';

export default class Build{
    constructor(public readonly spec: BuildSpec){}

    hash(): string{
        const normalized = {
            ...this.spec,
            packages: [...this.spec.packages].sort()
        };

        return crypto
            .createHash('sha256')
            .update(JSON.stringify(normalized))
            .digest('hex')
            .slice(0, 12);
    }

    imageTag(): string{
        return `lammps:${this.hash()}`
    }
};