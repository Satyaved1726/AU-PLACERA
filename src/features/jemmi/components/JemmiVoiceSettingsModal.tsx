import React, { useState } from 'react';
import { Settings, Mic, CheckCircle2, XCircle, RefreshCw, X } from 'lucide-react';
import { checkMicrophoneAccess } from '../services/jemmiVoiceDiagnostic';
import type { MicrophoneDiagnosticResult } from '../types/jemmi.types';

interface JemmiVoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDevices: Array<{ deviceId: string; label: string }>;
  selectedDeviceId?: string;
  onSelectDevice: (deviceId: string) => void;
}

export const JemmiVoiceSettingsModal: React.FC<JemmiVoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  availableDevices,
  selectedDeviceId,
  onSelectDevice
}) => {
  const [diagnosticResult, setDiagnosticResult] = useState<MicrophoneDiagnosticResult | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);

  if (!isOpen) return null;

  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const res = await checkMicrophoneAccess();
      setDiagnosticResult(res);
    } catch {
      // ignore
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] dark:bg-amber-400/10 dark:text-amber-400">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Voice & Microphone Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Microphone Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-[#0B3C5D] dark:text-amber-400" />
            Active Microphone Device
          </label>
          {availableDevices.length > 0 ? (
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B3C5D]/20 cursor-pointer"
            >
              <option value="">Default System Microphone</option>
              {availableDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              No additional external microphones detected. Using system default.
            </p>
          )}
        </div>

        {/* Diagnostic Tool */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Microphone Diagnostics</span>
            <button
              type="button"
              onClick={handleRunDiagnostic}
              disabled={isRunningDiagnostic}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B3C5D] dark:text-amber-400 hover:underline cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
              <span>{isRunningDiagnostic ? 'Testing...' : 'Run Test'}</span>
            </button>
          </div>

          {diagnosticResult && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Speech API Support:</span>
                <span className="flex items-center gap-1 font-semibold">
                  {diagnosticResult.speechRecognitionSupported ? (
                    <span className="text-green-600 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-0.5">
                      <XCircle className="w-3.5 h-3.5" /> Fallback Mode
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Microphone Hardware:</span>
                <span className="flex items-center gap-1 font-semibold">
                  {diagnosticResult.canRecordAudio ? (
                    <span className="text-green-600 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Connected & Working
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-0.5">
                      <XCircle className="w-3.5 h-3.5" /> Check Permission
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Permission Status:</span>
                <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white">
                  {diagnosticResult.permissionState}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#0B3C5D] hover:bg-[#082a42] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
