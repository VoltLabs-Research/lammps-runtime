export interface FileWatcher{
    watch(path: string, onChange: (file: string) => void): void;
};