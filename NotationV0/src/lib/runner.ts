import * as taskLib from 'azure-pipelines-task-lib/task';

// notationRunner runs the notation command for each artifact.
export async function notationRunner(artifactRefs: string[], runCommand: (artifactRef: string) => Promise<number>): Promise<void> {
    // run notation command for each artifact
    let failedArtifactRefs = [];
    let succeededArtifactRefs = [];
    for (const artifactRef of artifactRefs) {
        const code = await runCommand(artifactRef)
        if (code !== 0) {
            failedArtifactRefs.push(artifactRef);
            continue
        }

        succeededArtifactRefs.push(artifactRef);
    }

    // output conclusion
    console.log(taskLib.loc('ResultSummary', artifactRefs.length, artifactRefs.length - failedArtifactRefs.length, failedArtifactRefs.length));
    if (succeededArtifactRefs.length > 0) {
        console.log(taskLib.loc('SucceededArtifacts', succeededArtifactRefs.join(', ')));
    }
    if (failedArtifactRefs.length > 0) {
        throw new Error(taskLib.loc('FailedArtifacts', failedArtifactRefs.join(', ')));
    }
}
