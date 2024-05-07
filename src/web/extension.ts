import * as vscode from 'vscode';
import { ENTITIES } from './entities';
import HoverProvider from './providers/HoverProvider';
import { HerWebView } from './providers/WebViewProvider';
import { refreshDecorations } from './providers/DecorationsProvider';
import { CodeActionProvider } from './providers/CodeActionProvider';
import { CodeLensProvider } from './providers/CodeLensProvider';
import { EntityType, formatEntityOutput, findAllEntitiesInRange } from './utils';

const INSERT_QUICK_PICK_ITEMS: vscode.QuickPickItem[] = [];

for (const v of ENTITIES)
    INSERT_QUICK_PICK_ITEMS.push({ detail: v.unicode, label: `&${v.name};`, })

export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "her" is now active in the web extension host!');

    context.subscriptions.push(
        vscode.commands.registerTextEditorCommand('html-entity-reference.insert_entity', (textEditor: vscode.TextEditor) => {
            vscode.window.showQuickPick(INSERT_QUICK_PICK_ITEMS, {
                canPickMany: true,
                matchOnDescription: true
            }).then((selections: vscode.QuickPickItem[] | undefined) => {
                if (!selections) return;

                textEditor.edit(editorBulider => editorBulider.insert(textEditor.selection.active, selections.map(s => s.label).join("")))
            })
        }),
        vscode.commands.registerTextEditorCommand('html-entity-reference.insert_glyph', (textEditor: vscode.TextEditor) => {
            vscode.window.showQuickPick(INSERT_QUICK_PICK_ITEMS, {
                canPickMany: true,
            }).then((selections: vscode.QuickPickItem[] | undefined) => {
                if (selections === undefined) return

                textEditor.edit(editorBulider => editorBulider.insert(textEditor.selection.active, selections.map(s => s.detail).join("")))
            })
        }),
        vscode.commands.registerTextEditorCommand('html-entity-reference.convert_prompt', () => {
            const qpitems: vscode.QuickPickItem[] = [];
            EntityType.values().forEach(i => qpitems.push({ label: i }))
            vscode.window.showQuickPick(qpitems).then((selection: vscode.QuickPickItem | undefined) => {
                if (selection === undefined) return;
                vscode.commands.executeCommand('html-entity-reference.convert', selection.label);
            })
        }),
        vscode.commands.registerTextEditorCommand('html-entity-reference.convert', (textEditor: vscode.TextEditor, editBuilder: vscode.TextEditorEdit, ...args) => {
            const type = EntityType.fromType(args[0]);
            if (type === undefined) return;

            const isNoSelection = textEditor.selection.start.isEqual(textEditor.selection.end);
            const matches = findAllEntitiesInRange(textEditor.document, isNoSelection  ? undefined : textEditor.selection);

            for (const m of matches) {
                for (const r of m.ranges) {
                    editBuilder.replace(r, formatEntityOutput(m.entity, type));
                }
            }
        }),
        vscode.window.registerWebviewViewProvider('html-entity-reference.webview', new HerWebView(context.extensionUri)),
        vscode.languages.registerCodeLensProvider('*', new CodeLensProvider),
        vscode.languages.registerHoverProvider('*', new HoverProvider),
        vscode.languages.registerCodeActionsProvider('*', new CodeActionProvider)
    );

    vscode.window.onDidChangeActiveTextEditor(editor => {
        refreshDecorations();
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        refreshDecorations();
    }, null, context.subscriptions);

    setTimeout(() => {
        refreshDecorations()
    }, 500);
}

export function deactivate() { }