import { gql } from '@apollo/client';

export const GET_COMPETITIONS = gql`
  query GetCompetitions {
    competitions {
      id
      name
      date
      location
      style
    }
  }
`;
