import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ScheduleConfig, SocialSource, TopicItem } from '../types.ts';
import { PulseLogoMark } from './PlatformIcon.tsx';
import { ScheduleConfigurator } from './ScheduleConfigurator.tsx';
import { SourceSelector } from './SourceSelector.tsx';
import { TopicSelector } from './TopicSelector.tsx';

interface OnboardingWizardProps {
  initialTopics: TopicItem[];
  initialSources: SocialSource[];
  initialSchedule: ScheduleConfig;
  onComplete: (data: {
    topics: TopicItem[];
    sources: SocialSource[];
    schedule: ScheduleConfig;
  }) => Promise<void>;
}

const STEPS = [
  {
    num: 1,
    title: 'Topic & Niche Selection',
    subtitle: 'Choose core categories or let Gemini extract structured keywords from natural text.',
  },
  {
    num: 2,
    title: 'Social Media Sources',
    subtitle: 'Connect YouTube RSS, Reddit JSON, and search-grounded public feeds across 9 platforms.',
  },
  {
    num: 3,
    title: 'Schedule & 3-Layer Delivery',
    subtitle: 'Set your cadence and activate Push, Email Digest, and On-Open Auto-Sync.',
  },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialTopics,
  initialSources,
  initialSchedule,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1);
  const [topics, setTopics] = useState<TopicItem[]>(initialTopics);
  const [sources, setSources] = useState<SocialSource[]>(initialSources);
  const [schedule, setSchedule] = useState<ScheduleConfig>(initialSchedule);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const currentMeta = STEPS[step - 1];
  const progressPct = Math.round((step / STEPS.length) * 100);

  const handleNext = () => {
    setValidationError(null);
    if (step === 1 && topics.length === 0) {
      setValidationError('Select at least one topic or extract a custom topic to continue.');
      return;
    }
    if (step === 2 && sources.length === 0) {
      setValidationError('Add at least one social media source (or use Auto-Suggest) to continue.');
      return;
    }
    if (step < 3) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const handleFinish = async () => {
    setValidationError(null);
    setIsLaunching(true);
    try {
      await onComplete({ topics, sources, schedule });
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Unable to complete setup.');
      setIsLaunching(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--pc-bg)] text-[var(--pc-text)] flex flex-col">
      {/* Top Minimal Header */}
      <header className="border-b border-[var(--pc-border)] bg-[var(--pc-bg)]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <PulseLogoMark className="w-6 h-6 text-[var(--pc-accent)]" />
            <span className="font-display text-lg font-bold tracking-tight">PulseCurate</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--pc-text-muted)] font-mono-tabular">
            <span>Step {step} of 3</span>
            <span aria-hidden="true">&middot;</span>
            <span>{progressPct}%</span>
          </div>
        </div>

        {/* Crisp Progress Bar */}
        <div className="h-0.5 w-full bg-[var(--pc-surface)]">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: 'var(--pc-accent)',
            }}
          />
        </div>
      </header>

      {/* Main Step Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-28">
        {/* Stepper Header */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {STEPS.map((s) => {
              const done = s.num < step;
              const active = s.num === step;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step) {
                      setValidationError(null);
                      setStep(s.num);
                    }
                  }}
                  disabled={s.num > step}
                  className={`flex items-center gap-2 transition-colors ${
                    active
                      ? 'text-[var(--pc-text)] font-semibold'
                      : done
                      ? 'text-[var(--pc-accent)] cursor-pointer hover:underline'
                      : 'text-[var(--pc-text-muted)]/60 cursor-default'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono-tabular border ${
                      active
                        ? 'border-[var(--pc-accent)] bg-[var(--pc-accent-soft)] text-[var(--pc-accent)]'
                        : done
                        ? 'border-[var(--pc-accent)] bg-[var(--pc-accent)] text-[var(--pc-accent-fg)]'
                        : 'border-[var(--pc-border)] text-[var(--pc-text-muted)]'
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </span>
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>

          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-balance">
              {currentMeta.title}
            </h1>
            <p className="text-sm text-[var(--pc-text-muted)] mt-1.5 max-w-2xl">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {step === 1 && <TopicSelector topics={topics} onChange={setTopics} />}
            {step === 2 && (
              <SourceSelector topics={topics} sources={sources} onChange={setSources} />
            )}
            {step === 3 && (
              <ScheduleConfigurator schedule={schedule} onChange={setSchedule} topics={topics} />
            )}
          </motion.div>
        </AnimatePresence>

        {validationError && (
          <div
            className="mt-5 rounded-xl border border-[var(--pc-danger)]/50 bg-[var(--pc-surface)] px-4 py-3 text-sm text-[var(--pc-danger)]"
            role="alert"
          >
            {validationError}
          </div>
        )}
      </main>

      {/* Bottom Sticky Action Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--pc-border)] bg-[var(--pc-bg)]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || isLaunching}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] text-sm font-medium text-[var(--pc-text)] hover:border-[var(--pc-text-muted)]/50 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer"
              style={{
                backgroundColor: 'var(--pc-accent)',
                color: 'var(--pc-accent-fg)',
              }}
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isLaunching}
              className="min-h-[44px] px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap disabled:opacity-60 cursor-pointer"
              style={{
                backgroundColor: 'var(--pc-accent)',
                color: 'var(--pc-accent-fg)',
              }}
            >
              {isLaunching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Building Feed...
                </>
              ) : (
                <>
                  Launch PulseCurate Feed
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
