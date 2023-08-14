import * as path from 'path';
import * as taskLib from 'azure-pipelines-task-lib/task';

import { getArtifactReferences } from './lib/variables';
import { getConfigHome } from './lib/fs';

export async function verify(): Promise<void> {
    const artifactRefs = getArtifactReferences();
    const trustpolicy = taskLib.getInput('trustpolicy', true) || '';
    const truststore = taskLib.getInput('truststore', false) || '';
    const configHome = getConfigHome();
    const allowReferrerAPI = taskLib.getBoolInput('allowReferrersAPI', false);
    const debug = taskLib.getVariable('system.debug')

    // copy the trustpoliy to notation config dirctory
    const trustPolicyPath = path.join(configHome, 'notation', 'trustpolicy.json');
    taskLib.cp(trustpolicy, trustPolicyPath, '-f');

    // copy the trust store directory to notation config directory
    const trustStorePath = path.join(configHome, 'notation')
    taskLib.rmRF(trustStorePath);
    taskLib.cp(truststore, trustStorePath, '-rf');

    let env = { ...process.env }
    if (allowReferrerAPI) {
        env["NOTATION_EXPERIMENTAL"] = "1";
    }

    for (const artifactRef of artifactRefs) {
        const code = await taskLib.tool('notation')
            .arg(['verify', artifactRef, "--verbose"])
            .argIf(allowReferrerAPI, '--allow-referrers-api')
            .argIf(debug && debug.toLowerCase() === 'true', '--debug')
            .exec({ env: env });

        if (code !== 0) {
            throw new Error(`Failed to verify the artifact: ${artifactRef}`);
        }
    }
    console.log(`Successfully verified ${artifactRefs.length} artifacts`);
}
