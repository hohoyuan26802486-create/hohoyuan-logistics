import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Direct mount into main application without any popup or modal blocking the view
createRoot(document.getElementById('root')!).render(<App />);
