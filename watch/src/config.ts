import YAML from 'yaml'
import fs from 'fs'

export type Config = {
    mqttHost: string;
    osrmHost: string;
};

let config: Config | undefined = undefined;

export const GetConfig = (): Config => {
    if (config !== undefined) {
        return config;
    }
    const configFile = fs.readFileSync('./config.yml', 'utf8')
    const newConfig = YAML.parse(configFile) as Config;

    config = newConfig;

    return newConfig;
};