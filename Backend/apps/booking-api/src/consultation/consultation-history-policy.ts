import { HairHistory, Service } from '@coopers/entities';

export type HairHistoryRelevance = 'high' | 'medium' | 'low';

export type HairHistoryFollowUpRequirement = {
  required: boolean;
  history: {
    service: string;
    visitDate: string;
    monthsAgo: number;
    relevance: HairHistoryRelevance;
    conditionLabel: string;
    reason: string;
  } | null;
};

const HIGH_RELEVANCE_DAYS = 90;
const MEDIUM_RELEVANCE_DAYS = 365;
const DAYS_PER_MONTH = 30.4375;
const SAFETY_CRITICAL_TERMS = [
  'allergy',
  'allergic',
  'reaction',
  'rash',
  'scalp',
  'sensitive',
  'sensitivity',
  'irritation',
  'itchy',
  'itchiness',
  'burn',
  'chemical burn',
  'bleach',
  'breakage',
  'damage',
  'damaged',
  'box dye',
  'relaxer',
  'chemical',
  'patch test',
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getHistoryText(history: HairHistory): string {
  return normalizeText(
    [
      history.service,
      ...(history.hairState ?? []),
      history.productsUsed ?? '',
      history.barberNotes ?? '',
    ].join(' '),
  );
}

function getVisitAgeDays(visitDate: string, now: Date): number {
  const parsedVisitDate = new Date(`${visitDate}T00:00:00.000Z`);

  if (Number.isNaN(parsedVisitDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(
    0,
    Math.floor((now.getTime() - parsedVisitDate.getTime()) / 86_400_000),
  );
}

function getRelevance(ageDays: number): HairHistoryRelevance {
  if (ageDays <= HIGH_RELEVANCE_DAYS) {
    return 'high';
  }

  if (ageDays <= MEDIUM_RELEVANCE_DAYS) {
    return 'medium';
  }

  return 'low';
}

function hasSafetyCriticalHistory(historyText: string): boolean {
  return SAFETY_CRITICAL_TERMS.some((term) =>
    historyText.includes(normalizeText(term)),
  );
}

function isRelevantToService(historyText: string, service: Service): boolean {
  const serviceName = normalizeText(service.name);
  const serviceTerms = [
    serviceName,
    ...(service.requiredSkills ?? []).map(normalizeText),
    ...(service.safetyTriggers ?? []).map(normalizeText),
  ].filter((term) => term.length >= 4);

  return serviceTerms.some(
    (term) => historyText.includes(term) || term.includes(historyText),
  );
}

function getConditionLabel(history: HairHistory): string {
  const hairState = (history.hairState ?? []).find(
    (state) => state.trim().length > 0,
  );

  if (hairState) {
    return hairState.trim();
  }

  const notes = history.barberNotes?.trim();

  if (notes) {
    return notes.length > 80 ? `${notes.slice(0, 80).trim()}...` : notes;
  }

  return history.service;
}

export function getHairHistoryFollowUpRequirement(
  service: Service,
  previousHairHistory: HairHistory[],
  now = new Date(),
): HairHistoryFollowUpRequirement {
  const candidate = previousHairHistory
    .map((history) => {
      const ageDays = getVisitAgeDays(history.visitDate, now);
      const relevance = getRelevance(ageDays);
      const historyText = getHistoryText(history);
      const safetyCritical = hasSafetyCriticalHistory(historyText);
      const serviceRelevant = isRelevantToService(historyText, service);
      const shouldAsk =
        relevance === 'high' ||
        (relevance === 'medium' && (safetyCritical || serviceRelevant)) ||
        (relevance === 'low' && safetyCritical);

      return {
        history,
        relevance,
        safetyCritical,
        serviceRelevant,
        shouldAsk,
        monthsAgo: Math.floor(ageDays / DAYS_PER_MONTH),
      };
    })
    .find((item) => item.shouldAsk);

  if (!candidate) {
    return {
      required: false,
      history: null,
    };
  }

  const reason =
    candidate.relevance === 'low'
      ? 'Older safety-related history should be confirmed before this appointment.'
      : 'Recent or service-related hair history should be confirmed before this appointment.';

  return {
    required: true,
    history: {
      service: candidate.history.service,
      visitDate: candidate.history.visitDate,
      monthsAgo: candidate.monthsAgo,
      relevance: candidate.relevance,
      conditionLabel: getConditionLabel(candidate.history),
      reason,
    },
  };
}

export function getHairHistoryRelevanceSummary(
  history: HairHistory,
  now = new Date(),
): {
  monthsAgo: number;
  relevance: HairHistoryRelevance;
  safetyCritical: boolean;
} {
  const ageDays = getVisitAgeDays(history.visitDate, now);
  const historyText = getHistoryText(history);

  return {
    monthsAgo: Math.floor(ageDays / DAYS_PER_MONTH),
    relevance: getRelevance(ageDays),
    safetyCritical: hasSafetyCriticalHistory(historyText),
  };
}
