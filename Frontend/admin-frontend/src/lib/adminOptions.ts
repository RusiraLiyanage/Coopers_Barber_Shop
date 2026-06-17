export type SelectOption = {
  label: string;
  value: string;
};

export type ServiceAiStarterConfig = {
  requiredSkills: string[];
  safetyTriggers: string[];
  complexity: 'low' | 'medium' | 'high';
  notes: string[];
};

export const BARBER_CAPABILITY_OPTIONS: SelectOption[] = [
  { label: 'Classic haircuts', value: 'classic haircuts' },
  { label: 'Skin fades', value: 'skin fades' },
  { label: 'Beard shaping', value: 'beard shaping' },
  { label: 'Hot towel shaves', value: 'hot towel shaves' },
  { label: 'Head shaves', value: 'head shaves' },
  { label: 'Hair styling', value: 'hair styling' },
  { label: 'Formal styling', value: 'formal styling' },
  { label: 'Colour consultation', value: 'colour consultation' },
  {
    label: 'Colour correction consultation',
    value: 'colour correction consultation',
  },
  { label: 'Hair colouring', value: 'hair colouring' },
  { label: 'Beard colouring', value: 'beard colouring' },
  { label: 'Colour correction', value: 'colour correction' },
  { label: 'Bleach work', value: 'bleach work' },
  {
    label: 'Deep conditioning treatments',
    value: 'deep conditioning treatments',
  },
  { label: 'Scalp treatments', value: 'scalp treatments' },
  { label: 'Scalp care', value: 'scalp care' },
  { label: 'Curly hair', value: 'curly hair' },
  {
    label: 'Sensitive scalp support',
    value: 'sensitive scalp support',
  },
  { label: 'Damaged hair support', value: 'damaged hair support' },
  {
    label: 'Chemical safety assessment',
    value: 'chemical safety assessment',
  },
  { label: 'Client consultation', value: 'client consultation' },
];

export const SERVICE_SAFETY_TRIGGER_OPTIONS: SelectOption[] = [
  { label: 'Allergy', value: 'allergy' },
  { label: 'Scalp sensitivity', value: 'scalp sensitivity' },
  { label: 'Chemical history', value: 'chemical history' },
  { label: 'Bleach history', value: 'bleach history' },
  { label: 'Box dye history', value: 'box dye history' },
  { label: 'Colour correction request', value: 'colour correction request' },
  { label: 'Damaged hair', value: 'damaged hair' },
  { label: 'Dry or brittle hair', value: 'dry or brittle hair' },
  { label: 'Patch test required', value: 'patch test required' },
  { label: 'Sensitive skin', value: 'sensitive skin' },
  { label: 'Scalp irritation', value: 'scalp irritation' },
  { label: 'Beard sensitivity', value: 'beard sensitivity' },
  { label: 'Razor irritation history', value: 'razor irritation history' },
  { label: 'Formal event request', value: 'formal event request' },
  { label: 'Curl definition request', value: 'curl definition request' },
  { label: 'High maintenance request', value: 'high maintenance request' },
];

const SERVICE_AI_STARTER_CONFIGS: Record<string, ServiceAiStarterConfig> = {
  haircut: {
    requiredSkills: ['classic haircuts'],
    safetyTriggers: [],
    complexity: 'low',
    notes: [
      'Use for standard cutting appointments with no special chemical or scalp concerns.',
      'Usually suitable for junior, senior, or owner-level barbers with haircut capability.',
    ],
  },
  'skin fade': {
    requiredSkills: ['skin fades', 'classic haircuts'],
    safetyTriggers: ['scalp sensitivity'],
    complexity: 'medium',
    notes: [
      'Useful when precision fading and tight clipper work matter.',
      'Keep scalp sensitivity in mind because close cutting can aggravate irritation.',
    ],
  },
  'beard trim & sculpting': {
    requiredSkills: ['beard shaping'],
    safetyTriggers: ['beard sensitivity'],
    complexity: 'low',
    notes: [
      'Use for beard shaping, line definition, and profile clean-up.',
      'Flag sensitivity when the client mentions irritation, ingrown hairs, or skin flare-ups.',
    ],
  },
  'hot towel shave': {
    requiredSkills: ['hot towel shaves', 'beard shaping'],
    safetyTriggers: ['beard sensitivity', 'razor irritation history', 'sensitive skin'],
    complexity: 'medium',
    notes: [
      'Requires confidence with razors, skin prep, and post-shave care.',
      'Use safety triggers when the client has a history of razor burn or skin reactions.',
    ],
  },
  'head shave': {
    requiredSkills: ['head shaves'],
    safetyTriggers: ['scalp sensitivity', 'scalp irritation'],
    complexity: 'medium',
    notes: [
      'Best when the barber is comfortable with full head finishing and scalp presentation.',
      'Use sensitivity triggers for clients with scalp issues or recent irritation.',
    ],
  },
  'hair styling': {
    requiredSkills: ['hair styling', 'formal styling'],
    safetyTriggers: ['formal event request'],
    complexity: 'medium',
    notes: [
      'Use when the client wants finish work, shape direction, or event-ready presentation.',
      'Formal event requests can justify more experienced staff for reliability.',
    ],
  },
  consultation: {
    requiredSkills: ['client consultation'],
    safetyTriggers: ['allergy', 'chemical history', 'damaged hair', 'scalp sensitivity'],
    complexity: 'medium',
    notes: [
      'This is the safest path when the client is unsure or has concerns that need review first.',
      'Use consultation to slow the flow down before colour, bleach, or treatment work.',
    ],
  },
  'hair coloring': {
    requiredSkills: ['hair colouring', 'colour consultation'],
    safetyTriggers: ['allergy', 'chemical history', 'patch test required', 'damaged hair'],
    complexity: 'high',
    notes: [
      'Use for normal colour application, tone change, or colour refresh work.',
      'High complexity is appropriate because chemical history and suitability matter.',
    ],
  },
  'beard colour': {
    requiredSkills: ['beard colouring', 'colour consultation'],
    safetyTriggers: ['allergy', 'beard sensitivity', 'patch test required'],
    complexity: 'medium',
    notes: [
      'Use when beard tone correction or blending is needed.',
      'Patch testing and sensitivity are important because facial skin is reactive.',
    ],
  },
  'colour correction consultation': {
    requiredSkills: [
      'colour correction consultation',
      'chemical safety assessment',
      'client consultation',
    ],
    safetyTriggers: [
      'box dye history',
      'bleach history',
      'damaged hair',
      'colour correction request',
    ],
    complexity: 'high',
    notes: [
      'Use before risky corrective work or when the client has layered colour history.',
      'This should usually push the AI toward senior or owner-level review.',
    ],
  },
  'deep conditioning treatment': {
    requiredSkills: ['deep conditioning treatments', 'damaged hair support'],
    safetyTriggers: ['allergy', 'scalp sensitivity', 'dry or brittle hair'],
    complexity: 'medium',
    notes: [
      'Useful for repair, softness, moisture recovery, and post-chemical care.',
      'Dry, brittle, or chemically stressed hair should be surfaced to the barber.',
    ],
  },
  'scalp treatment': {
    requiredSkills: ['scalp treatments', 'scalp care', 'sensitive scalp support'],
    safetyTriggers: ['scalp sensitivity', 'scalp irritation', 'allergy'],
    complexity: 'medium',
    notes: [
      'Use when the client has scalp dryness, flaking, irritation, or comfort issues.',
      'Sensitive scalp support should be present on the assigned barber profile.',
    ],
  },
};

export function getServiceAiStarterConfig(
  serviceName: string | undefined,
): ServiceAiStarterConfig | null {
  if (!serviceName) {
    return null;
  }

  return SERVICE_AI_STARTER_CONFIGS[serviceName.trim().toLowerCase()] ?? null;
}
