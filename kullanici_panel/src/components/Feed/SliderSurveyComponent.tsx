import React, { useState, useRef } from 'react';
import { useTelemetryTracker } from '../../hooks/useTelemetryTracker';
import { EngagementButtons } from '../Shared/EngagementButtons';
import { motion } from 'framer-motion';

interface SliderSurveyProps {
  post: {
    id: string;
    authorName?: string;
    isSystem?: boolean;
    createdAt?: string;
    uiPayload: {
      question: string;
      sliderMin: number;
      sliderMax: number;
      labels: string[];
      media?: string;
    };
  };
}

export const SliderSurveyComponent: React.FC<SliderSurveyProps> = ({ post }) => {
  const { uiPayload, authorName, isSystem } = post;
  const [value, setValue] = useState(
    Math.round((uiPayload.sliderMin + uiPayload.sliderMax) / 2)
  );
  const [submitted, setSubmitted] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const initialValue = useRef(value);

  const {
    containerRef,
    onMouseEnter,
    onMouseLeave,
    onKeyDown,
    trackChangeMind,
    trackInteraction,
    submitTelemetry,
  } = useTelemetryTracker(post.id, 'slider_survey');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setValue(newValue);
    setChangeCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        trackChangeMind();
      }
      return newCount;
    });
  };

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    trackInteraction(post.id);

    const wasDefault = value === initialValue.current;
    const range = uiPayload.sliderMax - uiPayload.sliderMin;
    const normalizedValue = ((value - uiPayload.sliderMin) / range) * 100;

    submitTelemetry('slider_answered', {
      slider_value: value,
      slider_min: uiPayload.sliderMin,
      slider_max: uiPayload.sliderMax,
      normalized_value: Math.round(normalizedValue),
      was_default_position: wasDefault,
      adjustment_count: changeCount,
      is_fine_tuned: changeCount > 5,
      question: uiPayload.question,
    });
  };

  const displayName = authorName || 'Anket';
  const range = uiPayload.sliderMax - uiPayload.sliderMin;
  const percent = ((value - uiPayload.sliderMin) / range) * 100;

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Az önce';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes}dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}sa önce`;
    return `${Math.floor(hours / 24)}g önce`;
  };

  return (
    <motion.div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4 shadow-sm"
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-[#d29922] to-[#f85149]">
          {isSystem ? 'V' : displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="text-[#c9d1d9] font-semibold text-sm">{displayName}</h3>
          <p className="text-[#8b949e] text-xs">{timeAgo(post.createdAt)}</p>
        </div>
      </div>

      <p className="text-[#c9d1d9] font-medium text-[15px] mb-6">{uiPayload.question}</p>

      {/* Media (if any) */}
      {uiPayload.media && (
        <div className="mb-4 rounded-lg overflow-hidden border border-[#30363d]">
          <img src={uiPayload.media} alt="Survey media" className="w-full h-40 object-cover" />
        </div>
      )}

      {/* Slider */}
      <div className="px-2 mb-4" onKeyDown={onKeyDown}>
        <div className="relative mb-6">
          <input
            type="range"
            min={uiPayload.sliderMin}
            max={uiPayload.sliderMax}
            value={value}
            onChange={handleChange}
            onMouseUp={handleSubmit}
            onTouchEnd={handleSubmit}
            disabled={submitted}
            className="w-full h-2 bg-[#0d1117] rounded-full appearance-none cursor-pointer slider-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #58a6ff 0%, #58a6ff ${percent}%, #30363d ${percent}%, #30363d 100%)`,
            }}
          />
          {/* Value Badge */}
          <div
            className="absolute -top-8 transform -translate-x-1/2 bg-[#58a6ff] text-white text-xs font-bold px-2 py-1 rounded shadow-lg"
            style={{ left: `${percent}%` }}
          >
            {value}
          </div>
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs text-[#8b949e] mb-2">
          <span>{uiPayload.labels[0] || uiPayload.sliderMin}</span>
          <span>{uiPayload.labels[1] || uiPayload.sliderMax}</span>
        </div>
      </div>

      {/* Submit Button */}
      {!submitted && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          className="w-full py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-medium transition-colors"
        >
          Cevabı Gönder
        </motion.button>
      )}

      {/* Confirmation */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-2 text-sm text-[#238636] font-medium"
        >
          ✅ Cevabın kaydedildi!
        </motion.div>
      )}

      <EngagementButtons onAction={() => trackInteraction(post.id)} />
    </motion.div>
  );
};
