import * as taskLib from 'azure-pipelines-task-lib/task';

// get artifact references from input or from previous docker push task
// through "RESOURCE_URIS" variable.
export function getArtifactReferences(): string[] {
    let artifactRefs = []
    const artifactRefsInput = taskLib.getInput('artifactRefs', false);
    if (!artifactRefsInput) {
        artifactRefs = getArtifactReferencesFromDockerTask();
        console.log(taskLib.loc('GotArtifactRefsFromDockerTask'));
    } else {
        artifactRefs = artifactRefsInput.split(',');
    }

    if (artifactRefs.length === 0) {
        throw new Error(taskLib.loc('ArtifactRefsNotSpecified'));
    }
    console.log(taskLib.loc('ArtifactRefs', artifactRefs));
    return artifactRefs;
}

// get artifact references from previous docker push task through 
// "RESOURCE_URIS" variable.
function getArtifactReferencesFromDockerTask(): string[] {
    const resourceURIs = taskLib.getVariable('RESOURCE_URIS');
    if (!resourceURIs) {
        return [];
    }

    let references = [];
    const resourceURIArray = resourceURIs.split(',');
    for (const uri of resourceURIArray) {
        const parts = uri.split('://');
        if (parts.length !== 2) {
            throw new Error(taskLib.loc('InvalidResourceURI', uri));
        }
        references.push(parts[1]);
    }
    return references;
}
