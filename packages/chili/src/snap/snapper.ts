// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { CancellationToken, CursorType, I18n, IDocument, IEventHandler, PubSub, XYZ } from "chili-core";
import {
    SnapLengthAtAxisData,
    SnapLengthAtAxisHandler,
    SnapLengthAtPlaneData,
    SnapLengthAtPlaneHandler,
} from "./snapLengthEventHandler";

import { SnapPointData, SnapPointEventHandler } from "./snapPointHandler";

export class Snapper {
    constructor(readonly document: IDocument) {}

    async snapPointAsync(tipKey: keyof I18n, data: SnapPointData): Promise<XYZ | undefined> {
        let cancellationToken = new CancellationToken();
        let eventHandler = new SnapPointEventHandler(cancellationToken, data);
        await this.handleSnapAsync(eventHandler, tipKey, cancellationToken);
        return eventHandler.snapedPoint;
    }

    async snapLengthAtAxisAsync(tipKey: keyof I18n, data: SnapLengthAtAxisData): Promise<number | undefined> {
        let cancellationToken = new CancellationToken();
        let eventHandler = new SnapLengthAtAxisHandler(cancellationToken, data);
        await this.handleSnapAsync(eventHandler, tipKey, cancellationToken);
        return eventHandler.snapedPoint?.sub(data.point).dot(data.direction);
    }

    async snapLengthAtPlaneAsync(tipKey: keyof I18n, data: SnapLengthAtPlaneData): Promise<number | undefined> {
        let cancellationToken = new CancellationToken();
        let eventHandler = new SnapLengthAtPlaneHandler(cancellationToken, data);
        await this.handleSnapAsync(eventHandler, tipKey, cancellationToken);
        if (eventHandler.snapedPoint === undefined) return undefined;
        let point = data.plane.project(eventHandler.snapedPoint);
        return point.distanceTo(data.point);
    }

    private async handleSnapAsync(
        eventHandler: IEventHandler,
        tipKey: keyof I18n,
        cancellationToken: CancellationToken,
        cursor: CursorType = CursorType.Drawing
    ) {
        let defaultEventHandler = this.document.visualization.eventHandler;
        this.document.viewer.setCursor(cursor);
        PubSub.default.pub("statusBarTip", tipKey);
        this.document.visualization.eventHandler = eventHandler;
        while (!cancellationToken.isCanceled) {
            await new Promise((r) => setTimeout(r, 30));
        }
        this.document.visualization.eventHandler = defaultEventHandler;
        this.document.viewer.setCursor(CursorType.Default);
        PubSub.default.pub("clearStatusBarTip");
    }
}
