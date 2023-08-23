import * as path from 'path';
import * as taskLib from 'azure-pipelines-task-lib/task';

import { getDownloadInfo, installFromURL } from './lib/install';

import { NOTATION_VERSION_FILE } from './lib/constants';

export async function install(): Promise<void> {
    // the notation download URL
    let version = '';
    let downloadURL = '';
    let checksum: string;

    if (taskLib.getBoolInput('isCustomVersion', false)) {
        // for custom version, download the notation from specified URL
        downloadURL = taskLib.getInput('url', true) || '';
        checksum = taskLib.getInput('checksum', true) || '';
    } else {
        const versionRange = taskLib.getInput('version', true);
        if (!versionRange) {
            throw new Error('Version is not specified');
        }
        const downloadInfo = getDownloadInfo(versionRange, NOTATION_VERSION_FILE);
        version = downloadInfo.version;
        downloadURL = downloadInfo.url;
        checksum = downloadInfo.checksum;
    }

    // install notation binary
    const extractPath = taskLib.getVariable('Agent.TempDirectory');
    if (!extractPath) {
        throw new Error('Agent.TempDirectory is not set');
    }
    await installFromURL(downloadURL, checksum, extractPath);

    // add to path for subsequent tasks
    taskLib.prependPath(extractPath);
    // add to path for current process
    process.env['PATH'] = `${extractPath}${path.delimiter}${process.env['PATH']}`;

    if (!version) {
        console.log(`Notation is installed from ${downloadURL}`);
    } else {
        console.log(`Notation v${version} is installed`);
    }
}
