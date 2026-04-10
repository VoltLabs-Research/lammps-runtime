import crypto from 'node:crypto';
import { BuildSpec, ResolvedBuildSpec } from '@/domain/build/BuildSpec';

export interface BuildResult{
    tag: string;
    hash: string;
    created: boolean;
    spec: ResolvedBuildSpec;
    imageId?: string;
};

export default class Build{
    constructor(public readonly spec: BuildSpec){}

    resolvedSpec(): ResolvedBuildSpec{
        const mpi = this.spec.mpi ?? true;
        const openmp = this.spec.openmp ?? false;
        const source = this.spec.source ?? {
            type: 'git',
            repository: 'https://github.com/lammps/lammps.git',
            ref: this.spec.version ?? 'stable'
        };

        const aptPackages = [
            'build-essential',
            'ca-certificates',
            'cmake',
            'curl',
            'git',
            'patch',
            'pkg-config',
            'python3',
            'tar',
            ...(mpi ? ['libopenmpi-dev', 'openmpi-bin'] : []),
            ...(this.spec.aptPackages ?? [])
        ];

        return {
            baseImage: this.spec.baseImage ?? 'ubuntu:24.04',
            source,
            packages: this.normalizePackages(this.spec.packages ?? []),
            mpi,
            openmp,
            shared: this.spec.shared ?? false,
            cmakeOptions: [...(this.spec.cmakeOptions ?? [])],
            aptPackages: this.unique(aptPackages),
            env: { ...(this.spec.env ?? {}) },
            repository: this.spec.repository ?? 'lammps/lammps-runtime',
            ...(this.spec.imageTag ? { imageTag: this.spec.imageTag } : {})
        };
    }

    hash(): string{
        const normalized = this.stableValue(this.resolvedSpec());

        return crypto
            .createHash('sha256')
            .update(JSON.stringify(normalized))
            .digest('hex')
            .slice(0, 12);
    }

    imageTag(): string{
        const spec = this.resolvedSpec();
        return spec.imageTag ?? `${spec.repository}:${this.hash()}`;
    }

    private normalizePackages(packages: string[]): string[]{
        return this.unique(
            packages
                .map((value) => value.trim().toUpperCase())
                .filter((value) => value.length > 0)
        );
    }

    private unique(values: string[]): string[]{
        return [...new Set(values)];
    }

    private stableValue(value: unknown): unknown{
        if(Array.isArray(value)){
            return value.map((entry) => this.stableValue(entry));
        }

        if(value && typeof value === 'object'){
            return Object.fromEntries(
                Object.entries(value as Record<string, unknown>)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([key, entry]) => [key, this.stableValue(entry)])
            );
        }

        return value;
    }
};
