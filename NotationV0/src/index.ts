import * as taskLib from 'azure-pipelines-task-lib/task';

import { NOTATION_BINARY } from './lib/constants';
import { install } from './install';
import { sign } from './sign'
import { verify } from './verify';

async function run() {
    try {
        let command = taskLib.getInput('command', true);
        switch (command) {
            case 'install':
                await install();
                break;
            case 'sign':
                // check if notation is installed before sign
                taskLib.which(NOTATION_BINARY, true);
                await sign();
                break;
            case 'verify':
                // check if notation is installed before verify
                taskLib.which(NOTATION_BINARY, true);
                await verify();
                break;
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    } catch (err: unknown) {
        if (err instanceof Error) {
            taskLib.setResult(taskLib.TaskResult.Failed, err.message);
        } else {
            taskLib.setResult(taskLib.TaskResult.Failed, 'An unknown error occurred.');
        }
    }
}

run();
