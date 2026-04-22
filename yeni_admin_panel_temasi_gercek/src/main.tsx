import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { setContext } from '@apollo/client/link/context';
import App from './App.tsx';
import './index.css';

// Environment-based GraphQL URL - pointing directly to API Gateway
const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '/api/graphql';

// Auth link to inject JWT token
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('vrag_admin_jwt');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

const client = new ApolloClient({
  link: from([authLink, new HttpLink({
    uri: GRAPHQL_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </StrictMode>,
);
