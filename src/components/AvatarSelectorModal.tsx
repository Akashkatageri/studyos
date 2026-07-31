import React, { useState } from 'react';
import {
  DuoAvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  encodeAvatarConfig,
  parseAvatarConfig,
  SKIN_TONES,
  HAIR_COLORS,
  CLOTHING_COLORS,
  BACKGROUND_COLORS,
  EXPRESSION_NAMES,
  GLASSES_NAMES,
  CLOTHING_NAMES,
  HAIRSTYLE_NAMES,
} from './DuoAvatarSvg';
import AvatarRenderer from './AvatarRenderer';
import { SoundManager } from '../utils/soundManager';
import { Check, Dices, X, Sparkles, User, Scissors, Glasses, Shirt, Smile, Palette } from 'lucide-react';

interface AvatarSelectorModalProps {
  currentAvatar: string;
  onSave: (newAvatar: string) => void;
  onClose: () => void;
}

type TabType = 'skin' | 'hair' | 'glasses' | 'clothes' | 'expression' | 'background';

export default function AvatarSelectorModal({
  currentAvatar,
  onSave,
  onClose,
}: AvatarSelectorModalProps) {
  // Parse current avatar or fallback to default config
  const initialConfig = parseAvatarConfig(currentAvatar) || DEFAULT_AVATAR_CONFIG;
  const [config, setConfig] = useState<DuoAvatarConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<TabType>('skin');

  const updateConfig = (key: keyof DuoAvatarConfig, value: number) => {
    SoundManager.play('click');
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleRandomize = () => {
    SoundManager.play('streak_secured');
    setConfig({
      skinTone: Math.floor(Math.random() * SKIN_TONES.length),
      hairStyle: Math.floor(Math.random() * HAIRSTYLE_NAMES.length),
      hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
      expression: Math.floor(Math.random() * EXPRESSION_NAMES.length),
      glasses: Math.floor(Math.random() * GLASSES_NAMES.length),
      clothing: Math.floor(Math.random() * CLOTHING_NAMES.length),
      clothingColor: Math.floor(Math.random() * CLOTHING_COLORS.length),
      background: Math.floor(Math.random() * BACKGROUND_COLORS.length),
    });
  };

  const handleSave = () => {
    SoundManager.play('badge_unlock');
    const encoded = encodeAvatarConfig(config);
    onSave(encoded);
    onClose();
  };

  const currentEncoded = encodeAvatarConfig(config);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-[#10141C] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0C0F17]">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer border border-white/5"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h3 className="text-base font-black text-white uppercase tracking-wider font-display flex items-center gap-1.5 justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Customize Avatar
            </h3>
            <p className="text-[10px] text-gray-400 font-mono">STUDYOS CHARACTER STUDIO</p>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-lg shadow-purple-600/30 border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>

        {/* LIVE PREVIEW HERO STAGE */}
        <div className="p-5 flex flex-col items-center justify-center bg-gradient-to-b from-[#141A24] to-[#10141C] border-b border-white/5 relative">
          <div className="relative group">
            {/* Live Vector Avatar */}
            <div className="w-32 h-36 sm:w-36 sm:h-40 rounded-3xl overflow-hidden shadow-2xl border-2 border-purple-500/40 group-hover:border-purple-400 transition-all flex items-center justify-center">
              <AvatarRenderer avatar={currentEncoded} size={150} />
            </div>

            {/* Surprise Me Floating Button */}
            <button
              onClick={handleRandomize}
              className="absolute -bottom-2 -right-2 p-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg border-2 border-slate-900 cursor-pointer transition-all active:scale-95 hover:scale-110 flex items-center justify-center"
              title="Surprise Me 🎲"
            >
              <Dices className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CATEGORY TAB BAR */}
        <div className="flex items-center gap-1 p-2 bg-[#0C0F17] overflow-x-auto border-b border-white/5 scrollbar-none">
          {[
            { id: 'skin' as TabType, label: 'Skin', icon: User },
            { id: 'hair' as TabType, label: 'Hair', icon: Scissors },
            { id: 'glasses' as TabType, label: 'Glasses', icon: Glasses },
            { id: 'clothes' as TabType, label: 'Clothes', icon: Shirt },
            { id: 'expression' as TabType, label: 'Look', icon: Smile },
            { id: 'background' as TabType, label: 'Theme', icon: Palette },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  SoundManager.play('click');
                  setActiveTab(tab.id);
                }}
                className={`flex-1 min-w-[70px] py-2 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-gray-400'}`} />
                <span className="text-[10px] uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SWATCHES & STYLE SELECTION DRAWER */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* SKIN TONE TAB */}
          {activeTab === 'skin' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono">Skin Tone</label>
              <div className="grid grid-cols-6 gap-3">
                {SKIN_TONES.map((hex, idx) => (
                  <button
                    key={hex}
                    onClick={() => updateConfig('skinTone', idx)}
                    className={`w-11 h-11 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center shadow-md ${
                      config.skinTone === idx ? 'border-purple-400 scale-110 shadow-purple-500/40' : 'border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {config.skinTone === idx && <Check className="w-5 h-5 text-slate-900 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* HAIR TAB */}
          {activeTab === 'hair' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono mb-2">Hair Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HAIRSTYLE_NAMES.map((name, idx) => (
                    <button
                      key={name}
                      onClick={() => updateConfig('hairStyle', idx)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between ${
                        config.hairStyle === idx
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm'
                          : 'bg-[#141822] border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{name}</span>
                      {config.hairStyle === idx && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono mb-2">Hair Color</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {HAIR_COLORS.map((hex, idx) => (
                    <button
                      key={hex}
                      onClick={() => updateConfig('hairColor', idx)}
                      className={`w-9 h-9 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center ${
                        config.hairColor === idx ? 'border-purple-400 scale-110' : 'border-white/10 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {config.hairColor === idx && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GLASSES TAB */}
          {activeTab === 'glasses' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono">Eyewear Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {GLASSES_NAMES.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => updateConfig('glasses', idx)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center flex flex-col items-center gap-1 ${
                      config.glasses === idx
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm'
                        : 'bg-[#141822] border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CLOTHES TAB */}
          {activeTab === 'clothes' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono mb-2">Outfit Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CLOTHING_NAMES.map((name, idx) => (
                    <button
                      key={name}
                      onClick={() => updateConfig('clothing', idx)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between ${
                        config.clothing === idx
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm'
                          : 'bg-[#141822] border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{name}</span>
                      {config.clothing === idx && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono mb-2">Outfit Color</label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                  {CLOTHING_COLORS.map((hex, idx) => (
                    <button
                      key={hex}
                      onClick={() => updateConfig('clothingColor', idx)}
                      className={`w-9 h-9 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center ${
                        config.clothingColor === idx ? 'border-purple-400 scale-110' : 'border-white/10 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {config.clothingColor === idx && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EXPRESSION TAB */}
          {activeTab === 'expression' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono">Facial Expression</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {EXPRESSION_NAMES.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => updateConfig('expression', idx)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      config.expression === idx
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm'
                        : 'bg-[#141822] border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BACKGROUND TAB */}
          {activeTab === 'background' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block font-mono">Background Color Theme</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {BACKGROUND_COLORS.map((hex, idx) => (
                  <button
                    key={hex}
                    onClick={() => updateConfig('background', idx)}
                    className={`h-14 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center shadow-lg ${
                      config.background === idx ? 'border-white scale-105 ring-2 ring-purple-500' : 'border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  >
                    {config.background === idx && <Check className="w-6 h-6 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
