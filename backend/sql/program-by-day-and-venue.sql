-- Програма конкурсу в розрізі днів і майданчиків (PostgreSQL).
--
-- Повертає повний порядок виступів: один рядок = одна позиція програми
-- (виступ, нагородження або вставлений вручну блок), з порахованим часом
-- виходу на сцену.
--
-- Параметри:
--   :competition_id  — обов'язковий, id конкурсу;
--   :day             — дата дня ('2026-09-21') або NULL, щоб узяти всі дні;
--   :venue_id        — id майданчика або NULL, щоб узяти всі майданчики.
--
-- Майданчик береться з секції (`sections."venueId"`), а не з номінації:
-- секція — це те, що реально відбувається на сцені в конкретний день.

WITH live AS (
  -- Живі позиції, за тим самим правилом, що й isLiveItem(): нагородження
  -- і ручні рядки є завжди, а виступ — лише поки його заявка існує
  -- (`section_items."entryId"` занулюється при скасуванні заявки).
  SELECT
    d."date"                          AS day_date,
    d."label"                         AS day_label,
    s."id"                            AS section_id,
    s."name"                          AS section_name,
    s."sortOrder"                     AS section_order,
    s."startTime"                     AS section_start_time,
    s."pauseSeconds"                  AS pause_seconds,
    v."id"                            AS venue_id,
    v."name"                          AS venue_name,
    i."id"                            AS item_id,
    i."type"                          AS item_type,
    i."sortOrder"                     AS item_order,
    i."label"                         AS item_label,
    i."mergedGroupLabel"              AS merged_group_label,
    i."nominationGroupKey"            AS group_key,
    COALESCE(i."durationSeconds", 0)  AS duration_seconds,
    e."number"                        AS entry_number,
    e."routineName"                   AS routine_name,
    e."nomination"                    AS nomination,
    e."program"                       AS program_name,
    e."league"                        AS league,
    e."ageCategory"                   AS age_category,
    e."lineup"                        AS lineup,
    e."participantsCount"             AS participants_count,
    e."studioName"                    AS studio_name,
    e."choreographer"                 AS choreographer,
    e."city"                          AS city,
    e."improv"                        AS improv,
    e."musicName"                     AS music_name,
    -- isGroupImprov(): груповій імпровізації пауза нараховується один раз
    -- на всю групу, а не між учасниками. 'Група' — LINEUP_LABELS.GROUP.
    (e."improv" AND e."lineup" = 'Група') AS is_group_improv
  FROM sections s
  JOIN competition_days d ON d."id" = s."dayId"
  JOIN section_items i    ON i."sectionId" = s."id"
  LEFT JOIN venues v      ON v."id" = s."venueId"
  LEFT JOIN entries e     ON e."id" = i."entryId"
  WHERE s."competitionId" = :competition_id
    AND (i."type" <> 'performance' OR i."entryId" IS NOT NULL)
    AND (:day IS NULL OR d."date" = :day::date)
    AND (:venue_id IS NULL OR s."venueId" = :venue_id::uuid)
),
advanced AS (
  -- Скільки секунд рядок «з'їдає» до наступного, за calculateSchedule():
  -- нагородження бере поточний час і нічого не рухає; виступ — своя
  -- тривалість плюс пауза, окрім переходу всередині групової імпровізації;
  -- ручні рядки (break, gala) — лише своя тривалість, без паузи.
  SELECT
    live.*,
    CASE item_type
      WHEN 'award' THEN 0
      WHEN 'performance' THEN
        duration_seconds
        + CASE
            WHEN is_group_improv
             AND LEAD(is_group_improv) OVER w
             AND LEAD(group_key) OVER w IS NOT DISTINCT FROM group_key
            THEN 0
            ELSE pause_seconds
          END
      ELSE duration_seconds
    END AS advance_seconds
  FROM live
  WINDOW w AS (PARTITION BY section_id ORDER BY item_order)
)
SELECT
  day_date,
  day_label,
  COALESCE(venue_name, 'Без майданчика') AS venue,
  section_name,
  section_start_time,
  to_char(
    section_start_time::interval
      + make_interval(
          secs => COALESCE(
            SUM(advance_seconds) OVER (
              PARTITION BY section_id
              ORDER BY item_order
              ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ),
            0
          )
        ),
    'HH24:MI'
  ) AS starts_at,
  item_order,
  item_type,
  -- Для виступу — назва номера, для ручного рядка — його підпис.
  COALESCE(routine_name, item_label) AS title,
  entry_number,
  COALESCE(merged_group_label, nomination) AS nomination,
  program_name,
  league,
  age_category,
  lineup,
  participants_count,
  studio_name,
  choreographer,
  city,
  improv,
  music_name,
  duration_seconds
FROM advanced
ORDER BY day_date, venue_name NULLS LAST, section_order, item_order;
