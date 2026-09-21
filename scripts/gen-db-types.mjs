#!/usr/bin/env node
/**
 * Genera `src/lib/supabase/database.types.ts` leyendo el catálogo real de
 * Postgres (tablas, vistas, funciones y enums del esquema `public`).
 *
 * Por qué no `supabase gen types`: esa orden necesita descargar la imagen
 * Docker `postgres-meta`. Este script produce la misma forma de tipos usando
 * solo una conexión a la base, de modo que `npm run db:types` funciona en
 * cualquier entorno (CI incluido). Si tienes Docker disponible, el resultado de
 * `npx supabase gen types typescript --db-url $ALIAPP_TEST_DATABASE_URL` es
 * intercambiable con este fichero.
 *
 * Uso: node scripts/gen-db-types.mjs [connection-string]
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import pg from 'pg';

const connectionString =
  process.argv[2] ??
  process.env.ALIAPP_TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:55432/aliapp_test';

const SCALAR_TYPES = new Map([
  ['uuid', 'string'],
  ['text', 'string'],
  ['character varying', 'string'],
  ['date', 'string'],
  ['timestamp with time zone', 'string'],
  ['timestamp without time zone', 'string'],
  ['time with time zone', 'string'],
  ['interval', 'string'],
  ['smallint', 'number'],
  ['integer', 'number'],
  ['bigint', 'number'],
  ['numeric', 'number'],
  ['real', 'number'],
  ['double precision', 'number'],
  ['boolean', 'boolean'],
  ['json', 'Json'],
  ['jsonb', 'Json'],
]);

function tsType(column, enumNames) {
  if (column.is_array) {
    const base = tsBase(column.element_type ?? column.data_type, enumNames);
    return `${base}[]`;
  }
  return tsBase(column.udt_name ?? column.data_type, enumNames, column.data_type);
}

function tsBase(name, enumNames, dataType) {
  if (enumNames.has(name)) {
    return `Database['public']['Enums']['${name}']`;
  }
  if (dataType && SCALAR_TYPES.has(dataType)) return SCALAR_TYPES.get(dataType);
  if (SCALAR_TYPES.has(name)) return SCALAR_TYPES.get(name);
  return 'unknown';
}

const HEADER = `/**
 * FICHERO GENERADO. No editar a mano.
 *
 * Se regenera con \`npm run db:types\` a partir del esquema real de Postgres,
 * después de aplicar las migraciones de \`supabase/migrations\`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
`;

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();

  const { rows: enumRows } = await client.query(`
    select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder) as values
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname
    order by t.typname;
  `);
  const enumNames = new Set(enumRows.map((row) => row.name));

  const { rows: columns } = await client.query(`
    select
      c.relname as table_name,
      case c.relkind when 'r' then 'table' when 'p' then 'table' else 'view' end as kind,
      a.attname as column_name,
      a.attnum as ordinal,
      not a.attnotnull as is_nullable,
      format_type(a.atttypid, null) as data_type,
      coalesce(et.typname, t.typname) as udt_name,
      et.typname as element_type,
      (t.typcategory = 'A') as is_array,
      (pg_get_expr(d.adbin, d.adrelid) is not null) as has_default,
      a.attidentity <> '' as is_identity,
      a.attgenerated <> '' as is_generated
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_type et on et.oid = t.typelem and t.typcategory = 'A'
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v')
      and a.attnum > 0
      and not a.attisdropped
    order by c.relname, a.attnum;
  `);

  const { rows: functions } = await client.query(`
    select
      p.proname as name,
      pg_get_function_arguments(p.oid) as args,
      pg_get_function_result(p.oid) as returns
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      -- Las funciones que instala una extensión (pgcrypto…) no son API de la
      -- aplicación, y sus sobrecargas chocarían en TypeScript.
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
    order by p.proname;
  `);

  await client.end();

  const grouped = new Map();
  for (const column of columns) {
    if (!grouped.has(column.table_name)) {
      grouped.set(column.table_name, { kind: column.kind, columns: [] });
    }
    grouped.get(column.table_name).columns.push(column);
  }

  const tables = [...grouped.entries()].filter(([, value]) => value.kind === 'table');
  const views = [...grouped.entries()].filter(([, value]) => value.kind === 'view');

  const lines = [HEADER, 'export type Database = {', '  public: {', '    Tables: {'];

  for (const [name, { columns: cols }] of tables) {
    lines.push(`      ${name}: {`);
    lines.push('        Row: {');
    for (const col of cols) {
      lines.push(`          ${col.column_name}: ${tsType(col, enumNames)}${col.is_nullable ? ' | null' : ''};`);
    }
    lines.push('        };');
    lines.push('        Insert: {');
    for (const col of cols) {
      if (col.is_generated) continue;
      const optional = col.is_nullable || col.has_default || col.is_identity ? '?' : '';
      lines.push(
        `          ${col.column_name}${optional}: ${tsType(col, enumNames)}${col.is_nullable ? ' | null' : ''};`,
      );
    }
    lines.push('        };');
    lines.push('        Update: {');
    for (const col of cols) {
      if (col.is_generated) continue;
      lines.push(
        `          ${col.column_name}?: ${tsType(col, enumNames)}${col.is_nullable ? ' | null' : ''};`,
      );
    }
    lines.push('        };');
    lines.push('        Relationships: [];');
    lines.push('      };');
  }

  lines.push('    };', '    Views: {');
  for (const [name, { columns: cols }] of views) {
    lines.push(`      ${name}: {`);
    lines.push('        Row: {');
    for (const col of cols) {
      lines.push(`          ${col.column_name}: ${tsType(col, enumNames)} | null;`);
    }
    lines.push('        };');
    lines.push('        Relationships: [];');
    lines.push('      };');
  }

  lines.push('    };', '    Functions: {');
  const seenFunctions = new Set();
  for (const fn of functions) {
    if (seenFunctions.has(fn.name)) continue;
    seenFunctions.add(fn.name);
    lines.push(`      ${fn.name}: {`);
    lines.push(`        Args: Record<string, unknown>;`);
    lines.push(`        Returns: unknown;`);
    lines.push('      };');
  }

  lines.push('    };', '    Enums: {');
  for (const row of enumRows) {
    lines.push(`      ${row.name}: ${row.values.map((value) => `'${value}'`).join(' | ')};`);
  }
  lines.push('    };', '    CompositeTypes: Record<string, never>;', '  };', '};', '');

  lines.push(
    `export type Tables<T extends keyof Database['public']['Tables']> =`,
    `  Database['public']['Tables'][T]['Row'];`,
    `export type TablesInsert<T extends keyof Database['public']['Tables']> =`,
    `  Database['public']['Tables'][T]['Insert'];`,
    `export type TablesUpdate<T extends keyof Database['public']['Tables']> =`,
    `  Database['public']['Tables'][T]['Update'];`,
    `export type Views<T extends keyof Database['public']['Views']> =`,
    `  Database['public']['Views'][T]['Row'];`,
    `export type Enums<T extends keyof Database['public']['Enums']> =`,
    `  Database['public']['Enums'][T];`,
    '',
  );

  const target = resolve('src/lib/supabase/database.types.ts');
  writeFileSync(target, lines.join('\n'));
  console.log(`✓ Tipos generados en ${target} (${tables.length} tablas, ${views.length} vistas, ${enumRows.length} enums)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
