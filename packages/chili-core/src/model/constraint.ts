// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { IDocument } from "../document";
import { HistoryObservable, IDisposable, IPropertyChanged, Id } from "../foundation";
import { Property } from "../property";
import { Serialized, Serializer } from "../serialize";

export interface IConstraint extends IPropertyChanged, IDisposable {
    readonly id: string;
    visible: boolean;
    parentVisible: boolean;
    name: string;
    parent: IConstraintList | undefined;
    previousSibling: IConstraint | undefined;
    nextSibling: IConstraint | undefined;
    clone(): this;
}

export interface IConstraintList extends IConstraint {
    get firstChild(): IConstraint | undefined;
    get lastChild(): IConstraint | undefined;
    add(...items: IConstraint[]): void;
    remove(...items: IConstraint[]): void;
    size(): number;
    insertAfter(target: IConstraint | undefined, node: IConstraint): void;
    insertBefore(target: IConstraint | undefined, node: IConstraint): void;
    move(child: IConstraint, newParent: this, newPreviousSibling?: IConstraint): void;
}

// export interface IModel extends INode {
//     readonly document: IDocument;
//     readonly geometry: GeometryEntity;
// }

// export interface IModelGroup extends IModel {
//     children: ReadonlyArray<IModel>;
// }

export namespace IConstraint {
    export function isConstraintList(node: IConstraint): node is IConstraintList {
        return (node as IConstraintList).add !== undefined;
    }

    // export function isModelNode(node: IConstraint): node is IConstraint {
    //     return (node as IConstraint).geometry !== undefined;
    // }

    // export function isModelGroup(node: IConstraint): node is IModelGroup {
    //     let group = node as IModelGroup;
    //     return group.geometry !== undefined && group.children !== undefined;
    // }
}

export abstract class Constraint extends HistoryObservable implements IConstraint {
    private _visible: boolean = true;
    private _parentVisible: boolean = true;

    parent: IConstraintList | undefined;
    previousSibling: IConstraint | undefined;
    nextSibling: IConstraint | undefined;

    @Serializer.serialze()
    readonly id: string;

    constructor(
        document: IDocument,
        private _name: string,
        id: string = Id.generate(),
    ) {
        super(document);
        this.id = id;
    }

    @Serializer.serialze()
    @Property.define("common.name")
    get name() {
        return this._name;
    }

    set name(value: string) {
        this.setProperty("name", value);
    }

    @Serializer.serialze()
    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this.setProperty("visible", value, () => this.onVisibleChanged());
    }

    protected abstract onVisibleChanged(): void;

    get parentVisible() {
        return this._parentVisible;
    }

    set parentVisible(value: boolean) {
        this.setProperty("parentVisible", value, () => this.onParentVisibleChanged());
    }

    clone(): this {
        let serialized = Serializer.serializeObject(this);
        serialized.properties["id"] = Id.generate();
        serialized.properties["name"] = `${this._name}_copy`;
        let cloned: this = Serializer.deserializeObject(this.document, serialized);
        this.parent?.add(cloned);
        return cloned;
    }

    protected abstract onParentVisibleChanged(): void;
}

export namespace IConstraint {
    export function getNodesBetween(node1: IConstraint, node2: IConstraint): IConstraint[] {
        if (node1 === node2) return [node1];
        let nodes: IConstraint[] = [];
        let prePath = getPathToRoot(node1);
        let curPath = getPathToRoot(node2);
        let index = getCommonParentIndex(prePath, curPath);
        let parent = prePath.at(1 - index) as IConstraintList;
        if (parent === curPath[0] || parent === prePath[0]) {
            let child = parent === curPath[0] ? prePath[0] : curPath[0];
            getNodesFromParentToChild(nodes, parent, child);
        } else if (currentAtBack(prePath.at(-index)!, curPath.at(-index)!)) {
            getNodesFromPath(nodes, prePath, curPath, index);
        } else {
            getNodesFromPath(nodes, curPath, prePath, index);
        }
        return nodes;
    }

    function getNodesFromPath(
        nodes: IConstraint[],
        path1: IConstraint[],
        path2: IConstraint[],
        commonIndex: number,
    ) {
        nodeOrChildrenAppendToNodes(nodes, path1[0]);
        path1ToCommonNodes(nodes, path1, commonIndex);
        commonToPath2Nodes(nodes, path1, path2, commonIndex);
    }

    function path1ToCommonNodes(nodes: IConstraint[], path1: IConstraint[], commonIndex: number) {
        for (let i = 0; i < path1.length - commonIndex; i++) {
            let next = path1[i].nextSibling;
            while (next !== undefined) {
                IConstraint.nodeOrChildrenAppendToNodes(nodes, next);
                next = next.nextSibling;
            }
        }
    }

    function commonToPath2Nodes(
        nodes: IConstraint[],
        path1: IConstraint[],
        path2: IConstraint[],
        commonIndex: number,
    ) {
        let nextParent = path1.at(-commonIndex)?.nextSibling;
        while (nextParent) {
            if (nextParent === path2[0]) {
                nodes.push(path2[0]);
                return;
            }
            if (IConstraint.isConstraintList(nextParent)) {
                if (getNodesFromParentToChild(nodes, nextParent, path2[0])) {
                    return;
                }
            } else {
                nodes.push(nextParent);
            }
            nextParent = nextParent.nextSibling;
        }
    }

    export function nodeOrChildrenAppendToNodes(nodes: IConstraint[], node: IConstraint) {
        if (IConstraint.isConstraintList(node)) {
            getNodesFromParentToChild(nodes, node);
        } else {
            nodes.push(node);
        }
    }

    export function findTopLevelNodes(nodes: Set<IConstraint>) {
        let result: IConstraint[] = [];
        for (const node of nodes) {
            if (!containsDescendant(nodes, node)) {
                result.push(node);
            }
        }
        return result;
    }

    export function containsDescendant(nodes: Set<IConstraint>, node: IConstraint): boolean {
        if (node.parent === undefined) return false;
        if (nodes.has(node.parent)) return true;
        return containsDescendant(nodes, node.parent);
    }

    function getNodesFromParentToChild(
        nodes: IConstraint[],
        parent: IConstraintList,
        until?: IConstraint,
    ): boolean {
        nodes.push(parent);
        let node = parent.firstChild;
        while (node !== undefined) {
            if (until === node) {
                nodes.push(node);
                return true;
            }

            if (IConstraint.isConstraintList(node)) {
                if (getNodesFromParentToChild(nodes, node, until)) return true;
            } else {
                nodes.push(node);
            }
            node = node.nextSibling;
        }
        return false;
    }

    function currentAtBack(preNode: IConstraint, curNode: IConstraint) {
        while (preNode.nextSibling !== undefined) {
            if (preNode.nextSibling === curNode) return true;
            preNode = preNode.nextSibling;
        }
        return false;
    }

    function getCommonParentIndex(prePath: IConstraint[], curPath: IConstraint[]) {
        let index = 1;
        for (index; index <= Math.min(prePath.length, curPath.length); index++) {
            if (prePath.at(-index) !== curPath.at(-index)) break;
        }
        if (prePath.at(1 - index) !== curPath.at(1 - index)) throw new Error("can not find a common parent");
        return index;
    }

    function getPathToRoot(node: IConstraint): IConstraint[] {
        let path: IConstraint[] = [];
        let parent: IConstraint | undefined = node;
        while (parent !== undefined) {
            path.push(parent);
            parent = parent.parent;
        }
        return path;
    }
}

export namespace ConstraintSerializer {
    export function serialize(node: IConstraint) {
        let nodes: Serialized[] = [];
        serializeNodeToArray(nodes, node, undefined);
        return nodes;
    }

    function serializeNodeToArray(nodes: Serialized[], node: IConstraint, parentId: string | undefined) {
        let serialized: any = Serializer.serializeObject(node);
        if (parentId) serialized["parentId"] = parentId;
        nodes.push(serialized);

        if (IConstraint.isConstraintList(node) && node.firstChild) {
            serializeNodeToArray(nodes, node.firstChild, node.id);
        }
        if (node.nextSibling) {
            serializeNodeToArray(nodes, node.nextSibling, parentId);
        }
        return nodes;
    }

    export function deserialize(document: IDocument, nodes: Serialized[]) {
        let nodeMap: Map<string, IConstraintList> = new Map();
        nodes.forEach((n) => {
            let node = Serializer.deserializeObject(document, n);
            if (IConstraint.isConstraintList(node)) {
                nodeMap.set(n.properties["id"], node);
            }
            let parentId = (n as any)["parentId"];
            if (!parentId) return;
            if (nodeMap.has(parentId)) {
                nodeMap.get(parentId)!.add(node);
            } else {
                console.warn("parent not found: " + parentId);
            }
        });
        return nodeMap.get(nodes[0].properties["id"]);
    }
}
