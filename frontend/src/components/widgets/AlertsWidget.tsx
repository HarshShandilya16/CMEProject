// frontend/src/components/widgets/AlertsWidget.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getAlerts, type AlertEvent } from '../../services/apiService';

interface Props {
  symbol?: string;
}

export const AlertsWidget: React.FC<Props> = ({ symbol }) => {
  const { currentSymbol, theme } = useAppStore();
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSymbol = (symbol || currentSymbol || '').toUpperCase();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!activeSymbol) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    getAlerts(activeSymbol)
      .then((resp) => {
        if (!mounted) return;
        setAlerts(resp.alerts || []);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Failed to load alerts');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeSymbol]);

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';

  const badgeColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'HIGH':
        return 'bg-red-500 text-white';
      case 'MEDIUM':
        return 'bg-amber-500 text-black';
      default:
        return 'bg-emerald-500 text-black';
    }
  };

  return (
    <div className={`${cardBg} border ${border} rounded-xl shadow-lg p-3 h-full flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className={`text-lg font-semibold ${textPrimary}`}>Unusual Activity Alerts</h3>
          <p className={`text-xs ${textMuted}`}>
            Rule-based alerts combining OI, PCR, IV/RV and social buzz
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[10px] ${textMuted}`}>Active symbol</span>
          <span className={`text-sm font-semibold ${textPrimary}`}>{activeSymbol || '-'}</span>
        </div>
      </div>

      {loading && (
        <div className={`flex-1 flex items-center justify-center ${textMuted} text-xs`}>
          Loading alerts...
        </div>
      )}

      {!loading && error && (
        <div className="flex-1 flex items-center justify-center text-xs text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className={`flex-1 flex items-center justify-center ${textMuted} text-xs`}>
          No unusual activity detected right now.
        </div>
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {alerts.map((alert) => (
            <div
              key={`${alert.rule_name}-${alert.message}`}
              className={`rounded-lg px-3 py-2 text-xs ${
                isDark ? 'bg-gray-900/70 border border-gray-700' : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${badgeColor(
                      alert.severity,
                    )}`}
                  >
                    {alert.severity}
                  </span>
                  <span className={`text-[11px] font-semibold ${textPrimary}`}>
                    {alert.rule_name.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <p className={`text-[11px] mb-1 ${textMuted}`}>{alert.message}</p>

              {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(alert.metadata).map(([k, v]) => (
                    <span
                      key={k}
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="font-semibold mr-1">{k}:</span>
                      <span>{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsWidget;
