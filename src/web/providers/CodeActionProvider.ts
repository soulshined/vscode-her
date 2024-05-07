import * as vscode from 'vscode';
import { EntityType, FindResult, formatEntityOutput, getEntityAtPosition } from '../utils';

export class CodeActionProvider implements vscode.CodeActionProvider {

    provideCodeActions(document: vscode.TextDocument, range: vscode.Selection | vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        if (!range.isSingleLine) return [];

        const result: FindResult | undefined = getEntityAtPosition(document, range.start);
        if (!result) return [];

        const actions = [this.createFix(document, result.ranges[0], 'Glyph', formatEntityOutput(result.entity, EntityType.GLYPH))];

        const nameFix = this.createFix(document, result.ranges[0], 'Name', formatEntityOutput(result.entity, EntityType.NAME), true);
        const hexFix = this.createFix(document, result.ranges[0], 'Hex', formatEntityOutput(result.entity, EntityType.HEX), true);
        const decFix = this.createFix(document, result.ranges[0], 'Decimal', formatEntityOutput(result.entity, EntityType.DECIMALS), true);
        const unicodeFix = this.createFix(document, result.ranges[0], 'Unicode', formatEntityOutput(result.entity, EntityType.UNICODE));

        if (!result.identifier.startsWith('&')) {
            actions.push(hexFix, nameFix, decFix)
        }

        if (result.identifier.startsWith('&#x')) {
            actions.push(nameFix, decFix)
        }
        else if (result.identifier.startsWith('&#')) {
            actions.push(hexFix, nameFix)
        }
        else if (result.identifier.startsWith('&')) {
            actions.push(hexFix, decFix)
        }

        if (!result.identifier.startsWith('\\u')) {
            actions.push(unicodeFix)
        }

        return actions;
    }

    resolveCodeAction?(codeAction: vscode.CodeAction, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeAction> {
        return codeAction;
    }

    private createFix(document: vscode.TextDocument, range: vscode.Range, title: string, value: any, isPreferred: boolean = false): vscode.CodeAction {
        const fix = new vscode.CodeAction(`Convert to ${title}`, vscode.CodeActionKind.QuickFix);
        fix.kind = vscode.CodeActionKind.RefactorInline;
        fix.isPreferred = isPreferred,
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(document.uri, range, value);
        return fix;
    }

}