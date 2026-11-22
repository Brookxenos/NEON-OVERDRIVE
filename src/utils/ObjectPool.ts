export interface Poolable {
  active: boolean;
}

export class ObjectPool<T extends Poolable> {
  private readonly items: T[];

  constructor(items: T[]) {
    this.items = items;
  }

  public acquire(predicate?: (item: T) => boolean, strict = false): T | null {
    if (predicate) {
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        if (!item.active && predicate(item)) {
          return item;
        }
      }
      if (strict) return null;
    }

    for (let i = 0; i < this.items.length; i++) {
      if (!this.items[i].active) {
        return this.items[i];
      }
    }
    return null;
  }

  public forEachActive(callback: (item: T, index: number) => void): void {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].active) {
        callback(this.items[i], i);
      }
    }
  }

  public forEachAll(callback: (item: T, index: number) => void): void {
    for (let i = 0; i < this.items.length; i++) {
      callback(this.items[i], i);
    }
  }
}
