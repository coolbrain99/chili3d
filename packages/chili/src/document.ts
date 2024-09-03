// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import {
    CollectionAction,
    CollectionChangedArgs,
    Constants,
    ConstraintList, //add by chenhong 20240902
    ConstraintListHistoryRecord, //add by chenhong 20240902
    ConstraintRecord, //add by chenhong 20240902
    ConstraintSerializer, //add by chenhong 20240902
    History,
    I18n,
    IApplication,
    IConstraint, //add by chenhong 20240902
    IConstraintChangedObserver, //add by chenhong 20240902
    IConstraintList, //add by chenhong 20240902
    IDocument,
    INode,
    INodeChangedObserver, //add by chenhong 20240902
    INodeLinkedList, //add by chenhong 20240902
    ISelection,
    IVisual,
    Id,
    Logger,
    Material,
    NodeLinkedList,
    NodeLinkedListHistoryRecord,
    NodeRecord,
    NodeSerializer,
    Observable,
    ObservableCollection,
    Serialized,
    Serializer,
    Transaction,
} from "chili-core";
import { Selection } from "./selection";

const FILE_VERSIOM = "0.3.1";

export class Document extends Observable implements IDocument {
    readonly visual: IVisual;
    readonly history: History;
    readonly selection: ISelection;
    readonly materials: ObservableCollection<Material> = new ObservableCollection();

    private _nodeChangedObservers = new Set<INodeChangedObserver>();
    private _constraintChangedObservers = new Set<IConstraintChangedObserver>(); //add by chenhong 20240902

    private _name: string;
    get name(): string {
        return this._name;
    }
    set name(name: string) {
        if (this.name === name) return;
        this.setProperty("name", name);
        if (this._rootNode) this._rootNode.name = name;
    }

    private _rootNode: INodeLinkedList | undefined;
    @Serializer.serialze()
    get rootNode(): INodeLinkedList {
        if (this._rootNode === undefined) {
            this.setRootNode(new NodeLinkedList(this, this._name));
        }
        return this._rootNode!;
    }

    private setRootNode(value?: INodeLinkedList) {
        if (this._rootNode === value) return;
        this._rootNode?.removePropertyChanged(this.handleRootNodeNameChanged);
        this._rootNode = value ?? new NodeLinkedList(this, this._name);
        this._rootNode.onPropertyChanged(this.handleRootNodeNameChanged);
    }

    private _currentNode?: INodeLinkedList;
    get currentNode(): INodeLinkedList | undefined {
        return this._currentNode;
    }
    set currentNode(value: INodeLinkedList | undefined) {
        this.setProperty("currentNode", value);
    }

    //add by chenhong 20240902:
    private _rootConstraint: IConstraintList | undefined;
    @Serializer.serialze()
    get rootConstraint(): IConstraintList {
        if (this._rootConstraint === undefined) {
            this.setRootConstraint(new ConstraintList(this, this._name));
        }
        return this._rootConstraint!;
    }

    private setRootConstraint(value?: IConstraintList) {
        if (this._rootConstraint === value) return;
        this._rootConstraint?.removePropertyChanged(this.handleRootConstraintNameChanged);
        this._rootConstraint = value ?? new ConstraintList(this, this._name);
        this._rootConstraint.onPropertyChanged(this.handleRootConstraintNameChanged);
    }

    private _currentConstraint?: IConstraintList;
    get currentConstraint(): IConstraintList | undefined {
        return this._currentConstraint;
    }
    set currentConstraint(value: IConstraintList | undefined) {
        this.setProperty("currentConstraint", value);
    }
    //add by chenhong 20240902:

    constructor(
        readonly application: IApplication,
        name: string,
        readonly id: string = Id.generate(),
    ) {
        super();
        this._name = name;
        this.history = new History();
        this.visual = application.visualFactory.create(this);
        this.selection = new Selection(this);
        this.materials.onCollectionChanged(this.handleMaterialChanged);
        application.documents.add(this);

        Logger.info(`new document: ${name}`);
    }

    private handleRootNodeNameChanged = (prop: string) => {
        if (prop === "name") {
            this.name = this.rootNode.name;
        }
    };

    //add by chenhong 20240902:
    private handleRootConstraintNameChanged = (prop: string) => {
        if (prop === "name") {
            this.name = this.rootNode.name;
        }
    };

    serialize(): Serialized {
        let serialized = {
            classKey: "Document",
            version: FILE_VERSIOM,
            properties: {
                id: this.id,
                name: this.name,
                nodes: NodeSerializer.serialize(this.rootNode),
                constraints: ConstraintSerializer.serialize(this.rootConstraint), //add by chenhong 20240902:
                materials: this.materials.map((x) => Serializer.serializeObject(x)),
            },
        };
        return serialized;
    }

    override dispose(): void {
        super.dispose();
        this.visual.dispose();
        this.history.dispose();
        this.selection.dispose();
        this.materials.forEach((x) => x.dispose());
        this.materials.clear();
        this._nodeChangedObservers.clear();
        this._constraintChangedObservers.clear(); //add by chenhong 20240902:
        this._rootNode?.removePropertyChanged(this.handleRootNodeNameChanged);
        this._rootNode?.dispose();
        this._rootNode = undefined;
        this._rootConstraint?.removePropertyChanged(this.handleRootConstraintNameChanged); //add by chenhong 20240902:
        this._rootConstraint?.dispose(); //add by chenhong 20240902:
        this._rootConstraint = undefined; //add by chenhong 20240902:
        this._currentNode = undefined;
        this._currentConstraint = undefined;
    }

    async save() {
        let data = this.serialize();
        await this.application.storage.put(Constants.DBName, Constants.DocumentTable, this.id, data);
        let image = this.application.activeView?.toImage();
        await this.application.storage.put(Constants.DBName, Constants.RecentTable, this.id, {
            id: this.id,
            name: this.name,
            date: Date.now(),
            image,
        });
    }

    async close() {
        if (window.confirm(I18n.translate("prompt.saveDocument{0}", this.name))) {
            await this.save();
        }

        let views = this.application.views.filter((x) => x.document === this);
        this.application.views.remove(...views);
        this.application.activeView = this.application.views.at(0);
        this.application.documents.delete(this);
        this.materials.removeCollectionChanged(this.handleMaterialChanged);
        Logger.info(`document: ${this._name} closed`);
        this.dispose();
    }

    static async open(application: IApplication, id: string) {
        let data = (await application.storage.get(
            Constants.DBName,
            Constants.DocumentTable,
            id,
        )) as Serialized;
        if (data === undefined) {
            Logger.warn(`document: ${id} not find`);
            return;
        }
        let document = this.load(application, data);
        if (document !== undefined) {
            Logger.info(`document: ${document.name} opened`);
        }
        return document;
    }

    static load(app: IApplication, data: Serialized): IDocument | undefined {
        if ((data as any).version !== FILE_VERSIOM) {
            alert(
                "The file version has been upgraded, no compatibility treatment was done in the development phase",
            );
            return undefined;
        }
        let document = new Document(app, data.properties["name"], data.properties["id"]);
        document.history.disabled = true;
        document.materials.push(
            ...data.properties["materials"].map((x: Serialized) =>
                Serializer.deserializeObject(document, x),
            ),
        );
        document.setRootNode(NodeSerializer.deserialize(document, data.properties["nodes"]));
        document.history.disabled = false;
        return document;
    }

    private handleMaterialChanged = (args: CollectionChangedArgs) => {
        if (args.action === CollectionAction.add) {
            Transaction.add(this, this.history, {
                name: "MaterialChanged",
                dispose() {},
                undo: () => this.materials.remove(...args.items),
                redo: () => this.materials.push(...args.items),
            });
        } else if (args.action === CollectionAction.remove) {
            Transaction.add(this, this.history, {
                name: "MaterialChanged",
                dispose() {},
                undo: () => this.materials.push(...args.items),
                redo: () => this.materials.remove(...args.items),
            });
        }
    };

    addNodeObserver(observer: INodeChangedObserver) {
        this._nodeChangedObservers.add(observer);
    }

    removeNodeObserver(observer: INodeChangedObserver) {
        this._nodeChangedObservers.delete(observer);
    }

    notifyNodeChanged(records: NodeRecord[]) {
        Transaction.add(this, this.history, new NodeLinkedListHistoryRecord(records));
        this._nodeChangedObservers.forEach((x) => x.handleNodeChanged(records));
    }

    addNode(...nodes: INode[]): void {
        (this.currentNode ?? this.rootNode).add(...nodes);
    }

    //add by chenhong 20240902:
    addConstraint(...nodes: IConstraint[]): void {
        //add by chenhong 20240902:add constraint
        (this.currentConstraint ?? this.rootConstraint).add(...nodes);
    }

    //add by chenhong 20240902:
    addConstraintObserver(observer: IConstraintChangedObserver): void {
        //add by chenhong 20240902:add constraint
        this._constraintChangedObservers.add(observer);
    }

    //add by chenhong 20240902:
    removeConstraintObserver(observer: IConstraintChangedObserver): void {
        //add by chenhong 20240902:add constraint
        this._constraintChangedObservers.delete(observer);
    }

    //add by chenhong 20240902:
    notifyConstraintChanged(records: ConstraintRecord[]): void {
        //add by chenhong 20240902:add constraint
        Transaction.add(this, this.history, new ConstraintListHistoryRecord(records));
        this._constraintChangedObservers.forEach((x) => x.handleConstraintChanged(records));
    }
}
