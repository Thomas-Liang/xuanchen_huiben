import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntApp } from 'antd';
import App from './App';
import { ThemeProvider } from './theme';
import './index.css';
import './antd-compat.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AntApp>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AntApp>
  </React.StrictMode>
);
