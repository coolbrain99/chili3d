// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import {
    EdgeMeshData,
    FaceMeshData,
    GeometryEntity,
    IVisualGeometry,
    Matrix4,
    VisualConfig,
} from "chili-core";
import {
    BufferGeometry,
    DoubleSide,
    Float32BufferAttribute,
    Material,
    Mesh,
    MeshLambertMaterial,
    Object3D,
} from "three";

import { MeshUtils } from "chili-geo";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import { ThreeHelper } from "./threeHelper";
import { ThreeVisualContext } from "./threeVisualContext";

export class ThreeGeometry extends Object3D implements IVisualGeometry {
    private _faceMaterial: Material;
    private _edgeMaterial = new LineMaterial({
        linewidth: 1,
        color: VisualConfig.defaultEdgeColor,
        side: DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
    });
    private _edges?: LineSegments2;
    private _faces?: Mesh;

    getMainMaterial() {
        if (this._faces) return this._faceMaterial;
        return this._edgeMaterial;
    }

    changeFaceMaterial(material: Material) {
        if (this._faces) {
            this._faceMaterial = material;
            this._faces.material = material;
        }
    }

    get transform() {
        return ThreeHelper.toMatrix(this.matrix);
    }

    set transform(value: Matrix4) {
        this.matrix.fromArray(value.toArray());
    }

    constructor(
        readonly geometryEngity: GeometryEntity,
        readonly context: ThreeVisualContext,
    ) {
        super();
        this.transform = geometryEngity.matrix;
        this._faceMaterial = context.getMaterial(geometryEngity.materialId);
        this.matrixAutoUpdate = false;
        this.generateShape();
        geometryEngity.onPropertyChanged(this.handleGeometryPropertyChanged);
    }

    box() {
        return this._faces?.geometry.boundingBox ?? this._edges?.geometry.boundingBox ?? undefined;
    }

    boundingBox() {
        let box = this._faces?.geometry.boundingBox ?? this._edges?.geometry.boundingBox;
        let min = ThreeHelper.toXYZ(box!.min);
        let max = ThreeHelper.toXYZ(box!.max);
        return {
            min,
            max,
        };
    }

    private handleGeometryPropertyChanged = (property: keyof GeometryEntity) => {
        if (property === "matrix") {
            this.transform = this.geometryEngity.matrix;
        } else if (property === "materialId") {
            let material = this.context.getMaterial(this.geometryEngity.materialId);
            this.changeFaceMaterial(material);
        } else if (property === "shape") {
            this.removeSubShapes();
            this.generateShape();
        }
    };

    private generateShape() {
        let mesh = this.geometryEngity.shape.value?.mesh;
        if (mesh?.faces?.positions.length) this.initFaces(mesh.faces);
        if (mesh?.edges?.positions.length) this.initEdges(mesh.edges);
    }

    dispose() {
        this.removeSubShapes();
        this.geometryEngity.removePropertyChanged(this.handleGeometryPropertyChanged);
        this._edgeMaterial.dispose();
    }

    private removeSubShapes() {
        if (this._edges) {
            this.remove(this._edges);
            this._edges.geometry.dispose();
            this._edges = undefined;
        }
        if (this._faces) {
            this.remove(this._faces);
            this._faces.geometry.dispose();
            this._faces = undefined;
        }
    }

    private initEdges(data: EdgeMeshData) {
        let buff = new LineSegmentsGeometry();
        buff.setPositions(data.positions);
        buff.computeBoundingBox();

        this._edges = new LineSegments2(buff, this._edgeMaterial);
        this.add(this._edges);
    }

    private initFaces(data: FaceMeshData) {
        let buff = new BufferGeometry();
        buff.setAttribute("position", new Float32BufferAttribute(data.positions, 3));
        buff.setAttribute("normal", new Float32BufferAttribute(data.normals, 3));
        buff.setAttribute("uv", new Float32BufferAttribute(data.uvs, 2));
        buff.setIndex(data.indices);
        buff.computeBoundingBox();

        this._faces = new Mesh(buff, this._faceMaterial);
        this.add(this._faces);
    }

    setFacesMateiralTemperary(material: MeshLambertMaterial) {
        if (this._faces) {
            this._faces.material = material;
        }
    }

    setEdgesMateiralTemperary(material: LineMaterial) {
        if (this._edges) {
            this._edges.material = material;
        }
    }

    removeTemperaryMaterial(): void {
        if (this._edges) this._edges.material = this._edgeMaterial;
        if (this._faces) this._faces.material = this._faceMaterial;
    }

    cloneSubEdge(index: number) {
        let positions = MeshUtils.subEdge(this.geometryEngity.shape.value!.mesh.edges!, index);
        if (!positions) return undefined;

        let buff = new LineSegmentsGeometry();
        buff.setPositions(positions);
        buff.applyMatrix4(this.matrixWorld);

        return new LineSegments2(buff, this._edgeMaterial);
    }

    cloneSubFace(index: number) {
        let mesh = MeshUtils.subFace(this.geometryEngity.shape.value!.mesh.faces!, index);
        if (!mesh) return undefined;

        let buff = new BufferGeometry();
        buff.setAttribute("position", new Float32BufferAttribute(mesh.positions, 3));
        buff.setAttribute("normal", new Float32BufferAttribute(mesh.normals, 3));
        buff.setIndex(mesh.indices);
        buff.applyMatrix4(this.matrixWorld);

        return new Mesh(buff, this._faceMaterial);
    }

    faces() {
        return this._faces;
    }

    edges() {
        return this._edges;
    }
}
