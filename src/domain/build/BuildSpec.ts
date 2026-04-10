export type BuildSource = 
    | {
        type: 'git';
        repository?: string;
        ref?: string;
    }
    | {
        type: 'tarball';
        url: string;
        stripComponents?: number;
    };

export type BuildSpec = {
    baseImage?: string;
    source?: BuildSource;
    version?: string;
    packages?: string[];
    mpi?: boolean;
    openmp?: boolean;
    shared?: boolean;
    cmakeOptions?: string[];
    aptPackages?: string[];
    env?: Record<string, string>;
    repository?: string;
    imageTag?: string;
};

export type ResolvedBuildSpec = {
    baseImage: string;
    source: BuildSource;
    packages: string[];
    mpi: boolean;
    openmp: boolean;
    shared: boolean;
    cmakeOptions: string[];
    aptPackages: string[];
    env: Record<string, string>;
    repository: string;
    imageTag?: string;
};
