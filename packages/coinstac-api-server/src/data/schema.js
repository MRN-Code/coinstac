const { makeExecutableSchema } = require('graphql-tools');
const { pubsub, resolvers } = require('./resolvers');
const sharedFields = require('./shared-fields');

const typeDefs = `
  scalar JSON

  type ComputationMeta {
    ${sharedFields.computationMetaFields}
  }

  input ComputationMetaInput {
    ${sharedFields.computationMetaFields}
  }

  type ComputationRemote {
    ${sharedFields.computationRemoteFields}
  }

  input ComputationRemoteInput {
    ${sharedFields.computationRemoteFields}
  }

  type ComputationField {
    ${sharedFields.computationRemoteFields}
    ${sharedFields.computationFields}
    remote: ComputationRemote
  }

  input ComputationFieldInput {
    ${sharedFields.computationRemoteFields}
    ${sharedFields.computationFields}
    remote: ComputationRemoteInput
  }

  type Computation {
    id: ID!
    delete: Boolean
    meta: ComputationMeta
    computation: ComputationField
    submittedBy: ID!
  }

  input ComputationInput {
    id: ID
    meta: ComputationMetaInput
    computation: ComputationFieldInput
  }

  type Consortium {
    id: ID!
    ${sharedFields.consortiumFields}
  }

  type Result {
    ${sharedFields.resultFields}
  }

  input ConsortiumInput {
    id: ID
    ${sharedFields.consortiumFields}
  }

  type PipelineController {
    ${sharedFields.pipelineControllerFields}
  }

  input PipelineControllerInput {
    ${sharedFields.pipelineControllerFields}
  }

  type PipelineStep {
    id: ID!
    controller: PipelineController
    computations: [Computation]
    ${sharedFields.pipelineStepFields} 
  }

  input PipelineStepInput {
    id: ID
    controller: PipelineControllerInput
    computations: [ID]
    ${sharedFields.pipelineStepFields} 
  }

  type Pipeline {
    id: ID!
    steps: [PipelineStep]
    ${sharedFields.pipelineFields}
  }

  input PipelineInput {
    id: ID
    steps: [PipelineStepInput]
    ${sharedFields.pipelineFields}
  }

  type Run {
    id: ID!,
    consortiumId: ID!
    startDate: String
    endDate: String
    userErrors: String
    globalResults: String
    userResults: String
  }

  type User {
    id: ID!
    ${sharedFields.userFields}
  }

  type UserInput {
    id: ID
    ${sharedFields.userFields}
  }

  # This is the general mutation description
  type Mutation {
    # Stringify incoming computation, parse prior to insertion call
    addComputation(computationSchema: ComputationInput): Computation
    addUserRole(userId: ID, table: String, doc: String, role: String): User
    deleteConsortiumById(consortiumId: ID): Consortium
    deletePipeline(pipelineId: ID): Pipeline
    joinConsortium(consortiumId: ID): Consortium
    leaveConsortium(consortiumId: ID): Consortium
    removeComputation(computationId: ID): Computation
    removeUserRole(userId: ID, table: String, doc: String, role: String): User
    saveActivePipeline(consortiumId: ID, activePipelineId: ID): String
    saveConsortium(consortium: ConsortiumInput): Consortium
    savePipeline(pipeline: PipelineInput): Pipeline
    setActiveComputation(computationId: ID, consortiumId: ID): String
    setComputationInputs(consortiumId: ID, fieldIndex: Int, values: String ): String
    updateUserConsortiumStatus(consortiumId: ID, status: String): User
  }

  # This is a description of the queries
  type Query {
    # This is a description of the fetchAllComputations query
    fetchAllComputations: [Computation]
    fetchAllConsortia: [Consortium]
    fetchAllPipelines: [Pipeline]
    fetchAllResults: [Result]
    fetchComputation(computationIds: [ID]): [Computation]
    fetchConsortium(consortiumId: ID): Consortium
    fetchPipeline(pipelineId: ID): Pipeline
    fetchResult(resultId: ID): Result
    validateComputation(compId: ID): Boolean
  }

  type Subscription {
    computationChanged(computationId: ID): Computation
    consortiumChanged(consortiumId: ID): Consortium
    pipelineChanged(pipelineId: ID): Pipeline
    resultChanged(resultId: ID): Result
  }
`;

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = {
  schema,
  pubsub,
};
