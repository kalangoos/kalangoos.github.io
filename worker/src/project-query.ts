// The only GraphQL queries the Worker runs with a member's token (no pass-through of arbitrary queries).
// Validated against GitHub's live schema: every field exists (see worker/README.md).

const ITEM_FIELDS = `
  id
  type
  isArchived
  fieldValueByName(name: "Status") {
    ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
  }
  content {
    __typename
    ... on Issue {
      title number url state stateReason
      repository { nameWithOwner }
      labels(first: 10) { nodes { name color } }
      assignees(first: 5) { nodes { login avatarUrl } }
      closedByPullRequestsReferences(first: 3, includeClosedPrs: true) { nodes { number url repository { nameWithOwner } } }
    }
    ... on PullRequest {
      title number url state isDraft
      repository { nameWithOwner }
      labels(first: 10) { nodes { name color } }
      assignees(first: 5) { nodes { login avatarUrl } }
      closingIssuesReferences(first: 3) { nodes { number url repository { nameWithOwner } } }
    }
    ... on DraftIssue {
      title
      assignees(first: 5) { nodes { login avatarUrl } }
    }
  }
`;

const PROJECT_FIELDS = `
  number
  title
  url
  closed
  updatedAt
  field(name: "Status") {
    ... on ProjectV2SingleSelectField { id name options { id name color } }
  }
  items(first: 100, after: $after) {
    totalCount
    pageInfo { hasNextPage endCursor }
    nodes { ${ITEM_FIELDS} }
  }
`;

/** The project chosen by number (PROJECT_NUMBER in wrangler.toml). */
export const PROJECT_BY_NUMBER = `query ($org: String!, $number: Int!, $after: String) {
  organization(login: $org) {
    viewerIsAMember
    projectV2(number: $number) { ${PROJECT_FIELDS} }
  }
}`;

/** Without PROJECT_NUMBER: the organisation's most recently updated open project. */
export const LATEST_OPEN_PROJECT = `query ($org: String!, $after: String) {
  organization(login: $org) {
    viewerIsAMember
    projectsV2(first: 1, query: "is:open", orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { ${PROJECT_FIELDS} }
    }
  }
}`;
