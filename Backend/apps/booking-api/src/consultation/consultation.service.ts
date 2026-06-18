import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  HairHistory,
  SafetyRule,
  SafetyRuleSeverity,
  Service,
  ServiceComplexity,
  Staff,
  StaffGender,
  StaffRole,
} from '@coopers/entities';
import { Repository } from 'typeorm';
import { ConsultationAnswerDto } from './dto/consultation-answer.dto';
import {
  ConsultationBarberMatch,
  ConsultationHairHistorySummary,
  ConsultationQuestion,
  ConsultationSafetyNote,
  ConsultationServiceSummary,
  ConsultationStartResponse,
  ConsultationSubmitResponse,
} from './consultation.types';

type BarberMatchCandidate = {
  staff: Staff;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
};

const MAX_HISTORY_ITEMS = 5;

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' '); // multiple tabs and spaces in the text will come to the normal space.
}

function normalizeTags(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean)), // all the available safety tags will be returned. (Set will remove all the duplicated values and Array.from will convert it back to Array)
  );
}

// get the answer based on the question
function getAnswerText(answers: ConsultationAnswerDto[]): string {
  return normalizeText(answers.map((answer) => answer.answer).join(' '));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function roleCanHandleHighComplexity(role: StaffRole): boolean {
  return role === StaffRole.SENIOR || role === StaffRole.OWNER;
}

function toServiceSummary(service: Service): ConsultationServiceSummary {
  return {
    id: service.id,
    name: service.name,
    complexity: service.complexity, // complexity of the Service
    requiredSkills: service.requiredSkills ?? [], // required skills by the Service
    safetyTriggers: service.safetyTriggers ?? [], // any safety triggers related to the Service
  };
}

// hair summary will be taken from the Hair History of the Client
function toHairHistorySummary(
  history: HairHistory,
): ConsultationHairHistorySummary {
  return {
    service: history.service,
    hairState: history.hairState ?? [],
    productsUsed: history.productsUsed,
    barberNotes: history.barberNotes,
    visitDate: history.visitDate,
  };
}

@Injectable()
export class ConsultationService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(SafetyRule)
    private readonly safetyRuleRepository: Repository<SafetyRule>,
    @InjectRepository(HairHistory)
    private readonly hairHistoryRepository: Repository<HairHistory>,
  ) {}

  async startConsultation(
    userId: string,
    serviceId: string,
  ): Promise<ConsultationStartResponse> {
    const service = await this.getActiveService(serviceId);
    const previousHairHistory = await this.getClientHairHistory(userId);

    return {
      service: toServiceSummary(service), // returning the service information
      questions: this.buildQuestions(service), // returning the built questions based on the service, it's complexity, and the safty triggers.
      previousHairHistory: previousHairHistory.map(toHairHistorySummary), // take the hair history of the client (previous appointments)
    };
  }

  async submitConsultation(
    userId: string,
    serviceId: string,
    answers: ConsultationAnswerDto[],
  ): Promise<ConsultationSubmitResponse> {
    const service = await this.getActiveService(serviceId); // to get the active service
    const previousHairHistory = await this.getClientHairHistory(userId); // to get the client's hair history
    const safetyNotes = await this.checkSafetyFlags(
      service, // based on the history
      answers, // based on the provided answers
      previousHairHistory, // based on the previous hair history by the barber for the client
    );
    const match = await this.matchBarber(service, safetyNotes);
    const hairState = this.resolveHairState(
      service,
      answers,
      previousHairHistory,
    );
    const desiredLook = this.resolveDesiredLook(answers);

    return {
      service: toServiceSummary(service),
      matchedBarber: this.toBarberMatch(match),
      matchScore: match.score,
      matchReasons: match.reasons,
      safetyNotes,
      hairState,
      desiredLook,
      consultationSummary: this.buildConsultationSummary(
        service,
        answers,
        safetyNotes,
        match.staff,
      ),
      previousHairHistoryCount: previousHairHistory.length,
      generation: {
        source: 'fallback',
        model: null,
      },
    };
  }

  // Provides the Service by it's id
  private async getActiveService(serviceId: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({
      where: {
        id: serviceId,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return service;
  }

  // get hair history by the client id
  private getClientHairHistory(userId: string): Promise<HairHistory[]> {
    return this.hairHistoryRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.barber', 'barber')
      .innerJoin('history.client', 'client')
      .where('client.id = :userId', { userId })
      .orderBy('history.visitDate', 'DESC')
      .addOrderBy('history.createdAt', 'DESC')
      .take(MAX_HISTORY_ITEMS) // maximum of 5 will be taken related to the client
      .getMany();
  }

  // build static questions accordingly
  private buildQuestions(service: Service): ConsultationQuestion[] {
    const questions: ConsultationQuestion[] = [
      {
        id: 'desired-look',
        label: `What result are you hoping to get from ${service.name}?`,
        helperText:
          'Mention the style, finish, colour, or concern you want handled.',
        required: true,
      },
      {
        id: 'current-hair-state',
        label: 'How would you describe your current hair or scalp condition?',
        helperText:
          'For example: dry ends, sensitive scalp, recently coloured, thick hair.',
        required: true,
      },
    ];

    // if there is any safety triggers related to the service then ask this question.
    if ((service.safetyTriggers ?? []).length > 0) {
      questions.push({
        id: 'safety-check',
        label: 'Do any safety concerns apply to you?',
        helperText: `Relevant checks: ${service.safetyTriggers.join(', ')}.`, // join by comma
        required: true,
      });
    }

    // if there is a high complexity by the service then ask these questions.
    if (service.complexity === ServiceComplexity.HIGH) {
      questions.push({
        id: 'recent-chemical-history',
        label:
          'Have you had recent colour, bleach, relaxer, or chemical treatments?',
        helperText:
          'This helps select a barber with the right technical experience.',
        required: true,
      });
    }

    return questions;
  }

  private async checkSafetyFlags(
    service: Service,
    answers: ConsultationAnswerDto[],
    previousHairHistory: HairHistory[],
  ): Promise<ConsultationSafetyNote[]> {
    const contextText = this.buildSafetyContextText(
      answers,
      previousHairHistory,
    );
    const serviceSafetyTriggers = normalizeTags(service.safetyTriggers);
    const safetyRules = await this.safetyRuleRepository.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });

    const ruleNotes = safetyRules
      .filter((rule) => rule.serviceIds.includes(service.id))
      .filter((rule) =>
        this.contextMatchesCondition(contextText, rule.condition),
      )
      .map(
        (rule): ConsultationSafetyNote => ({
          severity: rule.severity,
          message: rule.message,
          source: 'safety-rule',
        }),
      );

    const triggerNotes = serviceSafetyTriggers
      .filter((trigger) => contextText.includes(trigger))
      .map(
        (trigger): ConsultationSafetyNote => ({
          severity: SafetyRuleSeverity.LOW,
          message: `Customer mentioned ${trigger}. Confirm before starting the service.`,
          source: 'service-trigger',
        }),
      );

    return this.dedupeSafetyNotes([...ruleNotes, ...triggerNotes]);
  }

  private buildSafetyContextText(
    answers: ConsultationAnswerDto[],
    previousHairHistory: HairHistory[], // previous history comes in an object array
  ): string {
    const historyText = previousHairHistory
      .flatMap((history) => [
        history.service, // the Service
        ...(history.hairState ?? []), // the hair State
        history.productsUsed ?? '', // the products used by the client
        history.barberNotes ?? '', // any notes from the barber
      ]) // flatMap will make each value in the object as an element into the new array
      .join(' '); // turns all the values into one string with the spaces among each values

    return normalizeText(`${getAnswerText(answers)} ${historyText}`); // get the answer text along with the history
  }

  private contextMatchesCondition(
    contextText: string,
    condition: string,
  ): boolean {
    const normalizedCondition = normalizeText(condition);

    if (contextText.includes(normalizedCondition)) {
      return true;
    }

    const meaningfulTerms = normalizedCondition
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length >= 4);

    return meaningfulTerms.some((term) => contextText.includes(term));
  }

  private dedupeSafetyNotes(
    safetyNotes: ConsultationSafetyNote[],
  ): ConsultationSafetyNote[] {
    const seen = new Set<string>();

    return safetyNotes.filter((note) => {
      const key = `${note.severity}:${note.message}:${note.source}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private async matchBarber(
    service: Service,
    safetyNotes: ConsultationSafetyNote[],
  ): Promise<BarberMatchCandidate> {
    const candidates = await this.staffRepository.find({
      where: {
        active: true,
        available: true,
      },
      order: {
        displayName: 'ASC',
      },
    });

    if (candidates.length === 0) {
      throw new BadRequestException('No available barbers found.');
    }

    const matches = candidates.map((staff) =>
      this.scoreBarber(staff, service, safetyNotes),
    );

    matches.sort((left, right) => right.score - left.score);

    return matches[0];
  }

  private scoreBarber(
    staff: Staff,
    service: Service,
    safetyNotes: ConsultationSafetyNote[],
  ): BarberMatchCandidate {
    const requiredSkills = normalizeTags(service.requiredSkills);
    const staffSkills = normalizeTags(staff.skills);
    const matchedSkills = requiredSkills.filter((skill) =>
      staffSkills.includes(skill),
    );
    const missingSkills = requiredSkills.filter(
      (skill) => !staffSkills.includes(skill),
    );
    const skillScore =
      requiredSkills.length === 0
        ? 35
        : (matchedSkills.length / requiredSkills.length) * 65;
    const complexityScore = this.getComplexityScore(
      service.complexity,
      staff.role,
    );
    const ratingScore = Math.min(Math.max(staff.rating ?? 0, 0), 5) * 3;
    const safetyScore = this.getSafetyScore(safetyNotes, staff.role);
    const score = clampScore(
      skillScore + complexityScore + ratingScore + safetyScore,
    );

    return {
      staff,
      score,
      matchedSkills,
      missingSkills,
      reasons: this.buildMatchReasons(
        service,
        staff,
        matchedSkills,
        missingSkills,
        safetyNotes,
      ),
    };
  }

  private getComplexityScore(
    complexity: ServiceComplexity,
    role: StaffRole,
  ): number {
    if (complexity === ServiceComplexity.HIGH) {
      return roleCanHandleHighComplexity(role) ? 15 : 0;
    }

    if (complexity === ServiceComplexity.MEDIUM) {
      return role === StaffRole.JUNIOR ? 8 : 12;
    }

    return 10;
  }

  private getSafetyScore(
    safetyNotes: ConsultationSafetyNote[],
    role: StaffRole,
  ): number {
    const hasHighSafetyNote = safetyNotes.some(
      (note) => note.severity === SafetyRuleSeverity.HIGH,
    );

    if (!hasHighSafetyNote) {
      return 10;
    }

    return roleCanHandleHighComplexity(role) ? 10 : -5;
  }

  private buildMatchReasons(
    service: Service,
    staff: Staff,
    matchedSkills: string[],
    missingSkills: string[],
    safetyNotes: ConsultationSafetyNote[],
  ): string[] {
    const reasons = [
      `${staff.displayName} matches ${matchedSkills.length} of ${
        (service.requiredSkills ?? []).length
      } required service capabilities.`,
    ];

    if (matchedSkills.length > 0) {
      reasons.push(`Matched capabilities: ${matchedSkills.join(', ')}.`);
    }

    if (missingSkills.length > 0) {
      reasons.push(
        `Capability gaps to be aware of: ${missingSkills.join(', ')}.`,
      );
    }

    if (
      service.complexity === ServiceComplexity.HIGH &&
      roleCanHandleHighComplexity(staff.role)
    ) {
      reasons.push(
        'This service is high complexity, so a senior-level barber is preferred.',
      );
    }

    if (safetyNotes.length > 0 && roleCanHandleHighComplexity(staff.role)) {
      reasons.push(
        'Safety notes were detected, so the match favours an experienced barber.',
      );
    }

    return reasons;
  }

  private toBarberMatch(match: BarberMatchCandidate): ConsultationBarberMatch {
    return {
      id: match.staff.id,
      displayName: match.staff.displayName,
      gender: match.staff.gender ?? StaffGender.UNSPECIFIED,
      role: match.staff.role,
      rating: match.staff.rating ?? 0,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
    };
  }

  private resolveHairState(
    service: Service,
    answers: ConsultationAnswerDto[],
    previousHairHistory: HairHistory[],
  ): string[] {
    const answerText = getAnswerText(answers);
    const matchedTriggers = normalizeTags(service.safetyTriggers).filter(
      (trigger) => answerText.includes(trigger),
    );
    const previousState = previousHairHistory.flatMap(
      (history) => history.hairState ?? [],
    );

    return Array.from(
      new Set([...matchedTriggers, ...normalizeTags(previousState)]),
    ).slice(0, 10);
  }

  private resolveDesiredLook(answers: ConsultationAnswerDto[]): string | null {
    const desiredLook = answers.find(
      (answer) => answer.questionId === 'desired-look',
    );

    return desiredLook?.answer.trim() || null;
  }

  private buildConsultationSummary(
    service: Service,
    answers: ConsultationAnswerDto[],
    safetyNotes: ConsultationSafetyNote[],
    barber: Staff,
  ): string {
    const answerSummary = answers
      .map((answer) => `${answer.questionId}: ${answer.answer.trim()}`)
      .join(' | ');
    const safetySummary =
      safetyNotes.length > 0
        ? safetyNotes.map((note) => note.message).join(' ')
        : 'No safety flags detected.';

    return `${service.name} consultation. ${answerSummary}. Recommended barber: ${barber.displayName}. ${safetySummary}`;
  }
}
