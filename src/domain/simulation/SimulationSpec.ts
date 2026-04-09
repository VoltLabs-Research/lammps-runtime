export type SimulationSpec = {
    image: string;
    inputScript: {
        path?: string;
        content?: string;
        filename?: string;
    };
    outputDir: string;
};