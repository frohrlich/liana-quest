import { TilePosition } from './findPath';

interface QueueElement {
  element: TilePosition;
  priority: number;
}

export class PriorityQueue {
  items: QueueElement[];

  constructor() {
    this.items = [];
  }

  enqueue(element: TilePosition, priority: number) {
    let queueElement: QueueElement = { element, priority };
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (queueElement.priority < this.items[i].priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(queueElement);
    }
  }

  dequeue() {
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }
}
