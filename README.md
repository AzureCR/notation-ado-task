# Notation for Azure DevOps Task
> [!IMPORTANT]
> The project is under development.

Install Notation CLI, sign or verify container registry artifact.

## Usage
Notation sign and verify command need the credential to access the registry. User should use [Docker task](https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/docker-v2) to login and the Notation task can get the credential from pipeline context.

For Notation sign command, Azure Key Vault plugin will be used. User should create an Azure Resource Manager serivce connection to grant Azure Key Vault permission for the task.


**Prerequisite:**
1. Create a [Docker Registry service connection](https://learn.microsoft.com/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml#docker-registry-service-connection)
2. Create an [Azure Resource Manager service connection](https://learn.microsoft.com/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml#azure-resource-manager-service-connection) and grant the permission:
   1. `Open` the created Azure RM service connection and click `Manage Service Principal` to enter the service principal portal.
   2. The `Application (client) ID` will be used to grant permission for the service principal.
   3. `Open` Azure Key Vault portal, and enter `Access Policies` page
   4. `Create` a new policy with `key sign`, `secret get` and `certificate get` permission and grant to the `Application (client) ID` accessed from the previous step.

Then create your own pipeline based on the example.

## Azure Pipeline Example
> [!NOTE]
> The example assumes that the default branch is `main`. If it's not, please follow the [guide](https://learn.microsoft.com/azure/devops/repos/git/change-default-branch?view=azure-devops#temporary-mirroring) to update the default branch.

**Notation sign**: automatically detect the artifact from previous Docker task
```yaml
trigger:
 - main
pool: 
  vmImage: 'ubuntu-latest'

steps:
# login to registry
- task: Docker@2
  inputs:
    containerRegistry: <docker_registry_service_connection>
    command: 'login'
# build and push artifact to registry
- task: Docker@2
  inputs:
    repository: <repository_name>
    command: 'buildAndPush'
    Dockerfile: './Dockerfile'
# install notation
- task: Notation@0
  inputs:
    command: 'install'
    version: '1.0.0'
# automatically detect the artifact pushed by Docker task 
# and sign the artifact.
- task: Notation@0
  inputs:
    version: '1.0.0'
    command: 'sign'
    plugin: 'azureKeyVault'
    azurekvServiceConection: <arm_service_connection>
    keyid: <key_id>
    selfSigned: true
```
**Notation sign**: manually provide the artifact reference with digest
```yaml
trigger:
 - main
pool: 
  vmImage: 'ubuntu-latest'

steps:
# login to registry
- task: Docker@2
  inputs:
    containerRegistry: <docker_registry_service_connection>
    command: 'login'
# install notation
- task: Notation@0
  inputs:
    command: 'install'
    version: '1.0.0'
# sign the artifact
- task: Notation@0
  inputs:
    artifactRefs: '<registry_host>/<repository>@<digest>'
    command: 'sign'
    plugin: 'azureKeyVault'
    azurekvServiceConection: <arm_service_connection>
    keyid: <key_id>
    selfSigned: true
```

**Notation verify**
```yaml
trigger:
 - main
pool: 
  vmImage: 'ubuntu-latest'

steps:
# login to registry
- task: Docker@2
  inputs:
    containerRegistry: <docker_registry_service_connection>
    command: 'login'
# notation verify
- task: Notation@0
  inputs:
    command: 'verify'
    artifactRefs: '<registry_host>/<repository>@<digest>'
    trustPolicy: $(Build.SourcesDirectory)/.pipeline/trustpolicy.json
    trustStore: $(Build.SourcesDirectory)/.pipeline/truststore/
    allowReferrersAPI: true
```

## Inputs
`command` - Command  
`string`. Required. Allowed values: `install`, `sign` and `verify`.

`artifactRefs` - Artifact References  
`string`. The container artifact reference with digest. If multiple references are used, please use comma to separate them. If it was not specified, the task will automatically detect it from previous Docker task.

`plugin` - Plugin  
`string`. Required for sign command. Allowed values: `azureKeyVault`.

`akvPluginVersion` - Azure Key Vualt Plugin Version
`string`. Required for `azureKeyVualt` plugin. The version for Azure Key Vualt plugin. Please visit the [release page](https://github.com/Azure/notation-azure-kv/releases) to choose a released version.

`azurekvServiceConnection` - Azure Key Vault Service Connection  
`string`. Required for `azure-kv` plugin. Select the The Azure Resource Manager service connection for the key vault if prefer to use service connection for authentication.

`keyid` - Key ID  
`string`. Required for `azure-kv` plugin. The key identifier of an Azure Key Vault certificate.

`selfSigned` - Self signed  
`boolean`. Whether the certficate is self-signed certificate.

`caCertBundle` - Certificate Bundle File Path  
`string`. The certificate bundle file containing intermidiate certificates and root certificate.

`trustPolicy` - Trust Policy File Path  
`string`. Required for `verify` command. The trust policy file path.

`trustStore` - Trust Store Folder Path  
`string`. Requried for `verify` command. The trust store folder path.

`signatureFormat` - Signature Format  
`string`. Signature envelope format. Allowed values: `jws`, `cose`.

`allowReferrersAPI` - [Experimental] Allow Referrers API  
`boolean`. Use the Referrers API to sign signatures, if not supported (returns 404), fallback to the Referrers tag schema.
