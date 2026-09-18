import React, { useState, useEffect } from 'react';
import { Settings, Mic, CheckCircle2, XCircle, RefreshCw, X, HelpCircle, ShieldAlert, ArrowRight } from 'lucide-react';
import { checkMicrophoneAccess, detectBrowser } from '../services/jemmiVoiceDiagnostic';
import type { MicrophoneDiagnosticResult } from '../types/jemmi.types';

interface JemmiVoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDevices: Array<{ deviceId: string; label: string }>;
  selectedDeviceId?: string;
  onSelectDevice: (deviceId: string) => void;
  onRetryVoice?: () => void;
}

export const JemmiVoiceSettingsModal: React.FC<JemmiVoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  availableDevices,
  selectedDeviceId,
  onSelectDevice,
  onRetryVoice
}) => {
  const [diagnosticResult, setDiagnosticResult] = useState<MicrophoneDiagnosticResult | null>(null);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const browserName = detectBrowser();

  const runDiagnostic = async () => {
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

  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0B3C5D]/10 text-[#0B3C5D] dark:bg-amber-400/10 dark:text-amber-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                Jemmi Microphone Setup
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Diagnostics & site permission helper ({browserName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Section 1: How to Allow Instructions */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 rounded-xl p-3 text-amber-900 dark:text-amber-200 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950 dark:text-amber-100">
              <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>Allow microphone access for this site</span>
            </div>
            <ol className="list-decimal pl-5 text-[11px] space-y-1 text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
              <li>Click the <strong>padlock / site settings icon (🔒 or 🎛)</strong> beside the address bar.</li>
              <li>Find <strong>Microphone</strong> in the permissions list.</li>
              <li>Select <strong>Allow</strong> or <strong>Allow this time</strong>.</li>
              <li>Return here and click <strong>Try Again</strong> below.</li>
            </ol>
            <p className="text-[10px] text-amber-800 dark:text-amber-300/80 italic pt-0.5">
              Note: Websites cannot change browser permissions automatically. You must grant it in browser site settings.
            </p>
          </div>

          {/* Section 2: Live Diagnostic Setup Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Diagnostic Checklist
              </span>
              <button
                type="button"
                onClick={runDiagnostic}
                disabled={isRunningDiagnostic}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B3C5D] dark:text-amber-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRunningDiagnostic ? 'animate-spin' : ''}`} />
                <span>{isRunningDiagnostic ? 'Checking...' : 'Re-test'}</span>
              </button>
            </div>

            {diagnosticResult ? (
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700 space-y-2">
                {/* 1. Browser Microphone API Support */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 text-[11px]">1. Browser Microphone API</span>
                  <span className="font-semibold text-[11px]">
                    {diagnosticResult.getUserMediaSupported ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Unsupported
                      </span>
                    )}
                  </span>
                </div>

                {/* 2. Microphone Permission */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 text-[11px]">2. Microphone Permission</span>
                  <span className="font-semibold text-[11px]">
                    {diagnosticResult.canRecordAudio || diagnosticResult.permissionState === 'granted' ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Granted
                      </span>
                    ) : diagnosticResult.permissionState === 'denied' ? (
                      <span className="text-red-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Blocked / Denied
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Needs Permission
                      </span>
                    )}
                  </span>
                </div>

                {/* 3. Physical Microphone Device */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 text-[11px]">3. Microphone Device</span>
                  <span className="font-semibold text-[11px]">
                    {diagnosticResult.microphoneAvailable ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Detected ({diagnosticResult.deviceList.length || 1})
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> No Mic Detected
                      </span>
                    )}
                  </span>
                </div>

                {/* 4. Speech Recognition Engine */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 text-[11px]">4. Speech Recognition</span>
                  <span className="font-semibold text-[11px]">
                    {diagnosticResult.speechRecognitionSupported ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Available ({browserName})
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Unsupported in {browserName}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs">
                Running initial diagnostics...
              </div>
            )}
          </div>

          {/* Section 3: Active Microphone Device Selection */}
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
              <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                Default system microphone will be used automatically.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {onRetryVoice && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRetryVoice();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0B3C5D] hover:bg-[#082a42] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <span>Try Again</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
