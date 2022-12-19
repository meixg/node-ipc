import os from 'os';
import { ClientConfig } from '../client';
import type {ServerConfig} from '../server';

function getCommonDefaultConfigs() {
    return {
        path: '/tmp/app.' + os.hostname,
        logger: console,
        endMark: '\f'
    }
}

export function getClientDefaultConfig(): ClientConfig {
    return {
        ...getCommonDefaultConfigs(),
        id: process.pid + '',
        retry: 500,
        maxRetries: Infinity
    };
}

export function getServerDefaultConfig(): ServerConfig {
    return {
        ...getCommonDefaultConfigs(),
        maxConnections: 100,
    };
}
