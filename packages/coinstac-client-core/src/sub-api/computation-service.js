'use strict';

/**
 * @module computation-service
 */
const common = require('coinstac-common');
const Computation = common.models.computation.Computation;
const crypto = require('crypto');
const ModelService = require('../model-service');
const RemoteComputationResult = common.models.computation.RemoteComputationResult;

/**
 * @extends ModelService
 */
class ComputationService extends ModelService {
  modelServiceHooks() {
    return {
      dbName: 'computations',
      ModelType: Computation,
    };
  }

  /**
   * Kick off a remote computation result.
   *
   * @param {Object} options
   * @param {string} options.consortiumId
   * @param {string} options.projectId
   * @returns {Promise}
   */
  kickoff({ consortiumId, projectId }) {
    const client = this.client;

    return Promise.all([
      client.consortia.get(consortiumId),
      client.projects.get(projectId),
    ]).then(([consortium, project]) => {
      if (!consortium.activeComputationId) {
        throw new Error(
          `Consortium "${consortium.label}" doesn't have an active computation`
        );
      }
      const activeComputationId = consortium.activeComputationId;
      const isConsortiumOwner = consortium.owners.indexOf(client.auth.getUser().username) > -1;

      return client.dbRegistry.get(`remote-consortium-${consortiumId}`)
        .find({
          selector: {
            complete: false,
          },
        })
        .then(docs => {
          if (!docs || !docs.length) {
            if (!isConsortiumOwner) {
              throw new Error('Only consortium owners can start!');
            }

            return crypto
              .createHash('md5')
              .update(`${consortiumId}${activeComputationId}${Date.now()}`)
              .digest('hex');
          }

          return docs[0]._id;
        })
        .then(runId => {
          const result = new RemoteComputationResult({
            _id: runId,
            computationId: activeComputationId,
            consortiumId,
          });
          return client.pool.triggerRunner(result, project);
        });
    });
  }
}

module.exports = ComputationService;
