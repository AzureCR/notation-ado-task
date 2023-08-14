# Notation for Azure DevOps Task
> [!NOTE]
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
**Notation sign**: automatically detect the artifact from previous Docker task
```yaml
trigger:
 - master
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
# automatically detect the artifact pushed by Docker task 
# and sign the artifact.
- task: notation@0
  inputs:
    command: 'sign'
    plugin: 'azurekv'
    azurekvServiceConection: <azurerm_service_connection>
    keyid: <key_id>
    selfSigned: true
```

**Notation verify**
```yaml
trigger:
 - master
pool: 
  vmImage: 'ubuntu-latest'

steps:
# login to registry
- task: Docker@2
  inputs:
    containerRegistry: <docker_registry_service_connection>
    command: 'login'
# notation verify
- task: notation@0
  inputs:
    command: 'verify'
    artifactRefs: '<registry_host>/<repository>@<digest>'
    trustpolicy: $(Build.SourcesDirectory)/.pipeline/trustpolicy.json
    truststore: $(Build.SourcesDirectory)/.pipeline/truststore/
    allowReferrersAPI: true
```

## Inputs
`command` - Command  
`string`. Required. Allowed values: `install`, `sign` and `verify`.

`artifactRefs` - Artifact References  
`string`. The container artifact reference with digest. If multiple references are used, please use comma to seprate them. If it was not specified, the task will automatially detact it from previous Docker task.

`plugin` - Plugin  
`string`. Required for sign command. Allowed values: `azurekv`.

`azurekvServiceConnection` - Azure Key Vault Service Connection  
`string`. Required for `azurekv` plugin. The Azure Resource Manager service connection for accessing Azure Key Vualt.

`keyid` - Key ID  
`string`. Required for `azurekv` plugin. The key identifier of an Azure Key Vault certificate.

`selfSigned` - Self signed  
`boolean`. Whether the certficate is self-signed certificate.

`cacerts` - Certificate Bundle File Path  
`string`. The certificate bundle file containing intermidiate certificates and root certificate.

`trustpolicy` - Trust Policy File Path  
`string`. Required for `verify` command. The trust policy file path.

`truststore` - Trust Store Folder Path  
`string`. Requried for `verify` command. The trust store folder path.

`signatureFormat` - Signature Format  
`string`. Signature envelope format. Allowed values: `jws`, `cose`.

`allowReferrersAPI` - [Experimental] Allow Referrers API  
`boolean`. Use the Referrers API to sign signatures, if not supported (returns 404), fallback to the Referrers tag schema.
