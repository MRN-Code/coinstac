const { makeExecutableSchema } = require('graphql-tools');
const resolvers = require('./resolvers');
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
    meta: ComputationMeta
    computation: ComputationField
  }

  input ComputationInput {
    id: ID
    meta: ComputationMetaInput
    computation: ComputationFieldInput
  }

  # Should owners/users be an array of user objects?
  type Consortium {
    id: ID!
    ${sharedFields.consortiumFields}
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

  type Pipeline {
    id: ID!
    controller: PipelineController
    ${sharedFields.pipelineFields}
  }

  input PipelineInput {
    id: ID
    controller: PipelineControllerInput
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
    username: String!
  }

  # This is the general mutation description
  type Mutation {
    # Stringify incoming computation, parse prior to insertion call
    addComputation(computationSchema: ComputationInput): Computation
    removeComputation(compId: ID): JSON
    removeAllComputations: JSON
    deleteConsortiumById(consortiumId: ID): Consortium
    joinConsortium(username: String, consortiumId: ID): Consortium
    setActiveComputation(computationId: ID, consortiumId: ID): String
    setComputationInputs(consortiumId: ID, fieldIndex: Int, values: String ): String
    leaveConsortium(username: String, consortiumId: ID): String
    saveConsortium(consortium: ConsortiumInput): Consortium
  }

  # This is a description of the queries
  type Query {
    # This is a description of the fetchAllComputations query
    fetchAllComputations: [Computation]
    fetchComputationDetails(computationIds: [ID]): [Computation]
    fetchAllConsortia: [Consortium]
    fetchAllPipelines: [Pipeline]
    validateComputation(compId: ID): Boolean
    fetchConsortiumById(consortiumId: ID): Consortium
    fetchRunForConsortium(consortiumId: ID): [Run]
    fetchRunForUser(username: String): [Run]
    fetchRunById: Run
  }
`;

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = schema;
