import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQuery } from '@apollo/client/react';
import { QrCode, Keyboard, CheckCircle2, AlertCircle, Camera, Search, Loader2 } from 'lucide-react';
import { QUICK_CHECKIN, GET_USERS_WITH_STATUS } from '../../api/graphql';

export default function CheckIn() {
  const [mode, setMode] = useState<'qr' | 'manual'>('qr');
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; user?: any } | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const { data: usersData } = useQuery(GET_USERS_WITH_STATUS) as any;

  const [quickCheckin, { loading: checkinLoading }] = useMutation(QUICK_CHECKIN) as any;

  const handleCheckIn = async (userId: string, eventCode: string) => {
    setIsScanning(false);
    
    try {
      const { data } = await quickCheckin({
        variables: { userId, eventCode }
      });

      if (data?.quickCheckin) {
        setScanResult({
          success: true,
          message: `Check-in başarılı! Katılım kaydedildi.`,
          user: { id: userId, name: 'Katılımcı', trait: 'Doğrulandı' }
        });
      }
    } catch (error: any) {
      setScanResult({
        success: false,
        message: error.message || 'Check-in başarısız oldu.'
      });
    }

    // Reset after 4 seconds
    setTimeout(() => {
      setScanResult(null);
      setManualCode('');
      setIsScanning(true);
    }, 4000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      // For manual mode, we might need a default event ID or handle code parsing
      handleCheckIn(manualCode, "MANUAL_ENTRY");
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <QrCode className="w-8 h-8 text-electric-blue" />
          Yoklama & Check-in
        </h1>
        <p className="text-gray-400">Etkinliklere ve atölyelere katılımı QR kod veya manuel kod ile kaydedin.</p>
      </div>

      <div className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden flex-1 flex flex-col">
        {/* Mode Toggle */}
        <div className="flex border-b border-dark-border">
          <button
            onClick={() => setMode('qr')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
              mode === 'qr' ? 'bg-electric-blue/10 text-electric-blue border-b-2 border-electric-blue' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Camera className="w-5 h-5" />
            Kamera ile QR Tara
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
              mode === 'manual' ? 'bg-electric-blue/10 text-electric-blue border-b-2 border-electric-blue' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Keyboard className="w-5 h-5" />
            Manuel Kod Gir
          </button>
        </div>

        <div className="flex-1 p-8 flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {scanResult ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`p-8 rounded-2xl border flex flex-col items-center text-center max-w-md w-full ${
                  scanResult.success ? 'bg-neon-mint/10 border-neon-mint/30' : 'bg-coral-red/10 border-coral-red/30'
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle2 className="w-16 h-16 text-neon-mint mb-4" />
                ) : (
                  <AlertCircle className="w-16 h-16 text-coral-red mb-4" />
                )}
                <h3 className={`text-xl font-bold mb-2 ${scanResult.success ? 'text-neon-mint' : 'text-coral-red'}`}>
                  {scanResult.success ? 'Check-in Başarılı' : 'Hata'}
                </h3>
                <p className="text-gray-300">{scanResult.message}</p>
                
                {scanResult.user && (
                  <div className="mt-6 p-4 bg-[#0d1117] rounded-xl border border-dark-border w-full text-left">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-electric-blue font-bold">
                        {scanResult.user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-white">{scanResult.user.name}</div>
                        <div className="text-xs text-gray-500">{scanResult.user.trait}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">ID: {scanResult.user.id}</div>
                  </div>
                )}
              </motion.div>
            ) : mode === 'qr' ? (
              <motion.div
                key="qr"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-72 h-72 rounded-3xl border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden bg-[#0d1117]">
                  {/* Mock Camera View */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-electric-blue to-transparent"></div>
                  
                  {/* Scanning Animation Line */}
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-electric-blue shadow-[0_0_15px_rgba(0,242,254,0.8)] z-10"
                  />
                  
                  <QrCode className="w-16 h-16 text-gray-500 opacity-50" />
                  
                  {/* Corner Markers */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-electric-blue rounded-tl-lg"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-electric-blue rounded-tr-lg"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-electric-blue rounded-bl-lg"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-electric-blue rounded-br-lg"></div>
                </div>
                <p className="mt-6 text-gray-400 font-medium">Kamerayı QR koda hizalayın...</p>
              </motion.div>
            ) : (
              <motion.div
                key="manual"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-md"
              >
                <form onSubmit={handleManualSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Kullanıcı veya Etkinlik Kodu</label>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Örn: USR-001 veya Ali Yılmaz"
                        className="w-full bg-[#0d1117] border border-dark-border rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-electric-blue transition-colors text-lg"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="w-full bg-electric-blue hover:bg-electric-blue/90 text-[#010409] font-bold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Yoklamayı Kaydet
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
