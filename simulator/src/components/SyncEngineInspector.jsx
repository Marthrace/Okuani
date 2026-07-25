import React from 'react';

export default function SyncEngineInspector({ logs }) {
  return (
    <div className="sync-logger">
      {logs.length === 0 ? (
        <div style={{ color: '#64748b', fontStyle: 'italic', textAlign: 'center', paddingTop: '40px' }}>
          -- Sync engine idle. Awaiting operations --
        </div>
      ) : (
        logs.map((log, idx) => {
          let colorClass = 'log-info';
          if (log.type === 'success') colorClass = 'log-success';
          if (log.type === 'error') colorClass = 'log-error';
          if (log.type === 'warning') colorClass = 'log-warning';

          return (
            <div key={idx} className="log-entry">
              <span className="log-time">[{log.time}]</span>
              <span className={colorClass}>{log.text}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
