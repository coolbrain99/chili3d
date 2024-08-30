// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

const COMMAND_KEYS = [
    "boolean.common",
    "boolean.cut",
    "boolean.fuse",
    "convert.fuse",
    "convert.prism",
    "convert.revol",
    "convert.sweep",
    "convert.toFace",
    "convert.toWire",
    "create.arc",
    "create.bezier",
    "create.box",
    "create.circle",
    "create.folder",
    "create.group",
    "create.line",
    "create.offset",
    "create.polygon",
    "create.rect",
    "create.section",
    "create.thickSolid",
    "doc.new",
    "doc.open",
    "doc.save",
    "doc.saveToFile",
    "edit.redo",
    "edit.undo",
    "file.export.iges",
    "file.export.stp",
    "file.import",
    "modify.array",
    "modify.break",
    "modify.delete",
    "modify.mirror",
    "modify.move",
    "modify.rotate",
    "modify.split",
    "modify.trim",
    "constraint.horizontal", //add by chenhong 20240830:二维约束 水平
    "constraint.vertical", //add by chenhong 20240830:二维约束 垂直
    "constraint.equal", //add by chenhong 20240830:二维约束 相等
    "constraint.collinear", //add by chenhong 20240830:二维约束 共线
    "constraint.tangent", //add by chenhong 20240830:二维约束 切线
    "constraint.parallel", //add by chenhong 20240830:三维约束 平行
    "constraint.perpendicular", //add by chenhong 20240830:三维约束 垂直
    "constraint.coaxial", //add by chenhong 20240830:三维约束 同轴
    "constraint.concentric", //add by chenhong 20240830:三维约束 同心
    "constraint.normal", //add by chenhong 20240830:三维约束 法线
    "special.last",
    "workingPlane.alignToPlane",
    "workingPlane.set",
    "test.performace",
] as const;

export type CommandKeys = (typeof COMMAND_KEYS)[number];
