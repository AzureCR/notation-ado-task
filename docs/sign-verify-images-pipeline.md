# Notation for Azure DevOps Task

This document walks you through how to create an Azure pipeline to achieve the following goals:

1. Build a container image and push it to Azure Container Registry
2. Install Notation CLI, sign the image with Notation and Notation AKV plugin. The generated signature will be automatically pushed to Azure Container Registry

## Prerequisites

- You have created a Key Vault in Azure Key Vault and created a self-signed signing key and certificate. You can follow this [doc](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tutorial-sign-build-push#create-a-self-signed-certificate-azure-cli) to create self-signed key and certificate for testing purposes. If you have a CA issued certificate, see this doc for details.
- You have created a registry in Azure Container Registry
- You have an Azure DevOps repository or GitHub repository

## Create Service Connection

Notation sign and verify command need the credential to access the registry. User should use [Docker task](https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/docker-v2) to login and the Notation task can get the credential from pipeline context.

Create a [Docker Registry service connection](https://learn.microsoft.com/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml#docker-registry-service-connection) in Azure DevOps pipeline to grant the access permission to your Azure Container Registry for the Notation tasks. 

- Select the **Settings** button in the bottom-left corner.
- Go to **Pipelines**, and then select **Service connection**.
- Choose **New service connection** and select **Docker Registry**
- Next choose **Azure Container Registry**
- Choose **Service Principle** in the **Authentication Type** and enter the Service Principal details including your Azure Subscription and ACR registry.
- Enter a user-friendly **Connection name** to use when referring to this service connection.

Similarly, create an Azure Resource Manager service connection in Azure DevOps pipeline to grant grant the access permission to your Azure Key Vault for the Notation tasks.

Create an [Azure Resource Manager service connection](https://learn.microsoft.com/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml#azure-resource-manager-service-connection) and grant the permission of Azure Key Vault to this service principle:

- Open the created Azure Resource Manager service connection and click **Manage Service Principal** to enter the Azure service principal portal.
- The `Application (client) ID` will be used to grant the permission for the service principal
- Open the Azure Key Vault portal, and enter **Access Policies** page
- Create a new policy with `key sign`, `secret get` and `certificate get` permission
- Grant this new policy to the `Application (client) ID` accessed from the previous step

See [this doc](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=azure-devops&tabs=yaml#create-a-service-connection) for more details.

## Edit the sample pipeline

> [!NOTE]
> The example assumes that the default branch is `main`. If it's not, please follow the [guide](https://learn.microsoft.com/azure/devops/repos/git/change-default-branch?view=azure-devops#temporary-mirroring) to update the default branch.

- Go to **Pipelines** and then select **New pipeline**
- Choose your git repository
- Search the `Notation` task from the pipeline editing panel on the right side. Now you can use the ADO panel to add Notation tasks to your pipeline or copy from the sample workflow below.

There are two ways to use Notation tasks to sign images in your Azure pipeline: 

- Option 1: You can sign your image from the latest digest that is built and pushed to the registry by a Docker task
- Option 2: Manually specify an artifact reference to sign a specified image digest.

**Option 1**: Automatically detect the artifact from previous Docker task and sign it. You need to fill out the required values according to the inputs reference.

<details>

<summary>See the signing task template of option 1 (Click here).</summary>

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
- task: notation@0
  inputs:
    command: 'install'
    version: '1.0.0'
# automatically detect the artifact pushed by Docker task and sign the artifact.
- task: notation@0
  inputs:
    version: '1.0.0'
    command: 'sign'
    plugin: 'azureKeyVault'
    azurekvServiceConection: <arm_service_connection>
    keyid: <key_id>
    selfSigned: true
```

</details>

**Option 2**: Manually specify an artifact reference with digest and sign it. You need to fill out the required values according to the inputs reference.

<details>

<summary>See the signing task template of option 2 (Click here).</summary>

```yaml
trigger:
 - main
pool: 
  vmImage: 'ubuntu-latest'

steps:
# log in to registry
- task: Docker@2
  inputs:
    containerRegistry: <docker_registry_service_connection>
    command: 'login'
# install notation
- task: notation@0
  inputs:
    command: 'install'
    version: '1.0.0'
# sign the artifact
- task: notation@0
  inputs:
    artifactRefs: '<registry_host>/<repository>@<digest>'
    command: 'sign'
    plugin: 'azureKeyVault'
    azurekvServiceConection: <arm_service_connection>
    keyid: <key_id>
    selfSigned: true
```

</details>

## Trigger the pipeline

After filled out the inputs in the pipeline, you can save it and run it to trigger the pipeline.

Go to **Job** page of the running pipeline, you will be able to see the execution result in each step. This pipeline will build and sign the latest build or the specified digest, then will push the signed image with its associated signature to the registry. On success, you will be able to see the image pushed to your ACR with a COSE format signature attached.