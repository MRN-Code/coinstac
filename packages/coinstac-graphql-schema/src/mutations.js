const sharedFields = require('./shared-fields');

const mutations = {
  addComputation: `
    {
      addComputation(computationSchema: $computationSchema) {
        ${sharedFields.computationMetadata}
      }
    }
  `,
  addUserRole: `
    {
      addUserRole(userId: $userId, table: $table, doc: $doc, role: $role) {
        ${sharedFields.userMetadata}
      }
    }
  `,
  createRun: `
    {
      createRun(consortiumId: $consortiumId) {
        ${sharedFields.runFields}
      }
    }
  `,
  removeComputation: `
    {
      removeComputation(computationId) {
        ${sharedFields.computationMetadata}
      }
    }
  `,
  removeUserRole: `
    {
      removeUserRole(userId: $userId, table: $table, doc: $doc, role: $role) {
        ${sharedFields.userMetadata}
      }
    }
  `,
  saveConsortium: `
    {
      saveConsortium(consortium: $consortium) {
        ${sharedFields.consortiaFields}
      }
    }
  `,
  saveError: `
    {
      saveError(runId: $runId, error: $error)
    }
  `,
  savePipeline: `
    {
      savePipeline(pipeline: $pipeline) {
        ${sharedFields.pipelineFields}
      }
    }
  `,
  saveResults: `
    {
      saveResults(runId: $runId, results: $results)
    }
  `,
  updateRunState: `
    {
      updateRunState(runId: $runId, data: $data)
    }
  `,
  updateUserConsortiumStatus: `
    {
      updateUserConsortiumStatus(consortiumId: $consortiumId, status: $status) {
        ${sharedFields.userMetadata}
      }
    }
  `,
  updateConsortiumMappedUsers: `
    {
      updateConsortiumMappedUsers(consortiumId: $consortiumId, mappedForRun: $mappedForRun)
    }
  `,
};

module.exports = mutations;
