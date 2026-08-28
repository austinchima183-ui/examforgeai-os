'use client';

// ============================================================================
// ExamForge AI — Onboarding Wizard
// ============================================================================
// Role-specific multi-step onboarding wizard with Framer Motion transitions,
// react-hook-form validation, and premium UX. Full-screen modal overlay that
// appears over the dashboard for new users.
// ============================================================================

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  School,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  User,
  Users,
  Building,
  CreditCard,
  Globe,
  Clock,
  Target,
  Brain,
  Loader2,
  PartyPopper,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand-constants';
import type { UserRole } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const NIGERIAN_SUBJECTS = [
  'Mathematics',
  'English Language',
  'Physics',
  'Chemistry',
  'Biology',
  'Government',
  'Economics',
  'Literature in English',
  'Geography',
  'Accounting',
] as const;

const CLASS_LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'] as const;

const EXAM_TYPES = ['WAEC', 'NECO', 'JAMB', 'Custom'] as const;

const LEARNING_STYLES = ['Visual', 'Auditory', 'Reading', 'Kinesthetic'] as const;

const STUDY_TIMES = ['Morning', 'Afternoon', 'Evening'] as const;

const QUESTION_TYPES = [
  'Multiple Choice',
  'True/False',
  'Short Answer',
  'Essay',
  'Fill in Blank',
] as const;

const AI_ASSISTANCE_LEVELS = ['Minimal', 'Moderate', 'Full'] as const;

const SCHOOL_TYPES = ['Public', 'Private'] as const;
const SCHOOL_LEVELS = ['Primary', 'Secondary', 'Mixed'] as const;

const BILLING_PLANS = ['Starter', 'Professional', 'Enterprise'] as const;
const PAYMENT_METHODS = ['Card', 'Bank Transfer', 'USSD', 'Mobile Money'] as const;

const CURRENCIES = ['NGN', 'USD', 'GHS', 'KES'] as const;
const TIMEZONES = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'America/New_York',
  'Europe/London',
] as const;
const LANGUAGES = ['English', 'Yoruba', 'Hausa', 'Igbo'] as const;
const GRADING_SCALES = ['A-F (100)', 'A-F (5-point)', 'GPA (4.0)', 'Custom'] as const;

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type OnboardingRole = 'student' | 'teacher' | 'school_admin' | 'super_admin';

interface StepConfig {
  title: string;
  description: string;
  skippable?: boolean;
}

interface WizardProps {
  role: OnboardingRole;
  userId: string;
  userName?: string;
  onComplete: (data: Record<string, unknown>) => void;
  onSkip?: () => void;
}

// ──────────────────────────────────────────────────────────────
// Step definitions per role
// ──────────────────────────────────────────────────────────────

const ROLE_GREETINGS: Record<OnboardingRole, string> = {
  student: "Let's set up your learning journey",
  teacher: "Let's set up your teaching workspace",
  school_admin: "Let's configure your school",
  super_admin: "Let's set up your platform",
};

const ROLE_ICONS: Record<OnboardingRole, React.ReactNode> = {
  student: <GraduationCap className="h-8 w-8" />,
  teacher: <BookOpen className="h-8 w-8" />,
  school_admin: <School className="h-8 w-8" />,
  super_admin: <Shield className="h-8 w-8" />,
};

const STEP_CONFIGS: Record<OnboardingRole, StepConfig[]> = {
  student: [
    { title: 'Welcome', description: 'Get started with ExamForge AI' },
    { title: 'Profile Setup', description: 'Tell us about yourself' },
    { title: 'Learning Preferences', description: 'How do you learn best?', skippable: true },
    { title: 'Goal Setting', description: 'Set your academic targets' },
    { title: 'All Set!', description: 'Your profile is ready' },
  ],
  teacher: [
    { title: 'Welcome', description: 'Get started with ExamForge AI' },
    { title: 'Profile Setup', description: 'Tell us about yourself' },
    { title: 'Classes Setup', description: 'Assign your classes' },
    { title: 'Teaching Preferences', description: 'Customize your experience', skippable: true },
    { title: 'All Set!', description: 'Your workspace is ready' },
  ],
  school_admin: [
    { title: 'Welcome', description: 'Get started with ExamForge AI' },
    { title: 'School Profile', description: 'Set up your school details' },
    { title: 'Academic Setup', description: 'Configure your academic calendar' },
    { title: 'Initial Staff', description: 'Add your first teachers', skippable: true },
    { title: 'Billing Setup', description: 'Choose your plan' },
    { title: 'All Set!', description: 'Your school is configured' },
  ],
  super_admin: [
    { title: 'Welcome', description: 'Get started with ExamForge AI' },
    { title: 'Platform Config', description: 'Configure platform defaults' },
    { title: 'Regional Settings', description: 'Set regional preferences' },
    { title: 'All Set!', description: 'Platform is configured' },
  ],
};

// ──────────────────────────────────────────────────────────────
// Animation Variants
// ──────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

const slideTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};

// ──────────────────────────────────────────────────────────────
// Confetti Component
// ──────────────────────────────────────────────────────────────

function Confetti() {
  const particles = React.useMemo(() => {
    const colors = [
      'bg-emerald-400',
      'bg-amber-400',
      'bg-rose-400',
      'bg-sky-400',
      'bg-violet-400',
      'bg-orange-400',
      'bg-teal-400',
    ];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 1.5,
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={cn('absolute rounded-sm', p.color)}
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Multi-Select Chips Component
// ──────────────────────────────────────────────────────────────

interface MultiSelectChipsProps {
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
  label: string;
}

function MultiSelectChips({ options, selected, onToggle, label }: MultiSelectChipsProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm forge-glow'
                  : 'border-border/30 bg-white/[0.04] text-muted-foreground hover:border-primary/50 hover:bg-white/[0.06]'
              )}
            >
              {isSelected && <Check className="mr-1 h-3 w-3" />}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Step Indicator Component
// ──────────────────────────────────────────────────────────────

interface StepIndicatorProps {
  steps: StepConfig[];
  currentStep: number;
  totalSteps: number;
}

function StepIndicator({ steps, currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <div
                className={cn(
                  'h-0.5 w-4 sm:w-8 transition-all duration-300 rounded-full',
                  isCompleted ? 'bg-primary forge-glow' : 'bg-muted/50'
                )}
              />
            )}
            <div
              className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                  isCompleted
                    ? 'bg-primary text-primary-foreground shadow-sm forge-glow'
                    : isCurrent
                      ? 'border-2 border-primary bg-primary/10 text-primary forge-glow'
                      : 'border border-white/[0.06] bg-white/[0.04] text-muted-foreground'
                )}
            >
              {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Animated Logo
// ──────────────────────────────────────────────────────────────

function AnimatedLogo({ role }: { role: OnboardingRole }) {
  return (
    <motion.div
      className="flex items-center justify-center"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
    >
      <div className="relative">
        <motion.div
          className="absolute -inset-3 rounded-full bg-primary/10"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg forge-glow">
          {ROLE_ICONS[role]}
        </div>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// Welcome Step
// ──────────────────────────────────────────────────────────────

function WelcomeStep({ role, userName }: { role: OnboardingRole; userName?: string }) {
  return (
    <div className="flex flex-col items-center space-y-6 py-8">
      <AnimatedLogo role={role} />
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome to {BRAND.name}!
        </h2>
        <p className="mt-2 text-base text-muted-foreground">
          {userName ? `Hi, ${userName}! ` : ''}
          {ROLE_GREETINGS[role]}
        </p>
      </motion.div>
      <motion.div
        className="flex flex-wrap justify-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Badge variant="secondary" className="gap-1.5 px-3 py-1 forge-glass-surface border border-border/30">
          <Sparkles className="h-3 w-3" /> AI-Powered
        </Badge>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1 forge-glass-surface border border-border/30">
          <Target className="h-3 w-3" /> Exam Ready
        </Badge>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1 forge-glass-surface border border-border/30">
          <Brain className="h-3 w-3" /> Smart Learning
        </Badge>
      </motion.div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Student Steps
// ──────────────────────────────────────────────────────────────

const studentProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Enter a valid phone number').optional().or(z.literal('')),
  classLevel: z.string().min(1, 'Select a class'),
  subjects: z.array(z.string()).min(1, 'Select at least one subject'),
});

type StudentProfileForm = z.infer<typeof studentProfileSchema>;

function StudentProfileStep() {
  const form = useForm<StudentProfileForm>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: { fullName: '', phone: '', classLevel: '', subjects: [] },
  });

  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>([]);

  const toggleSubject = (subject: string) => {
    const next = selectedSubjects.includes(subject)
      ? selectedSubjects.filter((s) => s !== subject)
      : [...selectedSubjects, subject];
    setSelectedSubjects(next);
    form.setValue('subjects', next, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" placeholder="Enter your full name" className="forge-input-glow bg-white/[0.04]" {...form.register('fullName')} />
        {form.formState.errors.fullName && (
          <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          placeholder="+234..."
          type="tel"
          className="forge-input-glow bg-white/[0.04]"
          {...form.register('phone')}
        />
        {form.formState.errors.phone && (
          <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Class</Label>
        <Select onValueChange={(v) => form.setValue('classLevel', v)} value={form.watch('classLevel')}>
          <SelectTrigger>
            <SelectValue placeholder="Select your class" />
          </SelectTrigger>
          <SelectContent>
            {CLASS_LEVELS.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.classLevel && (
          <p className="text-xs text-destructive">{form.formState.errors.classLevel.message}</p>
        )}
      </div>

      <MultiSelectChips
        options={NIGERIAN_SUBJECTS}
        selected={selectedSubjects}
        onToggle={toggleSubject}
        label="Subjects of Interest"
      />
      {form.formState.errors.subjects && (
        <p className="text-xs text-destructive">{form.formState.errors.subjects.message}</p>
      )}
    </div>
  );
}

const studentPrefsSchema = z.object({
  studyHours: z.number().min(1).max(12),
  studyTime: z.string(),
  learningStyle: z.string(),
});

type StudentPrefsForm = z.infer<typeof studentPrefsSchema>;

function StudentLearningPrefsStep() {
  const form = useForm<StudentPrefsForm>({
    resolver: zodResolver(studentPrefsSchema),
    defaultValues: { studyHours: 4, studyTime: '', learningStyle: '' },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>
          Study Hours per Day:{' '}
          <span className="font-semibold text-primary">{form.watch('studyHours')}h</span>
        </Label>
        <Slider
          min={1}
          max={12}
          step={1}
          value={[form.watch('studyHours')]}
          onValueChange={([v]) => form.setValue('studyHours', v)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1h</span>
          <span>12h</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred Study Time</Label>
        <Select onValueChange={(v) => form.setValue('studyTime', v)} value={form.watch('studyTime')}>
          <SelectTrigger>
            <SelectValue placeholder="When do you study best?" />
          </SelectTrigger>
          <SelectContent>
            {STUDY_TIMES.map((t) => (
              <SelectItem key={t} value={t}>
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> {t}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Learning Style</Label>
        <div className="grid grid-cols-2 gap-2">
          {LEARNING_STYLES.map((style) => {
            const isSelected = form.watch('learningStyle') === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => form.setValue('learningStyle', style)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary forge-glow'
                    : 'border-border/30 bg-white/[0.04] text-muted-foreground hover:border-primary/30 hover:bg-white/[0.06]'
                )}
              >
                {style === 'Visual' && <EyeIcon />}
                {style === 'Auditory' && <EarIcon />}
                {style === 'Reading' && <BookIcon />}
                {style === 'Kinesthetic' && <HandIcon />}
                {style}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18V8a6 6 0 0 1 12 0v10" /><path d="M6 14a2 2 0 0 0 4 0" />
    </svg>
  );
}
function BookIcon() {
  return <BookOpen className="h-4 w-4" />;
}
function HandIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" /><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34L2 16" />
    </svg>
  );
}

const studentGoalSchema = z.object({
  targetExam: z.string().min(1, 'Select a target exam'),
  targetScore: z.string().optional(),
  areasToImprove: z.string().optional(),
});

type StudentGoalForm = z.infer<typeof studentGoalSchema>;

function StudentGoalSettingStep() {
  const form = useForm<StudentGoalForm>({
    resolver: zodResolver(studentGoalSchema),
    defaultValues: { targetExam: '', targetScore: '', areasToImprove: '' },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Target Exam</Label>
        <Select onValueChange={(v) => form.setValue('targetExam', v)} value={form.watch('targetExam')}>
          <SelectTrigger>
            <SelectValue placeholder="Which exam are you preparing for?" />
          </SelectTrigger>
          <SelectContent>
            {EXAM_TYPES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.targetExam && (
          <p className="text-xs text-destructive">{form.formState.errors.targetExam.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetScore">Target Score</Label>
        <Input
          id="targetScore"
          placeholder="e.g. 280/400"
          className="forge-input-glow bg-white/[0.04]"
          {...form.register('targetScore')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="areasToImprove">Areas to Improve</Label>
        <Textarea
          id="areasToImprove"
          placeholder="Describe topics or subjects you'd like to focus on..."
          rows={3}
          {...form.register('areasToImprove')}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Teacher Steps
// ──────────────────────────────────────────────────────────────

function TeacherProfileStep() {
  const [selectedSubjects, setSelectedSubjects] = React.useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" placeholder="Enter your full name" className="forge-input-glow bg-white/[0.04]" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" placeholder="+234..." type="tel" className="forge-input-glow bg-white/[0.04]" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Input id="department" placeholder="e.g. Science, Arts, Commercial" className="forge-input-glow bg-white/[0.04]" />
      </div>
      <MultiSelectChips
        options={NIGERIAN_SUBJECTS}
        selected={selectedSubjects}
        onToggle={(s) =>
          setSelectedSubjects((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
          )
        }
        label="Subjects Taught"
      />
    </div>
  );
}

function TeacherClassesStep() {
  const [selectedClasses, setSelectedClasses] = React.useState<string[]>([]);
  const [classSize, setClassSize] = React.useState('');

  return (
    <div className="space-y-6">
      <MultiSelectChips
        options={CLASS_LEVELS}
        selected={selectedClasses}
        onToggle={(c) =>
          setSelectedClasses((prev) =>
            prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
          )
        }
        label="Assign to Classes"
      />
      <div className="space-y-2">
        <Label htmlFor="classSize">Average Class Size</Label>
        <Input
          id="classSize"
          placeholder="e.g. 30"
          type="number"
          value={classSize}
          onChange={(e) => setClassSize(e.target.value)}
          className="forge-input-glow bg-white/[0.04]"
        />
      </div>
    </div>
  );
}

function TeacherPreferencesStep() {
  const [duration, setDuration] = React.useState('');
  const [selectedQTypes, setSelectedQTypes] = React.useState<string[]>([]);
  const [aiLevel, setAiLevel] = React.useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Default Exam Duration (minutes)</Label>
        <Select onValueChange={setDuration} value={duration}>
          <SelectTrigger>
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            {[30, 45, 60, 90, 120].map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MultiSelectChips
        options={QUESTION_TYPES}
        selected={selectedQTypes}
        onToggle={(q) =>
          setSelectedQTypes((prev) =>
            prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
          )
        }
        label="Preferred Question Types"
      />

      <div className="space-y-3">
        <Label>AI Assistance Level</Label>
        <div className="grid grid-cols-3 gap-2">
          {AI_ASSISTANCE_LEVELS.map((level) => {
            const isSelected = aiLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => setAiLevel(level)}
                className={cn(
                  'rounded-lg border p-3 text-center text-sm font-medium transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 text-primary forge-glow'
                    : 'border-border/30 bg-white/[0.04] text-muted-foreground hover:border-primary/30 hover:bg-white/[0.06]'
                )}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// School Admin Steps
// ──────────────────────────────────────────────────────────────

function SchoolAdminProfileStep() {
  const [schoolType, setSchoolType] = React.useState('');
  const [selectedLevels, setSelectedLevels] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="schoolName">School Name</Label>
        <Input id="schoolName" placeholder="Enter your school name" className="forge-input-glow bg-white/[0.04]" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="schoolAddress">Address</Label>
        <Input id="schoolAddress" placeholder="School address" className="forge-input-glow bg-white/[0.04]" />
      </div>
      <div className="space-y-2">
        <Label>School Type</Label>
        <Select onValueChange={setSchoolType} value={schoolType}>
          <SelectTrigger>
            <SelectValue placeholder="Public or Private?" />
          </SelectTrigger>
          <SelectContent>
            {SCHOOL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <MultiSelectChips
        options={SCHOOL_LEVELS}
        selected={selectedLevels}
        onToggle={(l) =>
          setSelectedLevels((prev) =>
            prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
          )
        }
        label="School Levels"
      />
      <div className="space-y-2">
        <Label>School Logo</Label>
        <div
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-muted p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
          onClick={() => fileInputRef.current?.click()}
        >
          <Building className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Click to upload logo</p>
            <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
        </div>
      </div>
    </div>
  );
}

function SchoolAdminAcademicStep() {
  const [terms, setTerms] = React.useState('');
  const [currentTerm, setCurrentTerm] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Terms per Year</Label>
        <Select onValueChange={setTerms} value={terms}>
          <SelectTrigger>
            <SelectValue placeholder="How many terms?" />
          </SelectTrigger>
          <SelectContent>
            {['2', '3', '4'].map((t) => (
              <SelectItem key={t} value={t}>
                {t} Terms
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Current Term</Label>
        <Select onValueChange={setCurrentTerm} value={currentTerm}>
          <SelectTrigger>
            <SelectValue placeholder="Which term is active?" />
          </SelectTrigger>
          <SelectContent>
            {['First Term', 'Second Term', 'Third Term'].map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Calendar Start</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">Calendar End</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

interface TeacherEntry {
  name: string;
  email: string;
  subject: string;
}

function SchoolAdminStaffStep() {
  const [teachers, setTeachers] = React.useState<TeacherEntry[]>([]);
  const [newName, setNewName] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newSubject, setNewSubject] = React.useState('');

  const addTeacher = () => {
    if (newName && newEmail) {
      setTeachers([...teachers, { name: newName, email: newEmail, subject: newSubject }]);
      setNewName('');
      setNewEmail('');
      setNewSubject('');
    }
  };

  const removeTeacher = (index: number) => {
    setTeachers(teachers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {teachers.length > 0 && (
        <div className="space-y-2">
          <Label>Added Teachers</Label>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {teachers.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.email} {t.subject && `· ${t.subject}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeTeacher(i)}>
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <Label className="text-sm font-medium">Add a Teacher</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Teacher name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="forge-input-glow bg-white/[0.04]"
          />
          <Input
            placeholder="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="forge-input-glow bg-white/[0.04]"
          />
        </div>
        <div className="flex gap-3">
          <Select onValueChange={setNewSubject} value={newSubject}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={addTeacher}
            disabled={!newName || !newEmail}
            className="shrink-0"
          >
            <Users className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}

function SchoolAdminBillingStep() {
  const [plan, setPlan] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Select Plan</Label>
        <div className="grid gap-3">
          {BILLING_PLANS.map((p) => {
            const isSelected = plan === p;
            const price =
              p === 'Starter' ? '₦49/mo' : p === 'Professional' ? '₦149/mo' : 'Custom';
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-4 text-left transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm forge-glow'
                    : 'border-border/30 bg-white/[0.04] hover:border-primary/30 hover:bg-white/[0.06]'
                )}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{p}</p>
                    <p className="text-xs text-muted-foreground">{price}</p>
                  </div>
                </div>
                {isSelected && <Check className="h-5 w-5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Payment Method</Label>
        <Select onValueChange={setPaymentMethod} value={paymentMethod}>
          <SelectTrigger>
            <SelectValue placeholder="How would you like to pay?" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Super Admin Steps
// ──────────────────────────────────────────────────────────────

function SuperAdminConfigStep() {
  const [aiEnabled, setAiEnabled] = React.useState(true);
  const [cbtEnabled, setCbtEnabled] = React.useState(true);
  const [marketplaceEnabled, setMarketplaceEnabled] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="defaultSchool">Default School Settings</Label>
        <Input id="defaultSchool" placeholder="Default school name" className="forge-input-glow bg-white/[0.04]" />
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-sm font-medium">Feature Flags</Label>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/30 p-4 hover:border-border/50 transition-all duration-200">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium">AI Features</p>
                <p className="text-xs text-muted-foreground">Enable AI question generation & tutoring</p>
              </div>
            </div>
            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} className="data-[state=checked]:forge-glow" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/30 p-4 hover:border-border/50 transition-all duration-200">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium">CBT Module</p>
                <p className="text-xs text-muted-foreground">Computer-based testing system</p>
              </div>
            </div>
            <Switch checked={cbtEnabled} onCheckedChange={setCbtEnabled} className="data-[state=checked]:forge-glow" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/30 p-4 hover:border-border/50 transition-all duration-200">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-sky-500" />
              <div>
                <p className="text-sm font-medium">Marketplace</p>
                <p className="text-xs text-muted-foreground">Question bank marketplace</p>
              </div>
            </div>
            <Switch checked={marketplaceEnabled} onCheckedChange={setMarketplaceEnabled} className="data-[state=checked]:forge-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SuperAdminRegionalStep() {
  const [currency, setCurrency] = React.useState('');
  const [timezone, setTimezone] = React.useState('');
  const [language, setLanguage] = React.useState('');
  const [gradingScale, setGradingScale] = React.useState('');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Currency</Label>
        <Select onValueChange={setCurrency} value={currency}>
          <SelectTrigger>
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Timezone</Label>
        <Select onValueChange={setTimezone} value={timezone}>
          <SelectTrigger>
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Language</Label>
        <Select onValueChange={setLanguage} value={language}>
          <SelectTrigger>
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Grading Scale</Label>
        <Select onValueChange={setGradingScale} value={gradingScale}>
          <SelectTrigger>
            <SelectValue placeholder="Select grading scale" />
          </SelectTrigger>
          <SelectContent>
            {GRADING_SCALES.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Completion Step
// ──────────────────────────────────────────────────────────────

interface CompletionStepProps {
  role: OnboardingRole;
  onGoToDashboard: () => void;
  onSecondaryAction?: () => void;
}

function CompletionStep({ role, onGoToDashboard, onSecondaryAction }: CompletionStepProps) {
  const secondaryLabel =
    role === 'student'
      ? 'Try AI Tutor'
      : role === 'teacher'
        ? 'Generate Your First Questions'
        : undefined;

  return (
    <div className="flex flex-col items-center space-y-6 py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 dark:bg-emerald-900/30 dark:text-green-400">
          <PartyPopper className="h-8 w-8" />
        </div>
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-xl font-bold">You&apos;re all set! 🎉</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your {role === 'student' ? 'learning' : role === 'teacher' ? 'teaching' : role === 'school_admin' ? 'school' : 'platform'} profile is ready to go.
        </p>
      </motion.div>

      <motion.div
        className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button onClick={onGoToDashboard} size="lg" className="gap-2 forge-glow">
          Go to Dashboard <ArrowRight className="h-4 w-4" />
        </Button>
        {secondaryLabel && onSecondaryAction && (
          <Button onClick={onSecondaryAction} variant="outline" size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" /> {secondaryLabel}
          </Button>
        )}
      </motion.div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Wizard Component
// ──────────────────────────────────────────────────────────────

export function OnboardingWizard({ role, userId, userName, onComplete, onSkip }: WizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [isCompleting, setIsCompleting] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [stepError, setStepError] = React.useState<string | null>(null);

  const steps = STEP_CONFIGS[role];
  const totalSteps = steps.length;
  const isWelcome = currentStep === 0;
  const isComplete = currentStep === totalSteps - 1;
  const currentConfig = steps[currentStep];

  const goNext = React.useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
      setStepError(null);
      if (currentStep + 1 === totalSteps - 1) {
        setShowConfetti(true);
      }
    }
  }, [currentStep, totalSteps]);

  const goBack = React.useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
      setStepError(null);
      setShowConfetti(false);
    }
  }, [currentStep]);

  const handleComplete = React.useCallback(() => {
    setIsCompleting(true);
    setStepError(null);
    try {
      onComplete({ role, userId, completedAt: new Date().toISOString() });
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Failed to complete onboarding. Please try again.');
      setIsCompleting(false);
    }
  }, [onComplete, role, userId]);

  const handleSkip = React.useCallback(() => {
    if (onSkip) onSkip();
    else onComplete({ role, userId, skipped: true, completedAt: new Date().toISOString() });
  }, [onComplete, onSkip, role, userId]);

  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  // Render step content based on role and current step
  const renderStepContent = () => {
    if (isWelcome) {
      return <WelcomeStep role={role} userName={userName} />;
    }

    if (isComplete) {
      return (
        <CompletionStep
          role={role}
          onGoToDashboard={handleComplete}
          onSecondaryAction={handleComplete}
        />
      );
    }

    // Step index offset by 1 (since 0 is Welcome)
    const formStep = currentStep - 1;

    switch (role) {
      case 'student':
        if (formStep === 0) return <StudentProfileStep />;
        if (formStep === 1) return <StudentLearningPrefsStep />;
        if (formStep === 2) return <StudentGoalSettingStep />;
        break;

      case 'teacher':
        if (formStep === 0) return <TeacherProfileStep />;
        if (formStep === 1) return <TeacherClassesStep />;
        if (formStep === 2) return <TeacherPreferencesStep />;
        break;

      case 'school_admin':
        if (formStep === 0) return <SchoolAdminProfileStep />;
        if (formStep === 1) return <SchoolAdminAcademicStep />;
        if (formStep === 2) return <SchoolAdminStaffStep />;
        if (formStep === 3) return <SchoolAdminBillingStep />;
        break;

      case 'super_admin':
        if (formStep === 0) return <SuperAdminConfigStep />;
        if (formStep === 1) return <SuperAdminRegionalStep />;
        break;
    }

    return null;
  };

  return (
    <>
      {/* Confetti CSS animation keyframes */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Modal Overlay */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={`${BRAND.name} onboarding wizard`}
      >
        {/* Wizard Container */}
        <motion.div
          className="relative flex h-full w-full flex-col forge-glass-floating backdrop-blur-md shadow-2xl sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-[640px] sm:rounded-2xl sm:border sm:border-border/30"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Confetti Layer */}
          {showConfetti && <Confetti />}

          {/* Header: Progress & Step Indicator */}
          <div className="shrink-0 border-b border-border/20 px-6 py-4 forge-glass-surface bg-white/[0.02]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">{BRAND.name}</span>
              </div>
              {!isWelcome && !isComplete && (
                <span className="text-xs text-muted-foreground">
                  Step {currentStep} of {totalSteps - 1}
                </span>
              )}
            </div>
            <Progress value={progressPercent} className="h-1 forge-glow" />
            <div className="mt-3">
              <StepIndicator steps={steps} currentStep={currentStep} totalSteps={totalSteps} />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
              >
                {/* Step Title & Description */}
                {!isWelcome && !isComplete && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold">{currentConfig.title}</h3>
                    <p className="text-sm text-muted-foreground">{currentConfig.description}</p>
                  </div>
                )}

                {renderStepContent()}
              </motion.div>
            </AnimatePresence>

            {/* Step-level error display */}
            {stepError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-4 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{stepError}</span>
              </div>
            )}
          </div>

          {/* Footer: Navigation Buttons */}
          {!isComplete && (
            <div className="shrink-0 border-t border-border/20 px-6 py-4 forge-glass-surface bg-white/[0.02]">
              <div className="flex items-center justify-between">
                {/* Back Button */}
                {!isWelcome ? (
                  <Button variant="ghost" onClick={goBack} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                ) : (
                  <div />
                )}

                {/* Right Side: Skip / Next */}
                <div className="flex items-center gap-3">
                  {/* Skip Button */}
                  {!isWelcome && currentConfig.skippable && (
                    <Button variant="ghost" onClick={goNext} className="text-muted-foreground">
                      Skip for now
                    </Button>
                  )}

                  {/* Next / Get Started */}
                  {isWelcome ? (
                    <Button onClick={goNext} size="lg" className="gap-2">
                      Get Started <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={goNext} className="gap-2" disabled={isCompleting}>
                      {isCompleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Next <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Global Skip on Welcome */}
              {isWelcome && onSkip && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Skip onboarding for now
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}

export default OnboardingWizard;
