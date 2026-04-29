import { useEffect, useState } from 'react';
import './App.css';

type HealthResponse = {
  status: string;
  service: string;
};

type TimeResponse = {
  iso: string;
  unixMs: number;
  timezone: string;
};

function App() {
  const [status, setStatus] = useState<string>('Loading API status...');
  const [serverTime, setServerTime] = useState<string>('');

  useEffect(() => {
    async function fetchApiData(): Promise<void> {
      try {
        const [healthRes, timeRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/time'),
        ]);

        if (!healthRes.ok || !timeRes.ok) {
          throw new Error('API returned a non-success status code.');
        }

        const healthData: HealthResponse = await healthRes.json();
        const timeData: TimeResponse = await timeRes.json();

        setStatus(`Backend: ${healthData.status}`);
        setServerTime(timeData.iso);
      } catch {
        setStatus('Backend unreachable. Start the server on port 5000.');
      }
    }

    void fetchApiData();
  }, []);

  return (
    <main className="app-shell">
      <h1>Time Verifier (MERN + TypeScript)</h1>
      <p className="status">{status}</p>
      <p className="time-label">Server Time (ISO):</p>
      <code className="time-value">{serverTime || 'No time received yet'}</code>

      <div className="commands">
        <h2>Run Commands</h2>
        <pre>npm run dev</pre>
        <pre>npm run typecheck</pre>
      </div>
    </main>
  );
}

export default App;
