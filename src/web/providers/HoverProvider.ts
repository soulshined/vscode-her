import * as vscode from 'vscode'
import { getEntityAtPosition } from '../utils';

export default class HoverProvider implements vscode.HoverProvider {

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const result: any = getEntityAtPosition(document, position);
        const contents: vscode.MarkdownString[] = [];

        if (result) {
            contents.push(
                new vscode.MarkdownString(`**HER**`),
                new vscode.MarkdownString(`Name: \\&${result.entity.name};`),
                new vscode.MarkdownString(`Hex: ${result.entity.hex.map((h : any) => `\\&#x${h};`).join('')}`),
                new vscode.MarkdownString(`Decimal: ${result.entity.decimals.map((h: any) => `\\&#${h};`)}`),
                new vscode.MarkdownString(`Unicode: ${result.entity.hex.map((h: any) => `\\u${h}`).join('')}`),
                new vscode.MarkdownString(`Glyph: ${result.entity.unicode}`),
            )
        }

        return {
            contents,
            range : new vscode.Range(position, position)
        };
    }

}