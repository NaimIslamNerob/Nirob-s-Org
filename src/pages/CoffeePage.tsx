import React, { useState, useEffect } from 'react';
import { CoffeeConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Coffee,
  Edit2,
  Save,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api';

interface CoffeePageProps {
  config: CoffeeConfig | null;
  onRefresh: () => void;
  onOpenAdminCoffee?: () => void;
  onTriggerLeaveMessage?: () => void;
}

export const CoffeePage: React.FC<CoffeePageProps> = ({
  config,
  onRefresh,
  onOpenAdminCoffee,
  onTriggerLeaveMessage,
}) => {
  const { isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Admin inline editing for bKash number
  const [isEditingNumber, setIsEditingNumber] = useState(false);
  const [numberInput, setNumberInput] = useState(config?.bkashNumber || '+880 1763854187');
  const [savingConfig, setSavingConfig] = useState(false);

  // Listen for exit intent (mouse leaving window upward)
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5) {
        onTriggerLeaveMessage?.();
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [onTriggerLeaveMessage]);

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const bkashNumber = config.bkashNumber || '+880 1763854187';
  const showNumber = config.showBkashNumber !== false;
  const bkashLogo = config.bkashLogoUrl || './assets/aistudio/image_3f45f398.png';

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(bkashNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleToggleShowNumber = async () => {
    setSavingConfig(true);
    try {
      await api.updateCoffeeConfig({ showBkashNumber: !showNumber });
      setStatusMessage(
        !showNumber
          ? 'bKash number is now VISIBLE to all visitors.'
          : 'bKash number is now HIDDEN. Visitors will see "Donation is not currently available".'
      );
      setTimeout(() => setStatusMessage(null), 4000);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update visibility');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numberInput.trim()) return;
    setSavingConfig(true);
    try {
      await api.updateCoffeeConfig({ bkashNumber: numberInput.trim() });
      setStatusMessage('bKash number updated successfully!');
      setTimeout(() => setStatusMessage(null), 4000);
      setIsEditingNumber(false);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update number');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Status or Error Toasts */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-400 hover:text-white px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-600/80 text-rose-300 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-950/40 via-slate-900/90 to-slate-900 border border-pink-500/30 p-8 sm:p-10 backdrop-blur-xl shadow-2xl text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-500/20 border border-pink-500/40 text-pink-400 flex items-center justify-center shadow-lg shadow-pink-500/10">
          <Coffee className="w-8 h-8" />
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
          Buy Me a Cup of Tea / Coffee
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
          If you appreciate my written notes, open-source projects, or had fun playing chess together, you can voluntarily send a cup of tea via bKash!
        </p>

        {isAdmin && onOpenAdminCoffee && (
          <div className="pt-2">
            <button
              onClick={onOpenAdminCoffee}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold cursor-pointer"
            >
              <span>Manage Donation Settings (Admin Dashboard)</span>
            </button>
          </div>
        )}
      </div>

      {/* MAIN BKASH CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-pink-500/40 shadow-2xl shadow-pink-500/10 p-6 sm:p-10 text-center space-y-6">
        {/* Subtle background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* bKash Official Logo */}
        <div className="relative mx-auto w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden bg-gradient-to-tr from-pink-600 to-pink-500 p-2 shadow-2xl shadow-pink-600/30 border border-pink-400/50 flex items-center justify-center">
          <img
            src={bkashLogo}
            alt="bKash"
            className="w-full h-full object-contain drop-shadow-md rounded-2xl"
          />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold text-xs uppercase tracking-wider mb-2">
            bKash Personal
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            Send Money via bKash
          </h3>
        </div>

        {/* NUMBER OR UNAVAILABLE MESSAGE */}
        {showNumber ? (
          <div className="space-y-4 max-w-md mx-auto">
            {/* The Phone Number Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border-2 border-pink-500/60 shadow-lg flex items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[10px] uppercase font-mono text-pink-400 block font-semibold">
                  bKash Account Number
                </span>
                <span className="font-mono text-xl sm:text-2xl font-extrabold text-white tracking-wider select-all">
                  {bkashNumber}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyNumber}
                className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-pink-600/30 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Number</span>
                  </>
                )}
              </button>
            </div>

            {/* Step by step simple instruction */}
            <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-200 text-left space-y-1">
              <p className="font-bold text-white">How to send:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                <li>Open your bKash app and tap <strong className="text-pink-300">Send Money</strong></li>
                <li>Enter recipient number: <strong className="text-white font-mono">{bkashNumber}</strong></li>
                <li>Type your preferred amount and include your name in the <strong className="text-pink-300">Reference</strong></li>
              </ol>
            </div>
          </div>
        ) : (
          /* HIDDEN STATE */
          <div className="max-w-md mx-auto p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <h4 className="text-lg font-bold text-slate-200">
              Donation is not currently available
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Voluntary contributions are temporarily paused. Thank you so much for your kind support and consideration!
            </p>
          </div>
        )}

        {/* ADMIN CONTROLS: HIDE / SHOW ANYTIME & EDIT NUMBER */}
        {isAdmin && (
          <div className="pt-4 border-t border-slate-800/80 max-w-lg mx-auto space-y-3">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleToggleShowNumber}
                disabled={savingConfig}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${
                  showNumber
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
              >
                {showNumber ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>Hide My Number (Show "Donation is not currently available")</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Show My Number to Public</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setNumberInput(bkashNumber);
                  setIsEditingNumber(!isEditingNumber);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{isEditingNumber ? 'Cancel Edit' : 'Change Number'}</span>
              </button>
            </div>

            {/* Inline Number Editor */}
            {isEditingNumber && (
              <form onSubmit={handleSaveNumber} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in text-left">
                <label className="block text-xs font-semibold text-slate-300">
                  Update bKash Personal Number:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={numberInput}
                    onChange={(e) => setNumberInput(e.target.value)}
                    placeholder="+880 1763854187"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
