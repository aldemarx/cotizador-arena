-- Migración 0008 · Arenas del Valle en la misma base que Altos de Sacta.
-- Es idempotente: se puede ejecutar más de una vez. NO toca ninguna fila de Altos de Sacta.
--
-- Continúa la numeración de simulador-precios/supabase/migrations (0002–0007): es la misma base de datos.
-- Se ejecuta a mano en Supabase → SQL Editor. Después se cargan los lotes con scripts/migrar-lotes-a-supabase.mjs.
--
-- Qué hace:
--   1. Registra el proyecto «arenas-del-valle» (los lotes de cada proyecto se separan por `proyecto_id`;
--      Altos de Sacta solo lee `proyecto_id = 'altos-de-sacta'`, así que no ve los de Arenas).
--   2. Agrega `lotes.promocion` (jsonb, opcional): las condiciones de promoción de 138 lotes de Arenas. Altos
--      lee sus columnas por nombre, así que una columna nueva no le afecta.
--   3. Permite `lotes.etapa` vacía: el Excel de Arenas no indica la etapa de cada lote.
-- Las reglas de acceso (RLS) de `lotes` ya cubren a Arenas: la clave pública no lee nada y el servidor lee con la clave secreta.

ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS promocion jsonb;
ALTER TABLE public.lotes ALTER COLUMN etapa DROP NOT NULL;

INSERT INTO public.proyectos (id, nombre, activo, moneda, version_precios, parametros)
VALUES (
  'arenas-del-valle',
  'Arenas del Valle',
  true,
  'PEN (S/)',
  '2026-10-excel-arenas-y-aura',
  '{"numero_cuotas": 80, "plazos": [60, 80], "tasa_mensual": 0, "inicial_opciones": [500, 1000, 2000], "inicial_por_defecto": 2000, "recargo_lista": 4000, "modelo": "arenas-2026"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- REVERTIR (solo si hace falta; ejecutar APARTE). Borra únicamente lo de Arenas:
--
-- DELETE FROM public.lotes     WHERE proyecto_id = 'arenas-del-valle';
-- DELETE FROM public.proyectos WHERE id          = 'arenas-del-valle';
-- ALTER TABLE public.lotes DROP COLUMN promocion;   -- solo si ya nadie la usa
