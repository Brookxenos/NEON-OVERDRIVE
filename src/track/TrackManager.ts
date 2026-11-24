import * as THREE from 'three';
import { SEGMENT_COUNT, SEGMENT_LENGTH } from '../utils/Constants';
import { TextureBundle } from '../utils/TextureFactory';
import {
  RoadSegment,
  RoadSegmentGeometries,
  RoadSegmentMaterials,
} from './RoadSegment';
import { TrackDecorations } from './TrackDecorations';

export class TrackManager {
  public readonly group = new THREE.Group();

  private readonly segments: RoadSegment[] = [];
  private readonly decorations: TrackDecorations;
  private readonly sharedMats: RoadSegmentMaterials;
  private readonly sharedGeos: RoadSegmentGeometries;
  private elapsed = 0;
  private nextGantrySignIndex = 0;
  private nextSideBannerIndex = 4;

  constructor(textures: TextureBundle) {
    this.sharedMats = RoadSegment.createSharedMaterials(textures);
    this.sharedGeos = RoadSegment.createSharedGeometries();
    this.nextGantrySignIndex = this.sharedMats.gantrySignFaceMats.length;
    this.nextSideBannerIndex = 4;

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const segment = new RoadSegment(i, this.sharedMats, this.sharedGeos);
      this.group.add(segment.group);
      this.segments.push(segment);
    }

    this.decorations = new TrackDecorations(textures);
    this.group.add(this.decorations.group);
  }

  public reset(): void {
    this.elapsed = 0;
    const signCount = this.sharedMats.gantrySignFaceMats.length;
    const bannerCount = this.sharedMats.sideBannerFaceMats.length;
    this.nextGantrySignIndex = signCount;
    this.nextSideBannerIndex = 4;
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      seg.group.position.z = 376 - i * SEGMENT_LENGTH;
      if (seg.hasGantry && signCount > 0) {
        const gantryOrdinal = Math.floor(i / 3) - 4;
        seg.setGantrySignIndex(gantryOrdinal, this.sharedMats);
      } else if (seg.hasSideBanner && bannerCount > 0) {
        const bannerOrdinal = Math.floor(i / 3) - 4;
        seg.setSideBannerIndex(bannerOrdinal, this.sharedMats);
      }
      seg.animate(0, false);
    }
  }

  public update(dt: number, worldSpeed: number, isBoosting: boolean): void {
    this.elapsed = (this.elapsed + dt) % (Math.PI * 200);
    const dz = worldSpeed * dt;
    const totalTrackLen = SEGMENT_COUNT * SEGMENT_LENGTH;

    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      seg.group.position.z += dz;
      if (seg.group.position.z > 376 + SEGMENT_LENGTH * 0.5) {
        seg.group.position.z -= totalTrackLen;
        if (seg.hasGantry) {
          seg.setGantrySignIndex(this.nextGantrySignIndex, this.sharedMats);
          this.nextGantrySignIndex += 1;
        } else if (seg.hasSideBanner) {
          seg.setSideBannerIndex(this.nextSideBannerIndex, this.sharedMats);
          this.nextSideBannerIndex += 1;
        }
      }
      seg.animate(this.elapsed, isBoosting);
    }

    this.decorations.update(dz);
  }

  public dispose(): void {
    this.segments.forEach((s) => s.dispose());
    this.decorations.dispose();
    this.sharedMats.dispose();
    this.sharedGeos.dispose();
  }
}
