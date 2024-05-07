import * as vscode from 'vscode';
import { EntityType, RANGE_ZERO, findAllEntitiesInRange } from '../utils';

export class CodeLensProvider implements vscode.CodeLensProvider {
    onDidChangeCodeLenses?: vscode.Event<void> | undefined;

    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
        const result: vscode.CodeLens[] = [];

        if (vscode.workspace.getConfiguration('her.codelens').get('enabled', true).valueOf() === false) return result;

        if (findAllEntitiesInRange(document).length === 0) return result;

        EntityType.values().forEach(e => result.push({
            isResolved: true,
            range: RANGE_ZERO,
            command: {
                title: `[HER] ⟶ ${e}`,
                tooltip: `Convert all HTML entities to ${e}`,
                command: 'html-entity-reference.convert',
                arguments : [e.toLowerCase()]
            }
        }))

        return result;
    }

    resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
        return codeLens;
    }

}