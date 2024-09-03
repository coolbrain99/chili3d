// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import {
    ConstraintRecord,
    History,
    IApplication,
    IConstraint, //add by chenhong 20240902:
    IConstraintChangedObserver, //add by chenhong 20240902:
    IConstraintList, //add by chenhong 20240902:
    IDocument,
    INode,
    INodeChangedObserver,
    INodeLinkedList,
    ISelection,
    ISerialize,
    IView,
    Material,
    NodeRecord,
    ObservableCollection,
    PropertyChangedHandler,
    Serialized,
} from "chili-core";
import { ThreeVisual } from "../src/threeVisual";

export class TestDocument implements IDocument, ISerialize {
    application: IApplication;
    name: string;
    currentNode: INodeLinkedList | undefined;
    currentConstraint: IConstraintList | undefined; //add by chenhong 20240902:
    id: string;
    history: History;
    selection: ISelection;
    visual: ThreeVisual;
    rootNode: INodeLinkedList;
    rootConstraint: IConstraintList; //add by chenhong 20240902
    activeView: IView | undefined;
    materials: ObservableCollection<Material> = new ObservableCollection<Material>();
    onPropertyChanged<K extends keyof this>(handler: PropertyChangedHandler<this, K>): void {
        throw new Error("Method not implemented.");
    }
    removePropertyChanged<K extends keyof this>(handler: PropertyChangedHandler<this, K>): void {
        throw new Error("Method not implemented.");
    }
    dispose() {
        throw new Error("Method not implemented.");
    }

    close(): Promise<void> {
        return Promise.resolve();
    }

    serialize(): Serialized {
        return {
            classKey: "TestDocument",
            properties: {},
        };
    }

    constructor() {
        this.name = "test";
        this.id = "test";
        this.visual = new ThreeVisual(this);
        this.history = {} as any;
        this.selection = {} as any;
        this.rootNode = {} as any;
        this.rootConstraint = {} as any; //add by chenhong 20240902:
        this.application = { views: [] } as any;
    }
    clearPropertyChanged(): void {
        throw new Error("Method not implemented.");
    }
    addNodeObserver(observer: INodeChangedObserver): void {}
    removeNodeObserver(observer: INodeChangedObserver): void {
        throw new Error("Method not implemented.");
    }
    notifyNodeChanged(records: NodeRecord[]): void {
        throw new Error("Method not implemented.");
    }
    addNode(...nodes: INode[]): void {
        throw new Error("Method not implemented.");
    }
    save(): Promise<void> {
        return Promise.resolve();
    }

    //add by chenhong 20240902:
    addConstraintObserver(observer: IConstraintChangedObserver): void {}
    //add by chenhong 20240902:
    removeConstraintObserver(observer: IConstraintChangedObserver): void {
        throw new Error("Method not implemented.");
    }
    //add by chenhong 20240902:
    notifyConstraintChanged(records: ConstraintRecord[]): void {
        throw new Error("Method not implemented.");
    }
    //add by chenhong 20240902:
    addConstraint(...nodes: IConstraint[]): void {
        throw new Error("Method not implemented.");
    }
}
