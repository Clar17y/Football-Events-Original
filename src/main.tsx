import React from 'react';
import ReactDOM from 'react-dom/client';
import { IonApp } from '@ionic/react';
import App from './App';
import { registerSW } from './serviceWorkerRegistration';

import { MatchProvider } from './contexts/MatchContext';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import './index.css';

registerSW();

console.log("main.tsx booted");

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MatchProvider>
      <IonApp>
        <App />
      </IonApp>
    </MatchProvider>
  </React.StrictMode>
);
