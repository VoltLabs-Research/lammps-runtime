import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Docker from 'dockerode';
import Build, { BuildResult } from '@/domain/build/Build';
import { ResolvedBuildSpec } from '@/domain/build/BuildSpec';
import type { Logger } from '@/ports/Logger';
import { ImageBuilderPort } from '@/ports/ImageBuilderPort';

interface BuildProgressEvent{
    stream?: string;
    status?: string;
    progress?: string;
    error?: string;
};

export default class DockerImageBuilder implements ImageBuilderPort{
    constructor(
        private readonly docker: Docker,
        private readonly logger: Logger
    ){}

    async exists(tag: string): Promise<boolean>{
        try{
            await this.docker.getImage(tag).inspect();
            return true;
        }catch{
            return false;
        }
    }

    async build(build: Build, onProgress?: (message: string) => void): Promise<BuildResult>{
        const tag = build.imageTag();
        const hash = build.hash();
        const spec = build.resolvedSpec();
        const contextDir = await this.createContext(spec);

        try{
            const stream = await this.docker.buildImage({
                context: contextDir,
                src: ['Dockerfile']
            }, {
                t: tag,
                pull: true
            });

            await new Promise<void>((resolve, reject) => {
                this.docker.modem.followProgress(
                    stream,
                    (error) => {
                        if(error){
                            reject(error);
                            return;
                        }

                        resolve();
                    },
                    (event) => {
                        const message = this.formatProgressEvent(event as BuildProgressEvent);
                        if(message.length > 0){
                            onProgress?.(message);
                        }
                    }
                );
            });

            const image = await this.docker.getImage(tag).inspect();
            this.logger.info(`Docker image built: ${tag}`, { imageId: image.Id });

            return {
                tag,
                hash,
                created: true,
                spec,
                imageId: image.Id
            };
        }finally{
            await rm(contextDir, { recursive: true, force: true });
        }
    }

    private async createContext(spec: ResolvedBuildSpec): Promise<string>{
        const contextDir = await mkdtemp(path.join(os.tmpdir(), 'lammps-sdk-build-'));
        const dockerfilePath = path.join(contextDir, 'Dockerfile');

        await writeFile(dockerfilePath, this.renderDockerfile(spec), 'utf8');

        return contextDir;
    }

    private renderDockerfile(spec: ResolvedBuildSpec): string{
        const cmakeArgs = this.renderCmakeArgs(spec)
            .map((entry) => this.shellEscape(entry))
            .join(' ');

        const sourceInstructions = spec.source.type === 'git'
            ? [
                `RUN git clone ${this.shellEscape(spec.source.repository ?? 'https://github.com/lammps/lammps.git')} /opt/lammps-src`,
                `RUN cd /opt/lammps-src && git checkout ${this.shellEscape(spec.source.ref ?? 'stable')}`
            ]
            : [
                `RUN curl -fsSL ${this.shellEscape(spec.source.url)} -o /tmp/lammps-src.tar.gz`,
                `RUN mkdir -p /opt/lammps-src && tar -xzf /tmp/lammps-src.tar.gz -C /opt/lammps-src --strip-components=${spec.source.stripComponents ?? 1}`
            ];

        const envLines = Object.entries(spec.env).map(([key, value]) => `ENV ${key}=${JSON.stringify(value)}`);

        return [
            `FROM ${spec.baseImage}`,
            'SHELL ["/bin/bash", "-lc"]',
            'ARG DEBIAN_FRONTEND=noninteractive',
            `RUN apt-get update && apt-get install -y --no-install-recommends ${spec.aptPackages.map((entry) => this.shellEscape(entry)).join(' ')} && rm -rf /var/lib/apt/lists/*`,
            'WORKDIR /opt',
            ...sourceInstructions,
            'RUN mkdir -p /opt/lammps-build /opt/lammps-install',
            `RUN cmake -S /opt/lammps-src/cmake -B /opt/lammps-build ${cmakeArgs}`,
            'RUN cmake --build /opt/lammps-build --parallel "$(nproc)"',
            'RUN cmake --install /opt/lammps-build --prefix /opt/lammps-install',
            'ENV PATH=/opt/lammps-install/bin:$PATH',
            ...envLines,
            'WORKDIR /workspace',
            ''
        ].join('\n');
    }

    private renderCmakeArgs(spec: ResolvedBuildSpec): string[]{
        const args = [
            `-DBUILD_MPI=${spec.mpi ? 'yes' : 'no'}`,
            `-DBUILD_OMP=${spec.openmp ? 'yes' : 'no'}`,
            `-DBUILD_SHARED_LIBS=${spec.shared ? 'yes' : 'no'}`,
            '-DCMAKE_BUILD_TYPE=Release'
        ];

        for(const pkg of spec.packages){
            args.push(`-DPKG_${pkg}=yes`);
        }

        args.push(...spec.cmakeOptions);

        return args;
    }

    private formatProgressEvent(event: BuildProgressEvent): string{
        if(typeof event.stream === 'string'){
            return event.stream.trim();
        }

        if(typeof event.error === 'string'){
            return event.error;
        }

        return [event.status, event.progress].filter(Boolean).join(' ');
    }

    private shellEscape(value: string): string{
        if(value.length === 0){
            return "''";
        }

        return `'${value.replace(/'/g, `'\\''`)}'`;
    }
};
