const sharedFields = require('./shared-fields');

const queries = {
  allDockerImages: `
    {
      fetchAllComputations {
        id
        computation {
          dockerImage
        }
        meta {
          name
        }
      }
    }
  `,
  computationChanged: `
  {
    computationChanged(computationId: $computationId) {
      ${sharedFields.computationMetadata}
    }
  }
  `,
  consortiumChanged: `
  {
    consortiumChanged(consortiumId: $consortiumId) {
      ${sharedFields.consortiaFields}
    }
  }
  `,
  fetchAllComputations: `
    {
      fetchAllComputations {
        ${sharedFields.computationMetadata}
      }
    }
  `,
  fetchAllConsortia: `
    {
      fetchAllConsortia {
        ${sharedFields.consortiaFields}
      }
    }
  `,
  fetchConsortium: `
    {
      fetchConsortium(consortiumId: $consortiumId) {
        ${sharedFields.consortiaFields}
      }
    }
  `,
  fetchPipeline: `
    {
      fetchPipeline(pipelineId: $pipelineId) {
        ${sharedFields.pipelineFields}
      }
    }
  `,
  fetchAllPipelines: `
    {
      fetchAllPipelines {
        ${sharedFields.pipelineFields}
      }
    }
  `,
  fetchComputation: `
    {
      fetchComputation(computationIds: $computationIds) {
        id
        computation {
          input
          output
        }
      }
    }
  `,
  pipelineChanged: `
    {
      pipelineChanged(pipelineId: $pipelineId) {
        ${sharedFields.pipelineFields}
      }
    }
  `,
  runChanged: `
    {
      runChanged(runId: $runId) {
        ${sharedFields.runFields}
      }
    }
  `,
};

module.exports = queries;
