import Docker from 'dockerode';
import { ContainerRuntime } from '@/ports/ContainerRuntime';

export default class DockerodeRuntime implements ContainerRuntime{
    private docker = new Docker();

    async imageExists(tag: string): Promise<boolean>{
        try{
            await this.docker.getImage(tag).inspect();
            return true;
        }catch{
            return false;
        }
    }

    async buildImage(tag: string){
        const stream = await this.docker.pull(tag);
        
        await new Promise((resolve) => {
            this.docker.modem.followProgress(stream, () => resolve(null));
        });
    }

    async createContainer(spec: any){
        return this.docker.createContainer({
            Image: spec.image,
            // Cmd: ['lmp', '-in', '/input/in.lmp']
        });
    }

    async startContainer(container: any){
        await container.start();
    }

    streamLogs(container: any, onData: (line: string) => void): void{
        container.logs({ follow: true, stdout: true }).then((stream: any) => {
            stream.on('data', (buf: Buffer) => onData(buf.toString()));
        });
    }
};