import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as taskLib from 'azure-pipelines-task-lib/task';
import * as toolLib from 'azure-pipelines-tool-lib/tool';

import { computeChecksum } from './crypto';

export async function installFromURL(downloadURL: string, expectedChecksum: string, extractPath: string): Promise<void> {
    // Download notation
    const fileName = path.basename(downloadURL);
    const downloadPath = await toolLib.downloadTool(downloadURL, fileName);

    // Validate checksum
    const checksum = await computeChecksum(downloadPath);
    if (expectedChecksum !== checksum) {
        throw new Error(`Checksum validation failed. Expected: "${expectedChecksum}" Actual: "${checksum}"`);
    }
    console.log(`Checksum validated: ${expectedChecksum}`);

    taskLib.mkdirP(extractPath);

    // Extract notation binary
    await extractBinary(downloadPath, extractPath);
}

async function extractBinary(filePath: string, extractPath: string): Promise<string> {
    if (filePath.endsWith('.zip')) {
        return toolLib.extractZip(filePath, extractPath);
    } else if (filePath.endsWith('.tar.gz')) {
        return toolLib.extractTar(filePath, extractPath);
    }
    throw new Error(`Unsupported file extension: ${path.extname(filePath)}`);
}

// Get the download URL and checksum for the notation binary 
// based on the version
export function getDownloadInfo(versionRange: string, versionFileName: string): { version: string, url: string, checksum: string } {
    const versionFile = path.join(__dirname, '..', '..', 'data', versionFileName);
    const versionData = fs.readFileSync(versionFile, 'utf8');
    const versionList = JSON.parse(versionData);

    for (const versionSuite of versionList) {
        if (isMatch(versionSuite["version"], versionRange)) {
            return fetchTarget(versionSuite);
        }
    }

    throw new Error(`No version satisfies the range: ${versionRange}`)
}

function isMatch(version: string, versionRange: string): boolean {
    // if the version range is for pre-release version, it needs to match 
    // the full version
    if (versionRange.includes('-')) {
        return versionRange === version;
    }

    // for main version, it only needs to match the prefix
    return version.startsWith(versionRange);
}

function fetchTarget(versionSuite: any): { version: string, url: string, checksum: string } {
    const platform = getPlatform();
    const arch = getArch();
    if (!(platform in versionSuite)) {
        throw new Error(`The platform ${platform} is not supported`);
    }

    if (!(arch in versionSuite[platform])) {
        throw new Error(`The arch ${arch} is not supported`);
    }

    return {
        version: versionSuite["version"],
        url: versionSuite[platform][arch]["url"],
        checksum: versionSuite[platform][arch]["checksum"]
    };
}

function getPlatform(): string {
    const platform = os.platform();
    switch (platform) {
        case 'linux':
            return 'linux';
        case 'darwin':
            return 'darwin';
        case 'win32':
            return 'windows';
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

function getArch(): string {
    const architecture = os.arch();
    switch (architecture) {
        case 'x64':
            return 'amd64';
        case 'arm64':
            return 'arm64';
        default:
            throw new Error(`Unsupported architecture: ${architecture}`);
    }
}
