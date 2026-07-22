/** 绘制对象批量导入模板（前端点击「下载模板」时动态生成，不依赖后端静态文件） */
export const DRAW_OBJECT_IMPORT_TEMPLATE_FILENAME = '绘制对象导入模板.xls';

export const DRAW_OBJECT_IMPORT_SHEET_NAME = '绘制对象';

/** 与绘制对象表格列一致，顺序固定 */
export const DRAW_OBJECT_IMPORT_COLUMNS = [
  { field: 'class_key', header: 'ClassID', required: true, example: 'person' },
  { field: 'label', header: '描述文本', required: false, example: '行人' },
  { field: 'color', header: '颜色', required: false, example: '#ff0000' },
  { field: 'enabled', header: '是否绘制', required: false, example: '是' },
] as const;

export const DRAW_OBJECT_IMPORT_HEADERS = DRAW_OBJECT_IMPORT_COLUMNS.map(col => col.header);

export const DRAW_OBJECT_IMPORT_EXAMPLE_ROW = DRAW_OBJECT_IMPORT_COLUMNS.map(col => col.example);

export const DRAW_OBJECT_IMPORT_TEMPLATE_HINT =
  '请使用模板列：ClassID、描述文本、颜色、是否绘制（是否绘制填「是」或「否」）';
