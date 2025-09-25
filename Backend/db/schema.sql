-- Appointment Booking — PostgreSQL schema and seed configurations

-- 1) Extensions --------------------------------------------------------------
-- provides cryptographic functions - pgcrypto (gen_random_uuid(), crypt())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- create constraints like “appointments must not overlap”
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- to use = with GiST in exclusion constraint

-- 2) Enums -------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer','admin');

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('booked','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tables ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (), --uuid to generate a random unique id.
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    name text NOT NULL UNIQUE,
    duration_minutes smallint NOT NULL CHECK (duration_minutes > 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    display_name text NOT NULL,
    timezone text NOT NULL DEFAULT 'Australia/Sydney',
    buffer_after_minutes smallint NOT NULL DEFAULT 15,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_working_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    staff_id uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
    weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- 1=Mon ... 7=Sun
    start_time time NOT NULL,
    end_time time NOT NULL,
    is_working boolean NOT NULL DEFAULT true,
    UNIQUE (staff_id, weekday),
    CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS staff_breaks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    staff_id uuid NOT NULL REFERENCES staff (id) ON DELETE CASCADE,
    weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
    start_time time NOT NULL,
    end_time time NOT NULL,
    CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    staff_id uuid NOT NULL REFERENCES staff (id) ON DELETE RESTRICT,
    customer_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
    status appointment_status NOT NULL DEFAULT 'booked',
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL,
    buffer_after interval NOT NULL DEFAULT interval '15 minutes',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_at > start_at)
);

-- 4) Prevent double-bookings via exclusion constraint ------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_appts'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT no_overlapping_appts
      EXCLUDE USING gist (
        staff_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
      )
      WHERE (status = 'booked');
  END IF;
END
$$ LANGUAGE plpgsql;

-- 5) Seed data ---------------------------------------------------------------
-- Staff
INSERT INTO
    staff (
        id,
        display_name,
        timezone,
        buffer_after_minutes,
        created_at
    )
VALUES (
        '11111111-1111-1111-1111-111111111111',
        'Main Staff',
        'Australia/Sydney',
        15,
        NOW() -- ✅ explicitly set created_at
    )
ON CONFLICT DO NOTHING;

-- Working hours: Mon-Fri 09:00-17:00
WITH
    s AS (
        SELECT id
        FROM staff
        LIMIT 1
    )
INSERT INTO
    staff_working_hours (
        staff_id,
        weekday,
        start_time,
        end_time
    )
SELECT s.id, d.wday, time '09:00', time '17:00'
FROM s
    CROSS JOIN (
        VALUES (1), (2), (3), (4), (5)
    ) AS d (wday)
ON CONFLICT (staff_id, weekday) DO NOTHING;

-- Lunch break: Mon-Fri 12:00-13:00
WITH
    s AS (
        SELECT id
        FROM staff
        LIMIT 1
    )
INSERT INTO
    staff_breaks (
        staff_id,
        weekday,
        start_time,
        end_time
    )
SELECT s.id, d.wday, time '12:00', time '13:00'
FROM s
    CROSS JOIN (
        VALUES (1), (2), (3), (4), (5)
    ) AS d (wday)
ON CONFLICT DO NOTHING;

-- Services
INSERT INTO
    services (name, duration_minutes)
VALUES ('Haircut', 30),
    ('Hair Styling', 45),
    ('Hair Coloring', 90),
    ('Consultation', 15),
    (
        'Deep Conditioning Treatment',
        60
    )
ON CONFLICT (name) DO NOTHING;

-- Users (bcrypt hashes via pgcrypto)
INSERT INTO
    users (email, password_hash, role)
VALUES (
        'customer1@sampleassist.com',
        crypt (
            'password@123',
            gen_salt ('bf', 10)
        ),
        'customer'
    ), -- crypt() to has the passwords and bf for bcrypt hashing
    (
        'customer2@sampleassist.com',
        crypt (
            'password@123',
            gen_salt ('bf', 10)
        ),
        'customer'
    ),
    (
        'admin@sampleassist.com',
        crypt (
            'admin@123',
            gen_salt ('bf', 10)
        ),
        'customer'
    )
ON CONFLICT (email) DO NOTHING;

-- 6) Helpful index for queries ----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appt_staff_start ON appointments (staff_id, start_at);