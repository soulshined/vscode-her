import { window, TextEditorDecorationType, DecorationOptions, Range, workspace } from 'vscode';
import { findAllEntitiesInRange } from '../utils';

const DEFAULT_DECORATION: TextEditorDecorationType = window.createTextEditorDecorationType({
    color: workspace.getConfiguration('her.decorations').get('foregroundColor', 'lightsalmon'),
    opacity: '.9',
    fontWeight: 'bold',
    fontStyle: 'unset',
    cursor: 'help',
    backgroundColor: workspace.getConfiguration('her.decorations').get('backgroundColor', '#ffa07a26')
});

export function refreshDecorations(range: Range | undefined = undefined): any {
    const editor = window.activeTextEditor;
    if (!editor) return;

    const decs: DecorationOptions[] = [];

    const entities = findAllEntitiesInRange(editor.document, range)
    entities.forEach(sr => {
        sr.ranges.forEach(r => decs.push({ range: r }));
    })

    editor.setDecorations(DEFAULT_DECORATION, decs);
}