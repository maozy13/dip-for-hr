import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme as antdTheme } from 'antd';
import App from './App';
import './index.css';

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorBgContainer: '#f4f6fb',
          colorBorder: '#e5e7eb',
          colorText: '#0f172a',
          colorPrimary: '#2563eb',
          borderRadiusLG: 12,
        },
      }}
    >
      <App />
    </ConfigProvider>,
  );
}
