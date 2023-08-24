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
    console.log(`Total artifacts: ${artifactRefs.length}, succeeded: ${artifactRefs.length - failedArtifactRefs.length}, failed: ${failedArtifactRefs.length}`)
    if (succeededArtifactRefs.length > 0) {
        console.log(`Succeeded artifacts: ${succeededArtifactRefs.join(', ')}`);
    }
    if (failedArtifactRefs.length > 0) {
        throw new Error(`Failed artifacts: ${failedArtifactRefs.join(', ')}`);
    }
}
