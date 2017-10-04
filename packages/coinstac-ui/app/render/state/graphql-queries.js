import {
  gql,
} from 'react-apollo';

export const addComputationMetadata = gql`
  mutation AddJsonSchema($computationSchema: ComputationInput!) {
    addComputation(computationSchema: $computationSchema) {
      id
      meta {
        name
        description
        version
        dockerImage
      }
    }
  }
`;

export const saveConsortiumFunc = gql`
  mutation SaveConsortiumMutation($consortium: ConsortiumInput!) {
    saveConsortium(consortium: $consortium) {
      id
      name
      description
      pipelines
      results
    }
  }
`;

export const deleteConsortiumByIdFunc = gql`
  mutation DeleteConsortiumMutation($consortiumId: ID!) {
    deleteConsortiumById(consortiumId: $consortiumId){
      id
    }
  }
`;

export const deleteAllComputations = gql`
  mutation DeleteAllJsonSchema {
    removeAllComputations
  }
`;

export const fetchComputationMetadata = gql`
  query ComputationMetadataQuery {
    fetchAllComputations {
      id
      meta {
        name
        description
        version
        dockerImage
      }
    }
  }
`;

export const fetchComputationLocalIO = gql`
  query ComputationIOQuery ($computationName: String!) {
    fetchComputationMetadataByName (computationName: $computationName) {
      id
      local
    }
  }
`;

export const fetchAllConsortiaFunc = gql`
  query FetchAllConsortiaQuery {
    fetchAllConsortia {
      id
      activeComputationId
      activeComputationInputs
      description
      name
      tags
      owners
      users
    }
  }
`;
