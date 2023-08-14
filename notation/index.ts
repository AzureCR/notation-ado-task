import * as taskLib from 'azure-pipelines-task-lib/task';

import { install } from './install';
import { sign } from './sign'
import { verify } from './verify';

async function run() {
    try {
        let command = taskLib.getInput('command', true);
        switch (command) {
            case 'install':
                await checkAndInstall();
                break;
            case 'sign':
                await checkAndInstall();
                await sign();
                break;
            case 'verify':
                await checkAndInstall();
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

// Check if notation is installed, if not, install it.
// Notation can only be installed once per pipeline run.
async function checkAndInstall(): Promise<void> {
    if (taskLib.which('notation', false)) {
        console.log('Notation is already installed');
        return
    }

    await install();
}

run();
