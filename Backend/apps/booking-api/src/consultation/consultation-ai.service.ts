import Anthropic from '@anthropic-ai/sdk';
import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  HairHistory,
  SafetyRule,
  SafetyRuleSeverity,
  Service,
  Staff,
  StaffGender,
  StaffRole,
} from '@coopers/entities';
import type { Repository } from 'typeorm';
import { ConsultationAnswerDto } from './dto/consultation-answer.dto';
import { HairPhotoDto } from './dto/hair-photo.dto';
import {
  ConsultationHairHistorySummary,
  ConsultationQuestion,
  ConsultationSafetyNote,
  ConsultationServiceSummary,
  ConsultationStartResponse,
  ConsultationStreamEvent,
  ConsultationSubmitResponse,
} from './consultation.types';
import { ConsultationService } from './consultation.service';

type ClaudeTool = Anthropic.Messages.Tool;
type ClaudeContentBlockParam = Anthropic.Messages.ContentBlockParam;
type ClaudeMessage = Anthropic.Messages.Message;
type ClaudeMessageParam = Anthropic.Messages.MessageParam;
type ClaudeImageBlockParam = Anthropic.Messages.ImageBlockParam;
type ClaudeTextBlockParam = Anthropic.Messages.TextBlockParam;
type ClaudeToolChoice = Anthropic.Messages.ToolChoice;
type ClaudeToolResultBlockParam = Anthropic.Messages.ToolResultBlockParam;
type ClaudeToolUseBlock = Anthropic.Messages.ToolUseBlock;
type AiQuestionAnswerType = 'text' | 'single_choice' | 'multi_choice';
type AiSafetyNoteSource = 'safety-rule' | 'service-trigger' | 'ai-observation';

type AiQuestion = {
  id: string;
  label: string;
  helperText: string | null;
  required: boolean;
  answerType: AiQuestionAnswerType;
  options: string[];
};

type AiSafetyNote = {
  severity: SafetyRuleSeverity;
  message: string;
  source: AiSafetyNoteSource;
};

type AiStartToolInput = {
  questions: AiQuestion[];
};

type AiSubmitToolInput = {
  matchedBarberId: string;
  matchScore: number;
  matchReasons: string[];
  safetyNotes: AiSafetyNote[];
  hairState: string[];
  desiredLook: string | null;
  consultationSummary: string;
};

type ValidationContext = {
  service: Service;
  previousHairHistory: HairHistory[];
  staff: Staff[];
};

type ConsultationStreamEmitter = (
  event: ConsultationStreamEvent,
) => void | Promise<void>;

type SafeServiceContext = ConsultationServiceSummary & {
  durationMinutes: number;
};

type SafeStaffContext = {
  id: string;
  displayName: string;
  gender: string;
  role: string;
  skills: string[];
  rating: number;
  available: boolean;
};

type QuestionCacheEntry = {
  expiresAt: number;
  questions: ConsultationQuestion[];
};

const MAX_HISTORY_ITEMS = 5;
const MAX_AI_QUESTIONS = 6;
const MAX_AI_MATCH_REASONS = 5;
const MAX_AI_SAFETY_NOTES = 6;
const MAX_AI_HAIR_STATE = 10;
const MAX_TOOL_ITERATIONS = 6;
const QUESTION_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5';
// Models that accept output_config.effort. Sending effort to others (e.g.
// Haiku 4.5 / Sonnet 4.5) returns a 400, so it is omitted for them.
const EFFORT_SUPPORTED_MODELS = new Set<string>([
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-4-5',
  'claude-sonnet-4-6',
  'claude-fable-5',
]);
const QUESTION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(values: unknown, limit: number): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => normalizeString(value))
        .filter((value) => value.length > 0),
    ),
  ).slice(0, limit);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toServiceSummary(service: Service): ConsultationServiceSummary {
  return {
    id: service.id,
    name: service.name,
    complexity: service.complexity,
    requiredSkills: service.requiredSkills ?? [],
    safetyTriggers: service.safetyTriggers ?? [],
  };
}

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

function toSafeServiceContext(service: Service): SafeServiceContext {
  return {
    ...toServiceSummary(service),
    durationMinutes: service.durationMinutes,
  };
}

function toSafeStaffContext(staff: Staff): SafeStaffContext {
  return {
    id: staff.id,
    displayName: staff.displayName,
    gender: staff.gender ?? StaffGender.UNSPECIFIED,
    role: staff.role,
    skills: staff.skills ?? [],
    rating: staff.rating ?? 0,
    available: staff.available,
  };
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength).trim() : value;
}

@Injectable()
export class ConsultationAiService {
  private readonly logger = new Logger(ConsultationAiService.name);
  private readonly anthropic: Anthropic | null;
  private readonly model: string;
  private readonly supportsEffort: boolean;
  private readonly questionCache = new Map<string, QuestionCacheEntry>();

  constructor(
    private readonly configService: ConfigService,
    private readonly fallbackConsultationService: ConsultationService,
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    @InjectRepository(SafetyRule)
    private readonly safetyRuleRepository: Repository<SafetyRule>,
    @InjectRepository(HairHistory)
    private readonly hairHistoryRepository: Repository<HairHistory>,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.model =
      this.configService.get<string>('ANTHROPIC_MODEL') ?? DEFAULT_CLAUDE_MODEL;
    this.supportsEffort = EFFORT_SUPPORTED_MODELS.has(this.model);
    this.anthropic = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async startConsultation(
    userId: string,
    serviceId: string,
  ): Promise<ConsultationStartResponse> {
    try {
      const [service, previousHairHistory] = await Promise.all([
        this.getActiveService(serviceId),
        this.getClientHairHistory(userId),
      ]);
      const cacheKey = this.getQuestionCacheKey(service);
      const cachedQuestions = this.getCachedQuestions(cacheKey);
      const questions =
        cachedQuestions ??
        this.validateAiQuestions(
          this.assertAiStartToolInput(
            await this.requestAiQuestions(userId, serviceId),
          ).questions,
          service,
        );

      if (!cachedQuestions) {
        this.questionCache.set(cacheKey, {
          expiresAt: Date.now() + QUESTION_CACHE_TTL_MS,
          questions,
        });
      }

      return {
        service: toServiceSummary(service),
        questions,
        previousHairHistory: previousHairHistory.map(toHairHistorySummary),
      };
    } catch (error) {
      this.logAiFallback('startConsultation', error);
      return this.fallbackConsultationService.startConsultation(
        userId,
        serviceId,
      );
    }
  }

  private getQuestionCacheKey(service: Service): string {
    const updatedAt = service.updatedAt?.toISOString?.() ?? '';

    return [this.model, service.id, updatedAt].join(':');
  }

  private getCachedQuestions(cacheKey: string): ConsultationQuestion[] | null {
    const cached = this.questionCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.questionCache.delete(cacheKey);
      return null;
    }

    return cached.questions;
  }

  async submitConsultation(
    userId: string,
    serviceId: string,
    answers: ConsultationAnswerDto[],
    hairPhoto?: HairPhotoDto,
  ): Promise<ConsultationSubmitResponse> {
    try {
      return await this.createAiSubmitResult(
        userId,
        serviceId,
        answers,
        hairPhoto,
      );
    } catch (error) {
      this.logAiFallback('submitConsultation', error);
      return this.fallbackConsultationService.submitConsultation(
        userId,
        serviceId,
        answers,
      );
    }
  }

  async submitConsultationStream(
    userId: string,
    serviceId: string,
    answers: ConsultationAnswerDto[],
    hairPhoto: HairPhotoDto | undefined,
    emit: ConsultationStreamEmitter,
  ): Promise<void> {
    try {
      await emit({
        type: 'status',
        message: 'Starting consultation review.',
      });

      const result = await this.createAiSubmitResult(
        userId,
        serviceId,
        answers,
        hairPhoto,
        emit,
      );

      await emit({ type: 'result', result });
      await emit({ type: 'done' });
    } catch (error) {
      this.logAiFallback('submitConsultationStream', error);
      await emit({
        type: 'status',
        message: 'Using reliable fallback recommendation.',
      });

      const result = await this.fallbackConsultationService.submitConsultation(
        userId,
        serviceId,
        answers,
      );

      await emit({ type: 'result', result });
      await emit({ type: 'done' });
    }
  }

  private async createAiSubmitResult(
    userId: string,
    serviceId: string,
    answers: ConsultationAnswerDto[],
    hairPhoto?: HairPhotoDto,
    emit?: ConsultationStreamEmitter,
  ): Promise<ConsultationSubmitResponse> {
    await emit?.({
      type: 'status',
      message: 'Checking service, customer history, safety rules, and barbers.',
    });

    const input = this.assertAiSubmitToolInput(
      await this.requestAiRecommendation(
        userId,
        serviceId,
        answers,
        hairPhoto,
        emit,
      ),
    );
    const context = await this.loadValidationContext(userId, serviceId);
    const matchedBarber = this.getValidatedMatchedBarber(
      input.matchedBarberId,
      context.staff,
    );
    this.assertRecommendationAllowed(input, matchedBarber);

    return {
      service: toServiceSummary(context.service),
      matchedBarber: {
        id: matchedBarber.id,
        displayName: matchedBarber.displayName,
        gender: matchedBarber.gender ?? StaffGender.UNSPECIFIED,
        role: matchedBarber.role,
        rating: matchedBarber.rating ?? 0,
        matchedSkills: this.getMatchedSkills(context.service, matchedBarber),
        missingSkills: this.getMissingSkills(context.service, matchedBarber),
      },
      matchScore: this.validateMatchScore(input.matchScore),
      matchReasons: normalizeStringArray(
        input.matchReasons,
        MAX_AI_MATCH_REASONS,
      ),
      safetyNotes: this.validateSafetyNotes(input.safetyNotes),
      hairState: normalizeStringArray(input.hairState, MAX_AI_HAIR_STATE),
      desiredLook: this.normalizeOptionalAiText(input.desiredLook, 500),
      consultationSummary: this.getConsultationSummary(input, context.service),
      previousHairHistoryCount: context.previousHairHistory.length,
      generation: {
        source: 'claude',
        model: this.model,
      },
    };
  }

  private async requestAiQuestions(
    userId: string,
    serviceId: string,
  ): Promise<unknown> {
    return this.runClaudeToolLoop({
      system: this.buildSystemPrompt(),
      userId,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Generate the consultation questions for this service.',
            serviceId,
            instructions:
              'Use the available tools to inspect service context, customer hair history, and safety rules before calling finalize_consultation_questions.',
          }),
        },
      ],
      tools: [
        this.createGetServiceContextTool(),
        this.createGetCustomerHairHistoryTool(),
        this.createFindSafetyRulesTool(),
        this.createStartTool(),
      ],
      finalToolName: 'finalize_consultation_questions',
      effort: 'low',
      max_tokens: 900,
    });
  }

  private async requestAiRecommendation(
    userId: string,
    serviceId: string,
    answers: ConsultationAnswerDto[],
    hairPhoto?: HairPhotoDto,
    emit?: ConsultationStreamEmitter,
  ): Promise<unknown> {
    return this.runClaudeToolLoop({
      system: this.buildSystemPrompt(),
      userId,
      emit,
      messages: [
        {
          role: 'user',
          content: this.createRecommendationUserContent(
            serviceId,
            answers,
            hairPhoto,
          ),
        },
      ],
      tools: [
        this.createGetServiceContextTool(),
        this.createGetCustomerHairHistoryTool(),
        this.createListAvailableBarbersTool(),
        this.createFindSafetyRulesTool(),
        this.createSubmitTool(),
      ],
      finalToolName: 'finalize_consultation_result',
      effort: 'low',
      max_tokens: 1200,
    });
  }

  private createRecommendationUserContent(
    serviceId: string,
    answers: ConsultationAnswerDto[],
    hairPhoto?: HairPhotoDto,
  ): Array<ClaudeTextBlockParam | ClaudeImageBlockParam> {
    const textBlock: ClaudeTextBlockParam = {
      type: 'text',
      text: JSON.stringify({
        task: 'Create the final consultation recommendation.',
        serviceId,
        answers,
        hasHairPhoto: Boolean(hairPhoto),
        instructions:
          'Use the available tools to inspect service context, customer hair history, available barbers, and safety rules before calling finalize_consultation_result. If a hair photo is included, use it to assess visible length, colour, dryness, damage, density, and preparation concerns. Do not diagnose medical conditions from the image.',
      }),
    };

    if (!hairPhoto) {
      return [textBlock];
    }

    return [
      textBlock,
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: hairPhoto.mediaType,
          data: hairPhoto.data,
        },
      },
    ];
  }

  private async runClaudeToolLoop(params: {
    system: ClaudeTextBlockParam[];
    userId: string;
    emit?: ConsultationStreamEmitter;
    messages: ClaudeMessageParam[];
    tools: ClaudeTool[];
    finalToolName: string;
    effort: 'low' | 'medium' | 'high';
    max_tokens: number;
  }): Promise<unknown> {
    let messages = [...params.messages];

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
      const message = await this.createClaudeMessage({
        system: params.system,
        messages,
        tools: params.tools,
        tool_choice:
          iteration === 0
            ? { type: 'auto' }
            : { type: 'tool', name: params.finalToolName },
        effort: params.effort,
        max_tokens: params.max_tokens,
        emit: params.emit,
      });

      const finalToolUse = message.content.find(
        (block): block is ClaudeToolUseBlock =>
          block.type === 'tool_use' && block.name === params.finalToolName,
      );

      if (finalToolUse) {
        if (!isRecord(finalToolUse.input)) {
          throw new ServiceUnavailableException(
            `Claude returned invalid ${params.finalToolName} input.`,
          );
        }

        return finalToolUse.input;
      }

      const toolUses = message.content.filter(
        (block): block is ClaudeToolUseBlock => block.type === 'tool_use',
      );

      if (toolUses.length === 0) {
        throw new ServiceUnavailableException(
          `Claude stopped with ${message.stop_reason ?? 'unknown'} before finalizing.`,
        );
      }

      const toolResults = await Promise.all(
        toolUses.map((toolUse) =>
          this.executeClaudeTool(params.userId, toolUse, params.emit),
        ),
      );

      messages = [
        ...messages,
        {
          role: 'assistant',
          content: message.content,
        },
        {
          role: 'user',
          content: toolResults,
        },
      ];
    }

    throw new ServiceUnavailableException(
      'Claude exceeded the consultation tool loop limit.',
    );
  }

  private async executeClaudeTool(
    userId: string,
    toolUse: ClaudeToolUseBlock,
    emit?: ConsultationStreamEmitter,
  ): Promise<ClaudeToolResultBlockParam> {
    await emit?.({ type: 'tool_use', name: toolUse.name });

    try {
      const result = await this.getToolResult(userId, toolUse);
      await emit?.({ type: 'tool_result', name: toolUse.name, ok: true });

      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await emit?.({ type: 'tool_result', name: toolUse.name, ok: false });

      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        is_error: true,
        content: message,
      };
    }
  }

  private async getToolResult(
    userId: string,
    toolUse: ClaudeToolUseBlock,
  ): Promise<unknown> {
    switch (toolUse.name) {
      case 'get_service_context':
        return this.getServiceContextToolResult(toolUse.input);
      case 'get_customer_hair_history':
        return this.getCustomerHairHistoryToolResult(userId);
      case 'list_available_barbers':
        return this.listAvailableBarbersToolResult();
      case 'find_safety_rules':
        return this.findSafetyRulesToolResult(toolUse.input);
      default:
        throw new ServiceUnavailableException(
          `Unsupported Claude tool: ${toolUse.name}`,
        );
    }
  }

  private async createClaudeMessage(params: {
    system: ClaudeTextBlockParam[];
    messages: ClaudeMessageParam[];
    tools: ClaudeTool[];
    tool_choice: ClaudeToolChoice;
    effort: 'low' | 'medium' | 'high';
    max_tokens: number;
    emit?: ConsultationStreamEmitter;
  }): Promise<ClaudeMessage> {
    if (!this.anthropic) {
      throw new ServiceUnavailableException('ANTHROPIC_API_KEY is not set.');
    }

    const createParams = {
      model: this.model,
      system: params.system,
      messages: this.withLastMessageCacheBreakpoint(params.messages),
      tools: params.tools,
      tool_choice: params.tool_choice,
      thinking: { type: 'disabled' },
      // effort is unsupported on some models (e.g. Haiku 4.5) and 400s there.
      ...(this.supportsEffort
        ? { output_config: { effort: params.effort } }
        : {}),
      max_tokens: params.max_tokens,
    } satisfies Anthropic.Messages.MessageCreateParamsNonStreaming;

    const message = params.emit
      ? await this.createClaudeStreamingMessage(createParams, params.emit)
      : await this.anthropic.messages.create(createParams);

    this.logPromptCacheUsage(message);

    return message;
  }

  private async createClaudeStreamingMessage(
    params: Anthropic.Messages.MessageCreateParamsNonStreaming,
    emit: ConsultationStreamEmitter,
  ): Promise<ClaudeMessage> {
    const stream = this.anthropic?.messages
      .stream(params)
      .on('text', (text) => {
        void emit({ type: 'text_delta', text });
      });

    if (!stream) {
      throw new ServiceUnavailableException('ANTHROPIC_API_KEY is not set.');
    }

    return stream.finalMessage();
  }

  private logPromptCacheUsage(message: ClaudeMessage): void {
    const cacheCreated = message.usage.cache_creation_input_tokens ?? 0;
    const cacheRead = message.usage.cache_read_input_tokens ?? 0;

    if (cacheCreated > 0 || cacheRead > 0) {
      this.logger.debug(
        `Claude prompt cache usage: created=${cacheCreated}, read=${cacheRead}`,
      );
    }
  }

  private withLastMessageCacheBreakpoint(
    messages: ClaudeMessageParam[],
  ): ClaudeMessageParam[] {
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== 'user') {
      return messages;
    }

    return [
      ...messages.slice(0, -1),
      {
        ...lastMessage,
        content: this.withCacheBreakpointOnContent(lastMessage.content),
      },
    ];
  }

  private withCacheBreakpointOnContent(
    content: ClaudeMessageParam['content'],
  ): ClaudeMessageParam['content'] {
    if (typeof content === 'string') {
      return [
        {
          type: 'text',
          text: content,
          cache_control: { type: 'ephemeral' },
        },
      ];
    }

    if (content.length === 0) {
      return content;
    }

    const nextContent = [...content];
    const lastBlock = nextContent[nextContent.length - 1];

    nextContent[nextContent.length - 1] = {
      ...lastBlock,
      cache_control: { type: 'ephemeral' },
    } as ClaudeContentBlockParam;

    return nextContent;
  }

  private async loadValidationContext(
    userId: string,
    serviceId: string,
  ): Promise<ValidationContext> {
    const [service, previousHairHistory, staff] = await Promise.all([
      this.getActiveService(serviceId),
      this.getClientHairHistory(userId),
      this.staffRepository.find({
        where: { active: true, available: true },
        order: { displayName: 'ASC' },
      }),
    ]);

    if (staff.length === 0) {
      throw new ServiceUnavailableException('No available barbers found.');
    }

    return {
      service,
      previousHairHistory,
      staff,
    };
  }

  private async getActiveService(serviceId: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId, isActive: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found.');
    }

    return service;
  }

  private getClientHairHistory(userId: string): Promise<HairHistory[]> {
    return this.hairHistoryRepository
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.barber', 'barber')
      .innerJoin('history.client', 'client')
      .where('client.id = :userId', { userId })
      .orderBy('history.visitDate', 'DESC')
      .addOrderBy('history.createdAt', 'DESC')
      .take(MAX_HISTORY_ITEMS)
      .getMany();
  }

  private buildSystemPrompt(): ClaudeTextBlockParam[] {
    return [
      {
        type: 'text',
        text: [
          'You are the consultation agent for Coopers Barbershop.',
          'You decide service-specific consultation questions and final barber recommendations.',
          'Use backend tools to inspect database context. Never invent services, barber IDs, staff names, prices, or safety rules.',
          'Prefer experienced barbers for high-complexity services or safety concerns.',
          'Ask practical, customer-friendly questions that help a barber prepare before the appointment.',
          'Write concise barber-facing summaries. Include safety confirmations the barber should make before starting.',
          'Do not ask for or expose internal user IDs.',
          'Return data only by calling the required finalize tool.',
        ].join(' '),
        cache_control: { type: 'ephemeral' },
      },
    ];
  }

  private createGetServiceContextTool(): ClaudeTool {
    return {
      name: 'get_service_context',
      description:
        'Fetch the selected active service, including complexity, required skills, safety triggers, and duration.',
      strict: true,
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: ['serviceId'],
        properties: {
          serviceId: { type: 'string' },
        },
      },
    };
  }

  private createGetCustomerHairHistoryTool(): ClaudeTool {
    return {
      name: 'get_customer_hair_history',
      description:
        'Fetch recent hair history for the authenticated customer. The user ID is supplied by the backend, not by Claude.',
      strict: true,
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: [],
        properties: {},
      },
    };
  }

  private createListAvailableBarbersTool(): ClaudeTool {
    return {
      name: 'list_available_barbers',
      description:
        'List active and currently available barbers that can be recommended for appointments.',
      strict: true,
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: [],
        properties: {},
      },
    };
  }

  private createFindSafetyRulesTool(): ClaudeTool {
    return {
      name: 'find_safety_rules',
      description:
        'Fetch active salon safety rules relevant to the selected service.',
      strict: true,
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: ['serviceId'],
        properties: {
          serviceId: { type: 'string' },
        },
      },
    };
  }

  private createStartTool(): ClaudeTool {
    return {
      name: 'finalize_consultation_questions',
      description:
        'Return the service-specific questions the customer should answer before booking.',
      strict: true,
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: ['questions'],
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'id',
                'label',
                'helperText',
                'required',
                'answerType',
                'options',
              ],
              properties: {
                id: {
                  type: 'string',
                  pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
                  maxLength: 80,
                },
                label: { type: 'string', maxLength: 180 },
                helperText: {
                  type: ['string', 'null'],
                  maxLength: 240,
                },
                required: { type: 'boolean' },
                answerType: {
                  type: 'string',
                  enum: ['text', 'single_choice', 'multi_choice'],
                },
                options: {
                  type: 'array',
                  items: { type: 'string', maxLength: 80 },
                },
              },
            },
          },
        },
      },
    };
  }

  private createSubmitTool(): ClaudeTool {
    return {
      name: 'finalize_consultation_result',
      description:
        'Return the final barber recommendation and appointment preparation brief.',
      strict: true,
      input_schema: {
        type: 'object',
        additionalProperties: false,
        required: [
          'matchedBarberId',
          'matchScore',
          'matchReasons',
          'safetyNotes',
          'hairState',
          'desiredLook',
          'consultationSummary',
        ],
        properties: {
          matchedBarberId: { type: 'string' },
          matchScore: { type: 'integer' },
          matchReasons: {
            type: 'array',
            items: { type: 'string', maxLength: 240 },
          },
          safetyNotes: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['severity', 'message', 'source'],
              properties: {
                severity: {
                  type: 'string',
                  enum: Object.values(SafetyRuleSeverity),
                },
                message: { type: 'string', maxLength: 260 },
                source: {
                  type: 'string',
                  enum: ['safety-rule', 'service-trigger', 'ai-observation'],
                },
              },
            },
          },
          hairState: {
            type: 'array',
            items: { type: 'string', maxLength: 120 },
          },
          desiredLook: {
            type: ['string', 'null'],
            maxLength: 500,
          },
          consultationSummary: { type: 'string', maxLength: 2000 },
        },
      },
    };
  }

  private async getServiceContextToolResult(
    input: unknown,
  ): Promise<SafeServiceContext> {
    const serviceId = this.getToolServiceId(input);
    const service = await this.getActiveService(serviceId);

    return toSafeServiceContext(service);
  }

  private async getCustomerHairHistoryToolResult(
    userId: string,
  ): Promise<ConsultationHairHistorySummary[]> {
    const previousHairHistory = await this.getClientHairHistory(userId);

    return previousHairHistory.map(toHairHistorySummary);
  }

  private async listAvailableBarbersToolResult(): Promise<SafeStaffContext[]> {
    const staff = await this.staffRepository.find({
      where: { active: true, available: true },
      order: { displayName: 'ASC' },
    });

    return staff.map(toSafeStaffContext);
  }

  private async findSafetyRulesToolResult(input: unknown): Promise<
    Array<{
      id: string;
      condition: string;
      serviceIds: string[];
      message: string;
      severity: SafetyRuleSeverity;
    }>
  > {
    const serviceId = this.getToolServiceId(input);
    const safetyRules = await this.safetyRuleRepository.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });

    return this.toSafeSafetyRules(
      safetyRules.filter((rule) => rule.serviceIds.includes(serviceId)),
    );
  }

  private getToolServiceId(input: unknown): string {
    if (!isRecord(input)) {
      throw new ServiceUnavailableException(
        'Claude called a tool with invalid input.',
      );
    }

    const serviceId = normalizeString(input.serviceId);

    if (!serviceId) {
      throw new ServiceUnavailableException(
        'Claude called a tool without serviceId.',
      );
    }

    return serviceId;
  }

  private validateAiQuestions(
    questions: AiQuestion[],
    service: Service,
  ): ConsultationQuestion[] {
    const normalizedQuestions = questions
      .map((question): ConsultationQuestion | null => {
        const id = normalizeString(question.id);
        const label = normalizeString(question.label);
        const helperText = normalizeString(question.helperText);
        const answerType = question.answerType;
        const options = normalizeStringArray(question.options, 6);

        if (!QUESTION_ID_PATTERN.test(id) || !label) {
          return null;
        }

        return {
          id,
          label: truncateText(label, 180),
          helperText: helperText ? truncateText(helperText, 240) : undefined,
          required: question.required !== false,
          answerType,
          options:
            answerType === 'single_choice' || answerType === 'multi_choice'
              ? options
              : undefined,
        };
      })
      .filter((question): question is ConsultationQuestion => Boolean(question))
      .slice(0, MAX_AI_QUESTIONS);

    if (normalizedQuestions.length < 2) {
      throw new ServiceUnavailableException(
        'Claude returned too few questions.',
      );
    }

    if (
      (service.safetyTriggers ?? []).length > 0 &&
      !normalizedQuestions.some((question) =>
        `${question.id} ${question.label}`.toLowerCase().includes('safety'),
      )
    ) {
      const safetyQuestion: ConsultationQuestion = {
        id: 'safety-check',
        label: 'Do any service safety concerns apply to you?',
        helperText: `Relevant checks: ${service.safetyTriggers.join(', ')}.`,
        required: true,
        answerType: 'text',
      };

      if (normalizedQuestions.length >= MAX_AI_QUESTIONS) {
        normalizedQuestions[MAX_AI_QUESTIONS - 1] = safetyQuestion;
      } else {
        normalizedQuestions.push(safetyQuestion);
      }
    }

    return normalizedQuestions.slice(0, MAX_AI_QUESTIONS);
  }

  private validateQuestionAnswerType(
    answerType: unknown,
  ): AiQuestionAnswerType | null {
    if (
      answerType === 'single_choice' ||
      answerType === 'multi_choice' ||
      answerType === 'text'
    ) {
      return answerType;
    }

    return null;
  }

  private getValidatedMatchedBarber(
    matchedBarberId: string,
    staff: Staff[],
  ): Staff {
    const matchedBarber = staff.find(
      (candidate) => candidate.id === matchedBarberId,
    );

    if (!matchedBarber) {
      throw new ServiceUnavailableException(
        'Claude selected an unavailable barber.',
      );
    }

    return matchedBarber;
  }

  private validateMatchScore(matchScore: unknown): number {
    const numericScore = Number(matchScore);

    if (!Number.isFinite(numericScore)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(numericScore)));
  }

  private validateSafetyNotes(
    safetyNotes: AiSafetyNote[],
  ): ConsultationSafetyNote[] {
    return safetyNotes
      .map((note): ConsultationSafetyNote | null => {
        const severity = note.severity;
        const message = normalizeString(note.message);
        const source = note.source;

        if (!message) {
          return null;
        }

        return {
          severity,
          message: truncateText(message, 260),
          source,
        };
      })
      .filter((note): note is ConsultationSafetyNote => Boolean(note))
      .slice(0, MAX_AI_SAFETY_NOTES);
  }

  private getConsultationSummary(
    input: AiSubmitToolInput,
    service: Service,
  ): string {
    const consultationSummary = truncateText(
      normalizeString(input.consultationSummary),
      2000,
    );

    if (consultationSummary) {
      return consultationSummary;
    }

    const desiredLook = this.normalizeOptionalAiText(input.desiredLook, 500);
    const summaryParts = [
      desiredLook
        ? `Client requested ${desiredLook}.`
        : `Client requested ${service.name}.`,
      ...normalizeStringArray(input.matchReasons, 2),
      'Review the consultation answers and safety notes before starting.',
    ];

    return truncateText(summaryParts.join(' '), 2000);
  }

  private assertAiStartToolInput(input: unknown): AiStartToolInput {
    const questionInput = Array.isArray(input)
      ? input
      : isRecord(input) && Array.isArray(input.questions)
        ? input.questions
        : isRecord(input) && Array.isArray(input.consultationQuestions)
          ? input.consultationQuestions
          : null;

    if (!questionInput) {
      throw new ServiceUnavailableException(
        'Claude returned an invalid question payload.',
      );
    }

    const questions = questionInput
      .map((question): AiQuestion | null => {
        if (!isRecord(question)) {
          return null;
        }

        const id = normalizeString(question.id);
        const label = normalizeString(question.label);
        const helperText =
          question.helperText === null
            ? null
            : truncateText(normalizeString(question.helperText), 240);
        let answerType =
          this.validateQuestionAnswerType(question.answerType) ?? 'text';
        const options = normalizeStringArray(question.options, 6);

        if (!QUESTION_ID_PATTERN.test(id) || !label) {
          return null;
        }

        if (
          (answerType === 'single_choice' || answerType === 'multi_choice') &&
          options.length < 2
        ) {
          answerType = 'text';
        }

        return {
          id,
          label: truncateText(label, 180),
          helperText,
          required: question.required === true,
          answerType,
          options,
        };
      })
      .filter((question): question is AiQuestion => Boolean(question))
      .slice(0, MAX_AI_QUESTIONS);

    if (questions.length < 2) {
      throw new ServiceUnavailableException(
        'Claude returned an invalid number of questions.',
      );
    }

    return { questions };
  }

  private assertAiSubmitToolInput(input: unknown): AiSubmitToolInput {
    if (!isRecord(input)) {
      throw new ServiceUnavailableException(
        'Claude returned an invalid recommendation payload.',
      );
    }

    const matchedBarberId = normalizeString(input.matchedBarberId);
    const matchScore = Number(input.matchScore);
    const matchReasons = normalizeStringArray(
      input.matchReasons,
      MAX_AI_MATCH_REASONS,
    );
    const safetyNotes = this.assertAiSafetyNotes(input.safetyNotes);
    const hairState = normalizeStringArray(input.hairState, MAX_AI_HAIR_STATE);
    const desiredLook =
      input.desiredLook === null
        ? null
        : this.normalizeOptionalAiText(normalizeString(input.desiredLook), 500);
    const consultationSummary = truncateText(
      normalizeString(input.consultationSummary),
      2000,
    );

    if (!matchedBarberId) {
      throw new ServiceUnavailableException(
        'Claude returned no matched barber ID.',
      );
    }

    if (!Number.isInteger(matchScore) || matchScore < 0 || matchScore > 100) {
      throw new ServiceUnavailableException(
        'Claude returned an invalid score.',
      );
    }

    if (matchReasons.length === 0) {
      throw new ServiceUnavailableException(
        'Claude returned an incomplete recommendation.',
      );
    }

    return {
      matchedBarberId,
      matchScore,
      matchReasons,
      safetyNotes,
      hairState,
      desiredLook,
      consultationSummary,
    };
  }

  private assertAiSafetyNotes(input: unknown): AiSafetyNote[] {
    if (!Array.isArray(input)) {
      throw new ServiceUnavailableException(
        'Claude returned invalid safety notes.',
      );
    }

    return input.slice(0, MAX_AI_SAFETY_NOTES).map((note): AiSafetyNote => {
      if (!isRecord(note)) {
        throw new ServiceUnavailableException(
          'Claude returned a non-object safety note.',
        );
      }

      const severity = this.assertSafetySeverity(note.severity);
      const source = this.assertSafetyNoteSource(note.source);
      const message = truncateText(normalizeString(note.message), 260);

      if (!message) {
        throw new ServiceUnavailableException(
          'Claude returned an empty safety note.',
        );
      }

      return {
        severity,
        source,
        message,
      };
    });
  }

  private assertRecommendationAllowed(
    input: AiSubmitToolInput,
    matchedBarber: Staff,
  ): void {
    const hasHighSafetyNote = input.safetyNotes.some(
      (note) => note.severity === SafetyRuleSeverity.HIGH,
    );

    if (
      hasHighSafetyNote &&
      matchedBarber.role !== StaffRole.SENIOR &&
      matchedBarber.role !== StaffRole.OWNER
    ) {
      throw new ServiceUnavailableException(
        'Claude matched a high-safety consultation to a non-senior barber.',
      );
    }
  }

  private assertSafetySeverity(severity: unknown): SafetyRuleSeverity {
    if (
      severity === SafetyRuleSeverity.LOW ||
      severity === SafetyRuleSeverity.MEDIUM ||
      severity === SafetyRuleSeverity.HIGH
    ) {
      return severity;
    }

    throw new ServiceUnavailableException(
      'Claude returned an invalid safety severity.',
    );
  }

  private assertSafetyNoteSource(source: unknown): AiSafetyNoteSource {
    if (
      source === 'safety-rule' ||
      source === 'service-trigger' ||
      source === 'ai-observation'
    ) {
      return source;
    }

    throw new ServiceUnavailableException(
      'Claude returned an invalid safety source.',
    );
  }

  private normalizeOptionalAiText(
    value: string | null | undefined,
    maxLength: number,
  ): string | null {
    const normalizedValue = normalizeString(value);

    return normalizedValue ? truncateText(normalizedValue, maxLength) : null;
  }

  private getMatchedSkills(service: Service, staff: Staff): string[] {
    const staffSkills = new Set((staff.skills ?? []).map((skill) => skill));

    return (service.requiredSkills ?? []).filter((skill) =>
      staffSkills.has(skill),
    );
  }

  private getMissingSkills(service: Service, staff: Staff): string[] {
    const staffSkills = new Set((staff.skills ?? []).map((skill) => skill));

    return (service.requiredSkills ?? []).filter(
      (skill) => !staffSkills.has(skill),
    );
  }

  private toSafeSafetyRules(safetyRules: SafetyRule[]): Array<{
    id: string;
    condition: string;
    serviceIds: string[];
    message: string;
    severity: SafetyRuleSeverity;
  }> {
    return safetyRules.map((rule) => ({
      id: rule.id,
      condition: rule.condition,
      serviceIds: rule.serviceIds,
      message: rule.message,
      severity: rule.severity,
    }));
  }

  private logAiFallback(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `Claude consultation ${operation} failed; using deterministic fallback. ${message}`,
    );
  }
}
