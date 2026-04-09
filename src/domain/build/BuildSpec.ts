export type BuildSpec = {
    version?: string;
    packages: string[];
    mpi?: boolean;
    openmp?: boolean;
    shared?: boolean;
    cmakeOptions?: string[];
};

