import axios from 'axios';
import type { Pod, GPU, Volume, DeployConfig } from '../types';

const RUNPOD_URL = '/graphql';

/**
 * Service to interact with RunPod GraphQL API
 */
class RunPodService {
  private getHeaders(apiKey: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
  }

  private async graphqlRequest(apiKey: string, query: string, variables: object = {}) {
    try {
      const response = await axios.post(
        RUNPOD_URL,
        { query, variables },
        { headers: this.getHeaders(apiKey) }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      return response.data.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.errors?.[0]?.message || error.message);
      }
      throw error;
    }
  }

  /**
   * Validates the provided API key by calling 'myself' query
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const data = await this.graphqlRequest(apiKey, `query { myself { id email } }`);
      return !!data.myself.id;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetches available network volumes
   */
  async getNetworkVolumes(apiKey: string): Promise<Volume[]> {
    const query = `
      query {
        myself {
          networkVolumes {
            id
            name
            size
            dataCenterId
          }
        }
      }
    `;
    const data = await this.graphqlRequest(apiKey, query);
    return data.myself.networkVolumes;
  }

  /**
   * Fetches available GPU types (optimized for secure cloud check)
   */
  async getGpus(apiKey: string): Promise<GPU[]> {
    const query = `
      query GpuTypes {
        gpuTypes {
          id
          displayName
          memoryInGb
          secureCloud
          communityCloud
          securePrice
          lowestPrice(input: { gpuCount: 1 }) {
            minimumBidPrice
            uninterruptablePrice
          }
        }
      }
    `;
    const data = await this.graphqlRequest(apiKey, query);
    return data.gpuTypes;
  }

  /**
   * Deploys a new pod based on a template
   */
  async deployPod(apiKey: string, config: DeployConfig): Promise<Pod> {
    const mutation = `
      mutation createPod($input: PodFindAndDeployOnDemandInput!) {
        podFindAndDeployOnDemand(input: $input) {
          id
          name
          desiredStatus
        }
      }
    `;

    const variables = {
      input: {
        name: config.name,
        templateId: config.templateId,
        gpuTypeId: config.gpuTypeId,
        gpuCount: config.gpuCount,
        cloudType: config.cloudType,
        networkVolumeId: config.networkVolumeId,
        // Default mount path as per orchestrated script
        volumeMountPath: '/workspace',
      }
    };

    const data = await this.graphqlRequest(apiKey, mutation, variables);
    return data.podFindAndDeployOnDemand;
  }

  /**
   * Fetches all pods for the current user
   */
  async getPods(apiKey: string): Promise<Pod[]> {
    const query = `
      query {
        myself {
          pods {
            id
            name
            desiredStatus
            imageName
            runtime {
              uptimeInSeconds
              ports {
                ip
                isIpPublic
                privatePort
                publicPort
                type
              }
            }
          }
        }
      }
    `;
    const data = await this.graphqlRequest(apiKey, query);
    return data.myself.pods;
  }

  /**
   * Gets current status of a pod
   */
  async getPodStatus(apiKey: string, podId: string): Promise<Pod> {
    const query = `
      query Pod($podId: String!) {
        pod(input: { podId: $podId }) {
          id
          name
          desiredStatus
          imageName
          runtime {
            uptimeInSeconds
            ports {
              ip
              isIpPublic
              privatePort
              publicPort
              type
            }
          }
        }
      }
    `;
    const data = await this.graphqlRequest(apiKey, query, { podId });
    return data.pod;
  }

  /**
   * Terminates a pod
   */
  async terminatePod(apiKey: string, podId: string): Promise<void> {
    const mutation = `
      mutation terminatePod($podId: String!) {
        podTerminate(input: { podId: $podId })
      }
    `;
    await this.graphqlRequest(apiKey, mutation, { podId });
  }
}

export const runpodApi = new RunPodService();
