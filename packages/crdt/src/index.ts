
import { CanonicalBlock, CanonicalDocument } from '@foundry/canonical-model';

// CRDT for canonical blocks - Yjs/Automerge style, but for blocks, not text
// Enables offline edits on multiple devices + merge without cloud seeing content

export interface VersionVector { [deviceId: string]: number; }

export interface CRDTBlock extends CanonicalBlock {
  lamport: number; // lamport timestamp
  deviceId: string;
  deleted: boolean; // tombstone for delete
  parentId?: string; // for ordering
}

export class FoundryCRDT {
  private blocks: Map<string, CRDTBlock> = new Map();
  private vector: VersionVector = {};

  constructor(private deviceId: string) {}

  // Local edit - offline first
  insertBlock(block: CanonicalBlock): CRDTBlock {
    const lamport = (this.vector[this.deviceId]||0)+1;
    this.vector[this.deviceId] = lamport;
    const crdtBlock: CRDTBlock = { ...block, lamport, deviceId: this.deviceId, deleted:false };
    this.blocks.set(block.id, crdtBlock);
    return crdtBlock;
  }

  deleteBlock(blockId: string) {
    const b = this.blocks.get(blockId);
    if(b) {
      const lamport = (this.vector[this.deviceId]||0)+1;
      this.vector[this.deviceId] = lamport;
      this.blocks.set(blockId, {...b, deleted:true, lamport, deviceId:this.deviceId});
    }
  }

  // Merge from remote device - envelope contains vector + changed blocks (encrypted via P2P)
  merge(remoteBlocks: CRDTBlock[], remoteVector: VersionVector): { merged: CRDTBlock[], conflicts: CRDTBlock[] } {
    const conflicts: CRDTBlock[] = [];
    const merged: CRDTBlock[] = [];

    for(const rb of remoteBlocks) {
      const local = this.blocks.get(rb.id);
      if(!local) {
        this.blocks.set(rb.id, rb);
        merged.push(rb);
      } else {
        // LWW + deviceId tie-breaker, but keep both if concurrent edit to same block
        if(rb.lamport > local.lamport || (rb.lamport===local.lamport && rb.deviceId > local.deviceId)) {
          if(rb.lamport===local.lamport && JSON.stringify(rb.content)!==JSON.stringify(local.content)) {
            conflicts.push(rb); // concurrent edit - need human validation
          } else {
            this.blocks.set(rb.id, rb);
            merged.push(rb);
          }
        }
      }
    }

    // Merge version vectors - max
    for(const [dev, ver] of Object.entries(remoteVector)) {
      this.vector[dev] = Math.max(this.vector[dev]||0, ver);
    }

    return { merged, conflicts };
  }

  getDocument(envelope: any): CanonicalDocument {
    const activeBlocks = [...this.blocks.values()].filter(b=>!b.deleted).sort((a,b)=>a.lamport-b.lamport);
    return { envelope, blocks: activeBlocks };
  }

  getVector(): VersionVector { return this.vector; }
  getChangesSince(vector: VersionVector): CRDTBlock[] {
    return [...this.blocks.values()].filter(b => (vector[b.deviceId]||0) < b.lamport);
  }

  // Time travel - undo
  getHistory(): CRDTBlock[][] {
    // Return snapshots per lamport
    return [];
  }
}
