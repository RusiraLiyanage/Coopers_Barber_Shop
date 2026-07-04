import { ConfigService } from '@nestjs/config';
import { ensureNodeCryptoGlobal, loadAppEnvFile } from '@coopers/common';
import { createDatabaseConfig } from '@coopers/database';
import { DataSource, type DataSourceOptions, type EntityManager } from 'typeorm';

loadAppEnvFile();
ensureNodeCryptoGlobal();

type ServiceSeed = {
  complexity: 'low' | 'medium' | 'high';
  durationMinutes: number;
  name: string;
  requiredSkills: string[];
  safetyTriggers: string[];
};

type StaffSeed = {
  active: boolean;
  available: boolean;
  displayName: string;
  email: string | null;
  gender: 'male' | 'female' | 'non_binary' | 'unspecified';
  id: string;
  rating: number;
  role: 'junior' | 'senior' | 'owner';
  skills: string[];
};

type ReferenceDataSeed = {
  label: string;
  type: 'barber_capability' | 'safety_trigger';
  value: string;
};

type SafetyRuleSeed = {
  condition: string;
  message: string;
  serviceNames: string[];
  severity: 'low' | 'medium' | 'high';
};

type QueryExecutor = DataSource | EntityManager;

type SeedSummary = {
  activeStaff: Array<{
    display_name: string;
    role: string;
    skills: string[];
  }>;
  summary: {
    active_available_staff: number;
    active_safety_rules: number;
    active_services: number;
    admin_users: number;
    reference_data_items: number;
  };
};

const services: ServiceSeed[] = [
  {
    name: 'Haircut',
    durationMinutes: 30,
    requiredSkills: ['classic haircuts', 'cuts'],
    safetyTriggers: [],
    complexity: 'low',
  },
  {
    name: 'Hair Styling',
    durationMinutes: 45,
    requiredSkills: ['hair styling', 'styling', 'formal styling'],
    safetyTriggers: ['formal event request'],
    complexity: 'medium',
  },
  {
    name: 'Hair Coloring',
    durationMinutes: 90,
    requiredSkills: ['hair colouring', 'colour consultation', 'bleach work'],
    safetyTriggers: [
      'allergy',
      'scalp sensitivity',
      'bleach history',
      'box dye history',
    ],
    complexity: 'high',
  },
  {
    name: 'Consultation',
    durationMinutes: 15,
    requiredSkills: ['client consultation', 'chemical safety assessment'],
    safetyTriggers: ['allergy', 'scalp sensitivity', 'chemical history'],
    complexity: 'medium',
  },
  {
    name: 'Deep Conditioning Treatment',
    durationMinutes: 60,
    requiredSkills: ['deep conditioning treatments', 'damaged hair support'],
    safetyTriggers: ['scalp sensitivity', 'dry or brittle hair'],
    complexity: 'medium',
  },
  {
    name: 'Skin Fade',
    durationMinutes: 45,
    requiredSkills: ['skin fades', 'classic haircuts'],
    safetyTriggers: [],
    complexity: 'low',
  },
  {
    name: 'Beard Trim & Sculpting',
    durationMinutes: 30,
    requiredSkills: ['beard shaping'],
    safetyTriggers: ['beard sensitivity'],
    complexity: 'low',
  },
  {
    name: 'Hot Towel Shave',
    durationMinutes: 30,
    requiredSkills: ['hot towel shaves'],
    safetyTriggers: ['sensitive skin', 'razor irritation history'],
    complexity: 'low',
  },
  {
    name: 'Head Shave',
    durationMinutes: 30,
    requiredSkills: ['head shaves'],
    safetyTriggers: ['sensitive skin'],
    complexity: 'low',
  },
  {
    name: 'Beard Colour',
    durationMinutes: 45,
    requiredSkills: ['beard colouring', 'colour consultation'],
    safetyTriggers: ['allergy', 'beard sensitivity'],
    complexity: 'medium',
  },
  {
    name: 'Colour Correction Consultation',
    durationMinutes: 30,
    requiredSkills: [
      'colour correction consultation',
      'colour correction',
      'chemical safety assessment',
    ],
    safetyTriggers: [
      'colour correction request',
      'box dye history',
      'bleach history',
      'damaged hair',
    ],
    complexity: 'high',
  },
  {
    name: 'Scalp Treatment',
    durationMinutes: 45,
    requiredSkills: ['scalp treatments', 'scalp care', 'sensitive scalp support'],
    safetyTriggers: ['scalp sensitivity', 'scalp irritation'],
    complexity: 'medium',
  },
];

const staff: StaffSeed[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    displayName: 'Main Staff',
    gender: 'unspecified',
    email: null,
    role: 'owner',
    skills: [
      'classic haircuts',
      'cuts',
      'hair styling',
      'hair colouring',
      'colour consultation',
      'bleach work',
      'client consultation',
      'deep conditioning treatments',
      'skin fades',
      'beard shaping',
      'hot towel shaves',
      'head shaves',
      'beard colouring',
      'colour correction',
      'chemical safety assessment',
      'scalp treatments',
      'scalp care',
    ],
    rating: 4.7,
    available: true,
    active: true,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    displayName: 'Sofia Bennett',
    gender: 'female',
    email: 'sofia.bennett@coopers.local',
    role: 'senior',
    skills: [
      'hair colouring',
      'colour consultation',
      'colour correction',
      'colour correction consultation',
      'bleach work',
      'chemical safety assessment',
      'sensitive scalp support',
      'damaged hair support',
      'client consultation',
      'deep conditioning treatments',
    ],
    rating: 4.8,
    available: true,
    active: true,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    displayName: 'Marcus Reed',
    gender: 'male',
    email: 'marcus.reed@coopers.local',
    role: 'senior',
    skills: [
      'classic haircuts',
      'skin fades',
      'beard shaping',
      'hot towel shaves',
      'head shaves',
    ],
    rating: 4.7,
    available: true,
    active: true,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    displayName: 'Ava Patel',
    gender: 'female',
    email: 'ava.patel@coopers.local',
    role: 'senior',
    skills: [
      'hair styling',
      'formal styling',
      'scalp treatments',
      'scalp care',
      'curly hair',
      'sensitive scalp support',
      'client consultation',
    ],
    rating: 4.6,
    available: true,
    active: true,
  },
];

const legacyInvalidStaffIds = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
];

const referenceData: ReferenceDataSeed[] = [
  ...[
    'classic haircuts',
    'skin fades',
    'beard shaping',
    'hot towel shaves',
    'head shaves',
    'hair styling',
    'formal styling',
    'colour consultation',
    'colour correction consultation',
    'hair colouring',
    'beard colouring',
    'colour correction',
    'bleach work',
    'deep conditioning treatments',
    'scalp treatments',
    'scalp care',
    'curly hair',
    'sensitive scalp support',
    'damaged hair support',
    'chemical safety assessment',
    'client consultation',
  ].map((value) => ({
    type: 'barber_capability' as const,
    label: value.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    value,
  })),
  ...[
    'allergy',
    'scalp sensitivity',
    'chemical history',
    'bleach history',
    'box dye history',
    'colour correction request',
    'damaged hair',
    'dry or brittle hair',
    'patch test required',
    'sensitive skin',
    'scalp irritation',
    'beard sensitivity',
    'razor irritation history',
    'formal event request',
    'curl definition request',
    'high maintenance request',
  ].map((value) => ({
    type: 'safety_trigger' as const,
    label: value.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    value,
  })),
];

const safetyRules: SafetyRuleSeed[] = [
  {
    condition: 'allergy',
    serviceNames: ['Hair Coloring', 'Consultation', 'Beard Colour'],
    message:
      'Confirm allergy history and recommend a patch test before chemical services.',
    severity: 'high',
  },
  {
    condition: 'scalp sensitivity',
    serviceNames: [
      'Hair Coloring',
      'Consultation',
      'Deep Conditioning Treatment',
      'Scalp Treatment',
    ],
    message:
      'Client reported scalp sensitivity; use gentle products and confirm before treatment.',
    severity: 'medium',
  },
  {
    condition: 'box dye',
    serviceNames: ['Hair Coloring', 'Colour Correction Consultation'],
    message: 'Review box-dye history before colour correction or bleach work.',
    severity: 'high',
  },
  {
    condition: 'bleach history',
    serviceNames: ['Hair Coloring', 'Colour Correction Consultation'],
    message:
      'Assess previous bleach exposure and hair integrity before applying more lightener.',
    severity: 'high',
  },
  {
    condition: 'damaged hair',
    serviceNames: ['Colour Correction Consultation', 'Deep Conditioning Treatment'],
    message:
      'Hair damage was mentioned; choose a restorative or lower-risk treatment plan.',
    severity: 'medium',
  },
  {
    condition: 'razor irritation',
    serviceNames: ['Hot Towel Shave'],
    message:
      'Confirm razor irritation history and adjust shave technique/products.',
    severity: 'medium',
  },
];

function createSeedDataSourceOptions(): DataSourceOptions {
  const config = new ConfigService(process.env);
  const databaseConfig = createDatabaseConfig(config);
  const { autoLoadEntities, ...dataSourceOptions } =
    databaseConfig as DataSourceOptions & {
      autoLoadEntities?: boolean;
    };

  void autoLoadEntities;

  return dataSourceOptions;
}

async function seedServices(dataSource: QueryExecutor): Promise<void> {
  for (const service of services) {
    await dataSource.query(
      `
        INSERT INTO services (
          name,
          duration_minutes,
          is_active,
          required_skills,
          safety_triggers,
          complexity,
          updated_at
        )
        VALUES ($1, $2, true, $3::text[], $4::text[], $5, now())
        ON CONFLICT (name) DO UPDATE
        SET duration_minutes = EXCLUDED.duration_minutes,
            is_active = true,
            required_skills = EXCLUDED.required_skills,
            safety_triggers = EXCLUDED.safety_triggers,
            complexity = EXCLUDED.complexity,
            updated_at = now()
      `,
      [
        service.name,
        service.durationMinutes,
        service.requiredSkills,
        service.safetyTriggers,
        service.complexity,
      ],
    );
  }
}

async function ensureSeedSchema(dataSource: QueryExecutor): Promise<void> {
  await dataSource.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto
  `);

  await dataSource.query(`
    ALTER TABLE staff
      ADD COLUMN IF NOT EXISTS email text UNIQUE,
      ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'junior',
      ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS rating real NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'unspecified',
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  `);

  await dataSource.query(`
    ALTER TABLE services
      ADD COLUMN IF NOT EXISTS required_skills text[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS safety_triggers text[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS complexity text NOT NULL DEFAULT 'low',
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS staff_working_hours (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
      weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
      start_time time NOT NULL,
      end_time time NOT NULL,
      is_working boolean NOT NULL DEFAULT true,
      UNIQUE (staff_id, weekday),
      CHECK (end_time > start_time)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS staff_breaks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
      weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
      start_time time NOT NULL,
      end_time time NOT NULL,
      CHECK (end_time > start_time)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS safety_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      condition text NOT NULL,
      service_ids uuid[] NOT NULL DEFAULT '{}',
      message text NOT NULL,
      severity text NOT NULL DEFAULT 'medium',
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    ALTER TABLE safety_rules
      ADD COLUMN IF NOT EXISTS service_ids uuid[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS reference_data_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type text NOT NULL CHECK (
        type IN ('barber_capability', 'safety_trigger')
      ),
      label text NOT NULL,
      value text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_data_items_type_value
      ON reference_data_items(type, value)
  `);

  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_safety_rules_service_ids
      ON safety_rules USING gin(service_ids)
  `);
}

async function seedStaff(dataSource: QueryExecutor): Promise<void> {
  await dataSource.query(
    `
      DELETE FROM staff legacy_staff
      WHERE legacy_staff.id = ANY($1::uuid[])
        AND NOT EXISTS (
          SELECT 1
          FROM appointments appointment
          WHERE appointment.staff_id = legacy_staff.id
        )
    `,
    [legacyInvalidStaffIds],
  );

  await dataSource.query(
    `
      UPDATE staff
      SET active = false,
          available = false,
          email = NULL,
          updated_at = now()
      WHERE id = ANY($1::uuid[])
    `,
    [legacyInvalidStaffIds],
  );

  for (const staffMember of staff) {
    await dataSource.query(
      `
        INSERT INTO staff (
          id,
          display_name,
          gender,
          email,
          role,
          skills,
          rating,
          available,
          active,
          timezone,
          buffer_after_minutes,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::text[],
          $7,
          $8,
          $9,
          'Australia/Sydney',
          15,
          now()
        )
        ON CONFLICT (id) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            gender = EXCLUDED.gender,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            skills = EXCLUDED.skills,
            rating = EXCLUDED.rating,
            available = EXCLUDED.available,
            active = EXCLUDED.active,
            timezone = EXCLUDED.timezone,
            buffer_after_minutes = EXCLUDED.buffer_after_minutes,
            updated_at = now()
      `,
      [
        staffMember.id,
        staffMember.displayName,
        staffMember.gender,
        staffMember.email,
        staffMember.role,
        staffMember.skills,
        staffMember.rating,
        staffMember.available,
        staffMember.active,
      ],
    );
  }

  await dataSource.query(
    `
      INSERT INTO staff_working_hours (
        staff_id,
        weekday,
        start_time,
        end_time,
        is_working
      )
      SELECT staff.id, weekday, time '09:00', time '17:00', true
      FROM staff CROSS JOIN generate_series(1, 5) AS weekday
      WHERE staff.id = ANY($1::uuid[])
      ON CONFLICT (staff_id, weekday) DO UPDATE
      SET start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          is_working = true
    `,
    [staff.map((staffMember) => staffMember.id)],
  );

  await dataSource.query(
    `
      INSERT INTO staff_breaks (staff_id, weekday, start_time, end_time)
      SELECT staff.id, weekday, time '12:00', time '13:00'
      FROM staff CROSS JOIN generate_series(1, 5) AS weekday
      WHERE staff.id = ANY($1::uuid[])
        AND NOT EXISTS (
          SELECT 1
          FROM staff_breaks existing_break
          WHERE existing_break.staff_id = staff.id
            AND existing_break.weekday = weekday
            AND existing_break.start_time = time '12:00'
            AND existing_break.end_time = time '13:00'
        )
    `,
    [staff.map((staffMember) => staffMember.id)],
  );
}

async function seedReferenceData(dataSource: QueryExecutor): Promise<void> {
  for (const item of referenceData) {
    await dataSource.query(
      `
        INSERT INTO reference_data_items (type, label, value, updated_at)
        VALUES ($1, $2, $3, now())
        ON CONFLICT (type, value) DO UPDATE
        SET label = EXCLUDED.label,
            updated_at = now()
      `,
      [item.type, item.label, item.value],
    );
  }
}

async function seedSafetyRules(dataSource: QueryExecutor): Promise<void> {
  for (const rule of safetyRules) {
    const serviceIds = await dataSource.query<{ ids: string[] | null }[]>(
      `
        SELECT array_agg(id)::uuid[] AS ids
        FROM services
        WHERE name = ANY($1::text[])
      `,
      [rule.serviceNames],
    );
    const ids = serviceIds[0]?.ids ?? [];

    await dataSource.query(
      `
        UPDATE safety_rules
        SET service_ids = $2::uuid[],
            message = $3,
            severity = $4,
            active = true,
            updated_at = now()
        WHERE condition = $1
      `,
      [rule.condition, ids, rule.message, rule.severity],
    );

    await dataSource.query(
      `
        INSERT INTO safety_rules (
          condition,
          service_ids,
          message,
          severity,
          active,
          updated_at
        )
        SELECT $1, $2::uuid[], $3, $4, true, now()
        WHERE NOT EXISTS (
          SELECT 1 FROM safety_rules WHERE condition = $1
        )
      `,
      [rule.condition, ids, rule.message, rule.severity],
    );
  }
}

async function seedAdminUser(dataSource: QueryExecutor): Promise<void> {
  await dataSource.query(
    `
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        role,
        updated_at
      )
      VALUES (
        'admin@sampleassist.com',
        crypt('admin@123', gen_salt('bf', 10)),
        'Cooper',
        'Admin',
        'admin',
        now()
      )
      ON CONFLICT (email) DO UPDATE
      SET password_hash = crypt('admin@123', gen_salt('bf', 10)),
          first_name = 'Cooper',
          last_name = 'Admin',
          role = 'admin',
          updated_at = now()
    `,
  );
}

async function readSummary(dataSource: DataSource): Promise<SeedSummary> {
  const [summary] = await dataSource.query<
    Array<{
      active_available_staff: number;
      active_safety_rules: number;
      active_services: number;
      admin_users: number;
      reference_data_items: number;
    }>
  >(
    `
      SELECT
        (SELECT count(*) FROM users WHERE role = 'admin')::int AS admin_users,
        (SELECT count(*) FROM services WHERE is_active = true)::int AS active_services,
        (
          SELECT count(*)
          FROM staff
          WHERE active = true AND available = true
        )::int AS active_available_staff,
        (
          SELECT count(*)
          FROM safety_rules
          WHERE active = true
        )::int AS active_safety_rules,
        (SELECT count(*) FROM reference_data_items)::int AS reference_data_items
    `,
  );
  const activeStaff = await dataSource.query<
    Array<{
      display_name: string;
      role: string;
      skills: string[];
    }>
  >(
    `
      SELECT display_name, role, skills
      FROM staff
      WHERE active = true AND available = true
      ORDER BY display_name
    `,
  );

  return {
    summary,
    activeStaff,
  };
}

async function seedStagingData(): Promise<void> {
  const dataSource = new DataSource(createSeedDataSourceOptions());

  try {
    console.info('Connecting to database for staging seed...');
    await dataSource.initialize();
    await dataSource.transaction(async (transactionalDataSource) => {
      await ensureSeedSchema(transactionalDataSource);
      await seedAdminUser(transactionalDataSource);
      await seedServices(transactionalDataSource);
      await seedStaff(transactionalDataSource);
      await seedReferenceData(transactionalDataSource);
      await seedSafetyRules(transactionalDataSource);
    });
    console.info(
      JSON.stringify(
        {
          ok: true,
          ...(await readSummary(dataSource)),
        },
        null,
        2,
      ),
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void seedStagingData().catch((error: unknown) => {
  console.error('Staging seed failed.', error);
  process.exitCode = 1;
});
