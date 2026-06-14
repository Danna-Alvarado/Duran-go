import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import 'leaflet/dist/leaflet.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="275077458710-9uai1jth58kj60n6m5fg7sdh9502u0vs.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);