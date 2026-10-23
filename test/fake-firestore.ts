import { randomUUID } from 'crypto';

interface StoredDocument {
  [key: string]: unknown;
}

interface FakeSnapshot {
  exists: boolean;
  id: string;
  data: () => StoredDocument | undefined;
}

interface FakeQuerySnapshot {
  docs: Array<{ id: string; data: () => StoredDocument }>;
}

type Direction = 'asc' | 'desc';
type FilterOp = '<' | '>' | '==';

interface Filter {
  field: string;
  op: FilterOp;
  value: unknown;
}

export class FakeDocumentReference {
  constructor(
    readonly id: string,
    readonly path: string,
    private readonly store: Map<string, StoredDocument>,
  ) {}

  collection(name: string): FakeCollectionReference {
    return new FakeCollectionReference(`${this.path}/${name}`, this.store);
  }

  async get(): Promise<FakeSnapshot> {
    const stored = this.store.get(this.path);
    return {
      exists: stored !== undefined,
      id: this.id,
      data: () => (stored ? { ...stored } : undefined),
    };
  }

  async set(data: StoredDocument): Promise<void> {
    this.store.set(this.path, { ...data });
  }

  async update(partial: StoredDocument): Promise<void> {
    const current = this.store.get(this.path);
    if (!current) {
      throw new Error(`No document to update at ${this.path}`);
    }

    const next: StoredDocument = { ...current };
    for (const [key, value] of Object.entries(partial)) {
      const dot = key.indexOf('.');
      if (dot === -1) {
        next[key] = value;
        continue;
      }
      const head = key.slice(0, dot);
      const tail = key.slice(dot + 1);
      const existing = next[head];
      const map: StoredDocument =
        existing && typeof existing === 'object' ? { ...(existing as StoredDocument) } : {};
      map[tail] = value;
      next[head] = map;
    }
    this.store.set(this.path, next);
  }
}

export class FakeCollectionReference {
  constructor(
    readonly path: string,
    private readonly store: Map<string, StoredDocument>,
  ) {}

  doc(id?: string): FakeDocumentReference {
    const docId = id ?? randomUUID();
    return new FakeDocumentReference(docId, `${this.path}/${docId}`, this.store);
  }

  orderBy(field: string, direction: Direction = 'asc'): FakeQuery {
    return new FakeQuery(this, field, direction);
  }

  children(): Array<{ id: string; data: StoredDocument }> {
    const prefix = `${this.path}/`;
    const rows: Array<{ id: string; data: StoredDocument }> = [];
    for (const [key, data] of this.store.entries()) {
      if (!key.startsWith(prefix)) {
        continue;
      }
      const rest = key.slice(prefix.length);
      if (rest.length === 0 || rest.includes('/')) {
        continue;
      }
      rows.push({ id: rest, data });
    }
    return rows;
  }
}

class FakeQuery {
  constructor(
    private readonly collection: FakeCollectionReference,
    private readonly field: string,
    private readonly direction: Direction,
    private readonly filters: Filter[] = [],
    private readonly max: number | null = null,
  ) {}

  where(field: string, op: FilterOp, value: unknown): FakeQuery {
    return new FakeQuery(this.collection, this.field, this.direction, [...this.filters, { field, op, value }], this.max);
  }

  limit(max: number): FakeQuery {
    return new FakeQuery(this.collection, this.field, this.direction, this.filters, max);
  }

  async get(): Promise<FakeQuerySnapshot> {
    let rows = this.collection.children();
    for (const filter of this.filters) {
      rows = rows.filter((row) => {
        const diff = compareValues(row.data[filter.field], filter.value);
        if (filter.op === '<') return diff < 0;
        if (filter.op === '>') return diff > 0;
        return diff === 0;
      });
    }

    rows.sort((left, right) => {
      const diff = compareValues(left.data[this.field], right.data[this.field]);
      return this.direction === 'desc' ? -diff : diff;
    });

    if (this.max !== null) {
      rows = rows.slice(0, this.max);
    }

    return {
      docs: rows.map((row) => ({
        id: row.id,
        data: () => ({ ...row.data }),
      })),
    };
  }
}

export function createFakeFirestore(store: Map<string, StoredDocument> = new Map()): {
  collection: (name: string) => FakeCollectionReference;
} {
  return {
    collection: (name: string) => new FakeCollectionReference(name, store),
  };
}

function compareValues(left: unknown, right: unknown): number {
  const a = sortableValue(left);
  const b = sortableValue(right);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortableValue(value: unknown): number | string {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const candidate = value as { toMillis: () => number };
    return candidate.toMillis();
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return 0;
}
