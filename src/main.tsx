import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './context/ctx'
import App from './App'
import './styles/app.css'

const el = document.getElementById('root')
if (el) createRoot(el).render(<AppProvider><App /></AppProvider>)
