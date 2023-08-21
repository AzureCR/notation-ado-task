import * as path from 'path';
import * as taskLib from 'azure-pipelines-task-lib/task';

import { NOTATION, NOTATION_BINARY, TRUST_STORE, X509 } from './lib/constants';

import { getArtifactReferences } from './lib/variables';
import { getConfigHome } from './lib/fs';

export async function verify(): Promise<void> {
    const artifactRefs = getArtifactReferences();
    const trustpolicy = taskLib.getInput('trustpolicy', true) || '';
    const truststore = taskLib.getInput('truststore', true) || '';
    const allowReferrerAPI = taskLib.getBoolInput('allowReferrersAPI', false);
    const debug = taskLib.getVariable('system.debug')

    // config trust policy
    await configTrustPolicy(trustpolicy);
    // config trust store
    taskLib.rmRF(path.join(getConfigHome(), NOTATION, TRUST_STORE));
    await configTrustStore(truststore);

    let env = { ...process.env }
    if (allowReferrerAPI) {
        env["NOTATION_EXPERIMENTAL"] = "1";
    }

    // run notation verify for each artifact
    let failedArtifactRefs = [];
    for (const artifactRef of artifactRefs) {
        const code = await taskLib.tool(NOTATION_BINARY)
            .arg(['verify', artifactRef, '--verbose'])
            .argIf(allowReferrerAPI, '--allow-referrers-api')
            .argIf(debug && debug.toLowerCase() === 'true', '--debug')
            .exec({ env: env });

        if (code !== 0) {
            failedArtifactRefs.push(artifactRef);
        }
    }

    // output conclusion
    console.log(`Total artifacts: ${artifactRefs.length}, succeeded: ${artifactRefs.length - failedArtifactRefs.length}, failed: ${failedArtifactRefs.length}`)
    if (failedArtifactRefs.length > 0) {
        throw new Error(`Failed to verify artifacts: ${failedArtifactRefs.join(', ')}`);
    }
}

async function configTrustPolicy(trustpolicy: string): Promise<void> {
    // run notation command to install trust policy
    let code = await taskLib.tool(NOTATION_BINARY)
        .arg(['policy', 'import', trustpolicy])
        .exec();
    if (code !== 0) {
        throw new Error(`Failed to import trust policy: ${trustpolicy}`);
    }

    code = await taskLib.tool(NOTATION_BINARY)
        .arg(['policy', 'show'])
        .exec();
    if (code !== 0) {
        throw new Error(`Failed to show trust policy`);
    }
}

// configTrustStore configures Notation trust store based on specs.
// Reference: https://github.com/notaryproject/specifications/blob/v1.0.0-rc.2/specs/trust-store-trust-policy.md#trust-store
async function configTrustStore(dir: string): Promise<void> {
    const trustStoreX509 = path.join(dir, X509); // .github/truststore/x509
    if (!taskLib.exist(trustStoreX509)) {
        throw new Error(`cannot find trust store dir: ${trustStoreX509}`);
    }

    // traverse all trust store types
    for (var trustStoreTypePath of getSubdir(trustStoreX509)) {  // [.github/truststore/x509/ca, .github/truststore/x509/signingAuthority, ...]
        const trustStoreType = path.basename(trustStoreTypePath);

        // traverse all trust stores
        for (var trustStorePath of getSubdir(trustStoreTypePath)) {  // [.github/truststore/x509/ca/<my_store1>, .github/truststore/x509/ca/<my_store2>, ...]
            const trustStore = path.basename(trustStorePath);

            // get all certs
            const certs = getFilesFromDir(trustStorePath); // [.github/truststore/x509/ca/<my_store1>/<my_cert1>, .github/truststore/x509/ca/<my_store1>/<my_cert2>, ...]

            // run notation command to add cert to trust store
            const code = await taskLib.tool(NOTATION_BINARY)
                .arg(['cert', 'add', '--type', trustStoreType, '--store', trustStore, ...certs])
                .exec();
            if (code !== 0) {
                throw new Error(`Failed to add cert to trust store: ${trustStore}`);
            }
        }
    }

    // list trust store
    const code = await taskLib.tool(NOTATION_BINARY)
        .arg(['cert', 'list'])
        .exec();
    if (code !== 0) {
        throw new Error(`Failed to list trust store`);
    }
}

// getSubdir gets all sub dirs under dir without recursive
function getSubdir(dir: string): string[] {
    return taskLib.ls('', [dir])
        .map(filename => path.join(dir, filename))
        .filter(filepath => taskLib.stats(filepath).isDirectory())
}

// getFilesFromDir gets all files under dir without recursive
function getFilesFromDir(dir: string): string[] {
    return taskLib.ls('', [dir])
        .map(filename => path.join(dir, filename))
        .filter(filepath => taskLib.stats(filepath).isFile())
}
