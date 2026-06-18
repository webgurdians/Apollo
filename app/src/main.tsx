import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { I18nextProvider } from 'react-i18next'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import i18n from './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <TRPCProvider>
          <App />
        </TRPCProvider>
      </I18nextProvider>
    </BrowserRouter>
  </StrictMode>,
)
