// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { IView, VertexRenderData } from "chili-core";

import { SnapedData } from "../";
import { Axis } from "./axis";

export interface ObjectTrackingAxis {
    axes: Axis[];
    objectName: string | undefined;
}

interface SnapeInfo {
    snap: SnapedData;
    shapeId: number;
    axies: Axis[];
}

export class ObjectTracking {
    private timer?: any;
    private isCleared: boolean = false;
    private snapping?: SnapedData;
    private trackings: Map<IView, SnapeInfo[]>;

    constructor(readonly trackingZ: boolean) {
        this.trackings = new Map();
    }

    clear(): void {
        this.isCleared = true;
        this.trackings.forEach((v, k) => {
            v.forEach((s) => {
                k.viewer.document.visualization.context.temporaryRemove(s.shapeId);
            });
        });
        this.trackings.clear();
    }

    getTrackingRays(view: IView) {
        let result: ObjectTrackingAxis[] = [];
        this.trackings.get(view)?.forEach((x) => result.push({ axes: x.axies, objectName: x.snap.info }));
        return result;
    }

    showTrackingAtTimeout(view: IView, snap?: SnapedData) {
        if (snap !== undefined && this.snapping === snap) return;
        this.snapping = snap;
        if (this.timer !== undefined) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        if (snap === undefined) return;
        this.timer = setTimeout(() => this.showTracking(view, snap), 600);
    }

    private showTracking(view: IView, snap: SnapedData) {
        if (this.isCleared || snap.shapes.length === 0) return;
        if (!this.trackings.has(view)) {
            this.trackings.set(view, []);
        }
        let currentTrackings = this.trackings.get(view)!;
        let s = currentTrackings.find((x) => x.snap.point.isEqualTo(snap.point));
        if (s !== undefined) {
            this.removeSnapFromTracking(view, s, currentTrackings);
        } else {
            this.addSnapToTracking(snap, view, currentTrackings);
        }
        view.viewer.redraw();
    }

    private removeSnapFromTracking(view: IView, s: SnapeInfo, snaps: SnapeInfo[]) {
        view.viewer.document.visualization.context.temporaryRemove(s.shapeId);
        this.trackings.set(
            view,
            snaps.filter((x) => x !== s)
        );
    }

    private addSnapToTracking(snap: SnapedData, view: IView, snaps: SnapeInfo[]) {
        let data = VertexRenderData.from(snap.point, 0xf00, 5);
        let pointId = view.viewer.document.visualization.context.temporaryDisplay(data);
        let axies = Axis.getAxiesAtPlane(snap.point, view.workplane, this.trackingZ);
        snaps.push({ shapeId: pointId, snap, axies });
    }
}
