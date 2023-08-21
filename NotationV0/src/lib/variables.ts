import * as taskLib from 'azure-pipelines-task-lib/task';

// get artifact references from input or from previous docker push task
// through "RESOURCE_URIS" variable.
export function getArtifactReferences(): string[] {
    let artifactRefs = []
    const artifactRefsInput = taskLib.getInput('artifactRefs', false);
    if (!artifactRefsInput) {
        artifactRefs = getArtifactReferencesFromDockerTask();
        console.log("Got the artifact references from Docker task.")
    } else {
        artifactRefs = artifactRefsInput.split(',');
    }

    if (artifactRefs.length === 0) {
        throw new Error('Artifact references are not specified');
    }
    console.log(`Artifact references: ${artifactRefs}`)
    return artifactRefs;
}

// get artifact references from previous docker push task through 
// "RESOURCE_URIS" variable.
function getArtifactReferencesFromDockerTask(): string[] {
    const resourceUris = taskLib.getVariable('RESOURCE_URIS');
    if (!resourceUris) {
        return [];
    }

    let references = [];
    const resourceUrisArray = resourceUris.split(',');
    for (const uri of resourceUrisArray) {
        const parts = uri.split('://');
        if (parts.length !== 2) {
            throw new Error(`Invalid resource URI: ${uri}`);
        }
        references.push(parts[1]);
    }
    return references;
}
